const BitMEXClient = require('./BitMEX_client');
const mongoose = require('mongoose');
const Trade = require('./models/Trade');
require('dotenv').config();

// See 'options' reference in README
function connectToBitMEX(testnet=true, symbol='XBTUSD', stream='trade', maxLen=1000) {
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
          });
      }, 1 + Math.random());
    });

    //console.log('\nPrevious data: ', oldData, '\n');
    //console.log('Stream data: ', streamData);
    //console.log('New data: ', newData);
    console.log('New data length: ', newData.length);

    oldData = args[0]
  });
}

db_uri = `mongodb://${process.env.DB_USER}:${process.env.DB_USER_PWD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=admin&w=1`;
mongoose.connect(db_uri)
  .then(() => { 
    connectToBitMEX(testnet=false)
  })
  .catch((err) => {
    console.log(err);
  });

