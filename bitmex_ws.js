const BitMEXClient = require('./BitMEX_client');
const mongoose = require('mongoose');
const Trade = require('./models/Trade');
require('dotenv').config();
mongoose.set('strictQuery', false);

// Params
const testnet = (process.env.TESTNET === 'true');
const symbol = process.env.SYMBOL;
const mongoHost = (process.env.DEV == 'true' ? process.env.DEV_MONGO_HOST : process.env.MONGO_HOST );

// See 'options' reference in README
function connectToBitMEX(stream='trade', maxLen=1000) {
  const client = new BitMEXClient({
    testnet: testnet,
    //apiKeyID: process.env.KEY,
    //apiKeySecret: process.env.SECRET,
    maxTableLen: maxLen,
  });

  // handle errors here. If no 'error' callback is attached. errors will crash the client.
  client.on('error', console.error);
  client.on('open', () => console.log('Connection opened.'));
  client.on('close', () => console.log('Connection closed.'));
  client.on('initialize', () => console.log('Client initialized, data is flowing.'));

  let oldData = [];

  client.addStream(symbol, stream, (...args) => { 
    const streamData = args[0]

    const newData = streamData.filter((trade) => {
      return !oldData.some((oldTrade) => oldTrade.trdMatchID === trade.trdMatchID);
    });

    
    newData.forEach((trade) => {
      const newTrade = new Trade(trade);
      saveToDB(Trade, 'trdMatchID', newTrade);
    }

    /*
    newData.forEach((trade) => {
      const new_trade = new Trade(trade);

      setTimeout( () => {
        mongoose.model('Trade')
          .find({'trdMatchID': new_trade.trdMatchID}, (err, matches) => {
            if (err) {
              console.log(`Trade ID ${new_trade.trdMatchID} An error has ocurred:`);
              console.log(err);

            } else {
              if (matches.length === 0) {
                new_trade.save()
                  .then((new_trade) => console.log(`Trade with ID: ${new_trade.trdMatchID} saved to DB.`))
                  .catch(console.log);

              } else {
                console.log(`Trade ID ${new_trade.trdMatchID} already exists. Skipping ... `);
              }
            }
          }).allowDiskUse();
      }, 1 + Math.random());
    }*/
    );

    //console.log('\nPrevious data: ', oldData, '\n');
    //console.log('Stream data: ', streamData);
    //console.log('New data: ', newData);
    console.log('New data length: ', newData.length);

    oldData = args[0]
  });
}

function saveToDB(mongoModel, modelID, instance) {
  setTimeout( () => {
    mongoose.model(`${mongoModel}`)
      .find({id: instance.modelID}, (err, matches) => {
        if (err) {
          console.log(`Object ID ${instance.modelID} An error has ocurred:`);
          console.log(err);

        } else {
          if (matches.length === 0) {
            instance.save()
              .then((instance) => console.log(`Object with ID: ${instance.modelID} saved to DB.`))
              .catch(console.log);

          } else {
            console.log(`Object with ID ${inst.modelID} already exists. Skipping ... `);
          }
        }
      }).allowDiskUse();
  }, 1 + Math.random());
}

db_uri = `mongodb://${process.env.DB_USER}:${process.env.DB_USER_PWD}@${mongoHost}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=admin&w=1`;

// Connect to database. Then run Web Socket function to save data.
// Connection will drop unexpectedly, so run several nodes in parallel, 
//  the fucntio checks for trade ID to avoid duplication.
mongoose.connect(db_uri)
  .then(() => { 
    connectToBitMEX()
  })
  .catch((err) => {
    console.log(err);
  });
