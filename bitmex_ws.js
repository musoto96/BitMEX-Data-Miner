const mongoose = require('mongoose');
const BitMEXClient = require('./BitMEX_client.js');
const { Heartbeat } = require('./heartbeat.js');
const Trade = require('./models/Trade.js');
const { logger } = require('./logger.js');
require('dotenv').config();
mongoose.set('strictQuery', false);

//
// TODO: 
//  1. Implement logging.           DONE
//  2. Websocket Heartbeat check.   DONE
//  3. Error handling.              DONE
// 

// Environment
const testnet = (process.env.TESTNET === 'true');
const key = process.env.KEY;
const secret = process.env.SECRET;
const symbol = process.env.SYMBOL;
const usedb = (process.env.USEDB === 'true')
const mongoHost = (process.env.DEV == 'true' ? process.env.DEV_MONGO_HOST : process.env.MONGO_HOST );
const db_uri = `mongodb://${process.env.DB_USER}:${process.env.DB_USER_PWD}@${mongoHost}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=admin&w=1`;

//
// Connects to BitMEX websocket and starts a heartbeat with websocket.
//  See README for options.
//
function connectToBitMEX(stream='trade', maxLen=1000) {
  const params = {
    testnet: testnet,
    maxTableLen: maxLen,
  };
  // Inject credentials if we have any
  if (key && secret) params = { apiKeyID: key, apiKeySecret: secret, ...params };

  const client = new BitMEXClient(params);

  // Wrap BitMEXClient in Heartbeat class.
  //
  // The Heartbeat class extends event emitter and injects as 
  //   depdendency an instance of BitMEXClient 
  const heartbeat = new Heartbeat(client);
  const heartbeatClient = heartbeat.client;

  heartbeatClient.on('error', function() {
    logger.log({ level: 'error', title: 'Client error', message: 'Error received, closing connection.' });
    this.socket.instance.close();
  });
  heartbeatClient.on('end', () => logger.log({ level: 'warn', title: 'Websocket warning', message: 'Connection ended.' }));
  heartbeatClient.on('close', () => logger.log({ level: 'warn', title: 'Websocket warning', message: 'Connection closed.' }));
  heartbeatClient.on('open', () => logger.log({ level: 'info',   title: 'Websocket info',  message: 'Connection opened.' }));
  heartbeatClient.on('reconnect', () => logger.log({ level: 'info', title: 'Websocket info', message: 'Reconnecting ...' }));
  heartbeatClient.on('initialize', () => logger.log({ level: 'info', title: 'Websocket info', message: 'Client initialized, data is flowing.' }));

  try {
    // Save trades to mongo
    openStream(client, symbol, stream, [saveToDB], [{ args: ["Trade", 'trdMatchID'] }]);
  } catch (err) {
    logger.log({ level: 'error', title: 'Main call error', message: err });
  } 
}

//
// Opens a stream and executes an arbitrary number of
//   callbacks on the data.
//
//   The function takes the following arguments
//      
//      Parameter        Type
//      -----------      ---------
//       client           <obj>
//       symbol           <string>
//       stream           <string>
//       callbacks        <array><function>
//       callbacksArgs    <array><obj>
//
function openStream(client, symbol, stream, callbacks=[], callbacksArgs=[]) {
  let oldData = [];

  client.addStream(symbol, stream, (...args) => { 
    const streamData = args[0]

    const newData = streamData.filter((trade) => {
      return !oldData.some((oldTrade) => oldTrade.trdMatchID === trade.trdMatchID);
    });

    newData.forEach((trade) => {
      const newTrade = new Trade(trade);

        // Execute arbitrary number of callbacks on the data
        if (callbacks.length !== callbacksArgs.length) {
          throw new Error('The length of callbacks array is not the same as the lenght of callbacksArgs array')
        }
        if (callbacks.length > 0) {
          callbacks.forEach((callback, index) => {
            try { 
              callback(newTrade, ...callbacksArgs[index].args);
            } catch (err) {
              logger.log({ level: 'error', title: 'Callback error', message: `Error on function: ${callback.name}` });
            }
          });
        }

    });

    logger.log({ level: 'max', title: 'Websocket Data', message: `New data: ${newData}` });
    logger.log({ level: 'verbose', title: 'Websocket Data', message: `New data length: ${newData.length}` });
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
function saveToDB(instance, modelName, modelID) {
  if (!usedb) {
    logger.log({ level: 'max', title: 'MongoDB', message: `Env variable USEDB is ${usedb}. NOT saving to DB` });
    return;
  }

  // Create query in advance
  const query = {};
  query[modelID] = instance[modelID];

  setTimeout( () => {
    mongoose.model(modelName)
      .find(query, (err, matches) => {
        if (err) {
          logger.log({ level: 'error', title: 'MongoDB', message: `Object ID ${instance[modelID]} An error has ocurred: ${err}` });
        } else {
          if (matches.length === 0) {
            instance.save()
              .then((instance) => logger.log({ level: 'verbose', title: 'MongoDB', message: `Object with ID: ${instance[modelID]} saved to DB.` }))
              .catch((err) => logger.log({ level: 'error', title: 'MongoDB', message: `Error saving object with ID: ${instance[modelID]} ${err}` }));
          } else {
            logger.log({ level: 'verbose', title: 'MongoDB', message: `Object with ID ${instance[modelID]} already exists. Skipping ... ` });
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
if (usedb) {
  mongoose.connect(db_uri)
    .then(() => { 
      connectToBitMEX()
    })
    .catch((err) => {
      logger.log({ level: 'error', title: 'Client error', message: `Error connecting to BitMEX: ${err}` });
    });
} else {
  logger.log({ level: 'warn', title: 'MongoDB', message: `Env variable USEDB is ${usedb}. NOT saving to DB` });
  connectToBitMEX();
}
