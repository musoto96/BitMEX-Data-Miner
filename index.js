const { BitMEXHeartbeatClient } = require('./bitmex_ws.js');
const { openStream, streamMetadata } = require('./streams.js');
const { connectToDB, saveToDB } = require('./database.js');
const { logger } = require('./logger.js');
require('dotenv').config();

// Environment
const usedb = (process.env.USEDB === 'true');

// 
// Connects to BitMEX and then connects to database if USEDB is set to true
//   a stream is then opened, and an arbitrary number of callbacks are 
//   executed, pass saveToDB and related arguments to save the data.
//
// Read database.js and streams.js for more information on callback execution.
// 
//
(function main() {
  const client = BitMEXHeartbeatClient();

  //
  // Enter a callback function to execute on the data received from Websocket,
  //   if a function takes no arguments, pass an empty array to it [],
  //   the number of callbacks and number of callbackArgs have to match.
  //

  // These arrays will be used when usedb=true
  const dbCallbackArray = [saveToDB];
  const dbCallbackArgsArray = [{ args: [streamMetadata.modelName, streamMetadata.id] }];

  // These arrays will be used when usedb=false
  const callbackArray = [() => logger.log({ level: 'max', title: 'Callback', message: 'Test callback'})];
  const callbackArgsArray = [{ args: [] }];


  // View environment variable USEDB
  if (usedb) {
    connectToDB(openStream, client, dbCallbackArray, dbCallbackArgsArray);
  } else {
    logger.log({ level: 'warn', title: 'MongoDB', message: `Env variable USEDB is ${usedb}. NOT saving to DB` });
    // Just open stream
    try {
      openStream(client, callbackArray, callbackArgsArray);
    } catch (err) {
      logger.log({ level: 'error', title: 'Main call error', message: err });
    } 
  }
})();
