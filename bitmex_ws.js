const mongoose = require('mongoose');
const BitMEXClient = require('./BitMEX_client.js');
const { Heartbeat } = require('./heartbeat.js');
const Trade = require('./models/Trade.js');
require('dotenv').config();
mongoose.set('strictQuery', false);

//
// TODO: 
//  1. Implement logging.           
//  2. Websocket Heartbeat check.   DONE
//  3. Error handling.              DONE
// 

// Environment
const testnet = (process.env.TESTNET === 'true');
const symbol = process.env.SYMBOL;
const mongoHost = (process.env.DEV == 'true' ? process.env.DEV_MONGO_HOST : process.env.MONGO_HOST );
const db_uri = `mongodb://${process.env.DB_USER}:${process.env.DB_USER_PWD}@${mongoHost}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=admin&w=1`;

//
// Connects to BitMEX websocket and subscribes to a stream.
// See 'options' reference in README
//
function connectToBitMEX(stream='trade', maxLen=1000) {
  const client = new BitMEXClient({
    testnet: testnet,
    //apiKeyID: process.env.KEY,
    //apiKeySecret: process.env.SECRET,
    maxTableLen: maxLen,
  });

  // Wrap BitMEXClient in Heartbeat class.
  //
  // The Heartbeat class extends event emitter and injects as 
  //   depdendency an instance of BitMEXClient 
  const heartbeat = new Heartbeat(client);
  const heartbeatClient = heartbeat.client;

  heartbeatClient.on('error', function() {
    console.log('Error received, closing connection.');
    this.socket.instance.close();
  });
  heartbeatClient.on('end', () => console.log('Connection ended.'));
  heartbeatClient.on('open', () => console.log('Connection opened.'));
  heartbeatClient.on('close', (code) => console.log('Connection closed.'));
  heartbeatClient.on('reconnect', () => console.log('Reconnecting ....'));
  heartbeatClient.on('initialize', () => console.log('Client initialized, data is flowing.'));

  // Save trades to mongo
  saveTradeStream(client, stream);
}

function saveTradeStream(client, stream) {
  let oldData = [];
  client.addStream(symbol, stream, (...args) => { 
    const streamData = args[0]

    const newData = streamData.filter((trade) => {
      return !oldData.some((oldTrade) => oldTrade.trdMatchID === trade.trdMatchID);
    });

    newData.forEach((trade) => {
      const newTrade = new Trade(trade);
      saveToDB("Trade", 'trdMatchID', newTrade);
    });

    //console.log('Stream data: ', streamData);
    console.log('New data length: ', newData.length);

    oldData = args[0]
  });
}

// 
// Saves data into the configured MONGODB database
//
//   The function takes the following arguments
//      
//      Parameter    Type
//      -----------  ---------
//       modelName    <string>
//       modelID      <string>
//       instance     <modelName>
// 
//  It will check database for matching modelID 
//    if none are found the data is saved, 
//    if there is a match it is skipped.
// 
function saveToDB(modelName, modelID, instance) {
  // Create query in advance
  //   it will not work to put 
  //   {modelID: instance[modelID]} inside find method.
  const query = {};
  query[modelID] = instance[modelID];

  setTimeout( () => {
    mongoose.model(modelName)
      .find(query, (err, matches) => {
        if (err) {
          console.log(`Object ID ${instance[modelID]} An error has ocurred:`);
          console.log(err);
        } else {
          if (matches.length === 0) {
            instance.save()
              .then((instance) => console.log(`Object with ID: ${instance[modelID]} saved to DB.`))
              .catch(console.log);
          } else {
            console.log(err);
            console.log(`Object with ID ${instance[modelID]} already exists. Skipping ... `);
          }
        }
      }).allowDiskUse();
  }, 1 + Math.random());
}

// 
// Connects to database and then runs connectToBitMEX 
//   function to start saving data from websocket,
//   the connection will drop unexpectedly heartbeat was implemented.
// 
// You can run this in parallel to bitmex_ws.js
// This will save new incomming data using websocket and 
//   past data from REST API
// 
mongoose.connect(db_uri)
  .then(() => { 
    connectToBitMEX()
  })
  .catch((err) => {
    console.log(err);
  });
