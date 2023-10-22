const { logger } = require('./logger.js');
const { dataDictionary } = require('./apiHelper.js');
require('dotenv').config();

// Environment
const symbol = process.env.SYMBOL;
const stream = process.env.STREAM;

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
function openStream(client, callbacks=[], callbacksArgs=[]) {
  let oldData = [];

  client.addStream(symbol, stream, (...args) => { 
    const streamData = args[0]

    // Filter data depending on stream using a stream data handler
    const newData = streamData.filter((obj) => {
      switch (stream) {
        case 'trade':
          return tradeStreamDataHandler(oldData, obj);
          break;
        default:
          logger.log({ level: 'error', title: 'Stream error', message: `No stream data handler for stream: ${stream}` });
          throw new Error(`No stream data handler for stream: ${stream}`); 
      }
    });

    // Execute arbitrary number of callbacks on the data
    newData.forEach((obj) => {
        if (callbacks.length !== callbacksArgs.length) {
          throw new Error('The length of callbacks array is not the same as the lenght of callbacksArgs array')
        }
        if (callbacks.length > 0) {
          callbacks.forEach((callback, index) => {
            try { 
              // Inject data to callback arguments 
              callback(obj, ...callbacksArgs[index].args);
            } catch (err) {
              logger.log({ level: 'error', title: 'Callback error', message: `Error on function: ${callback.name}` });
            }
          });
        }

    });

    // Data level logging
    logger.log({ level: 'data', title: 'Websocket Data', message: `New data ${newData.map(obj => obj[dataDictionary[stream].log])}` });
    logger.log({ level: 'info', title: 'Websocket Data', message: `New data length: ${newData.length}` });
    oldData = args[0]
  });
}

//
// Handle trade stream data, returns new trade objects.
//
function tradeStreamDataHandler(oldData, newTrade) {
  return !oldData.some((oldTrade) => oldTrade[dataDictionary.trade.id] === newTrade[dataDictionary.trade.id]);
}

module.exports = { openStream };
