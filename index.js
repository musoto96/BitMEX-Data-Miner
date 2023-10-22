const { BitMEXHeartbeatClient } = require('./bitmex_ws.js');
const { openStream, streamMetadata, tradeStreamDataHandler } = require('./streams.js');
const { connectToDB, saveToDB, dbUrl } = require('./database.js');
const { logger } = require('./logger.js');
require('dotenv').config();

// Environment
const usedb = (process.env.USEDB === 'true');

// 
// Connects to BitMEX and then runs connects to database if used,
//   a stream is then opened, and an arbitrary number of callbacks are 
//   executed, pass saveToDB and related arguments to save the data.
//
// Read database.js and streams.js for more information on callback execution.
// 
(function main() {
  const client = BitMEXHeartbeatClient();

  //
  // Enter a callback function to execute on the data received from Websocket,
  //   if a function takes no arguments, pass an empty array to it [],
  //   the number of callbacks and number of callbackArgs have to match.
  //
  const callbackArray = [saveToDB];
  const callbackArgsArray = [{ args: [streamMetadata.modelName, streamMetadata.id] }];

  // View environment variable USEDB
  if (usedb) {
    connectToDB(openStream, client, callbackArray, callbackArgsArray);
  } else {
    logger.log({ level: 'warn', title: 'MongoDB', message: `Env variable USEDB is ${usedb}. NOT saving to DB` });
    // Just open stream
    try {
      openStream(client);
    } catch (err) {
      logger.log({ level: 'error', title: 'Main call error', message: err });
    } 
  }
})();
