const { BitMEXHeartbeatClient } = require('./bitmex_ws.js');
const { openStream } = require('./streams.js');
const { dataDictionary, metadata } = require('./apiHelper.js');
const { executeOnDB, saveToDB } = require('./database.js');
const { restExtractData } = require('./requests.js');
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
  // Execute an array of callbacks on the data received from Websocket,
  //   if a function takes no arguments, pass an object with empty args array
  //   { args: [] } the number of callbacks and number of callbackArgs have to match.
  //

  // These arrays will be used when usedb=true
  const dbCallbackArray = [saveToDB];
  const dbCallbackArgsArray = [{ args: [metadata.modelName, metadata.id] }];

  // These arrays will be used when usedb=false
  const callbackArray = [() => logger.log({ level: 'max', title: 'Callback', message: 'Test callback'})];
  const callbackArgsArray = [{ args: [] }];


  if (usedb) {

    // Connect to DB, open Websocket stream and execute callbacks
    //   e.g. saving to db, see dbCallback arrays above.
    //
    executeOnDB(openStream, client, dbCallbackArray, dbCallbackArgsArray);

    // Connect to DB, make REST api calls and save the data
    //   here we save the last 500 pages of 25 data points each 
    //   starting 0 points back from now, the maximum pageSize is 1000.
    //
    executeOnDB(restExtractData, metadata.modelName, metadata.id, 25, 500, 0);

  } else {
    logger.log({ level: 'warn', title: 'MongoDB', message: `Env variable USEDB is ${usedb}. NOT saving to DB` });
    // Open stream and execute callbacks
    try {
      openStream(client, callbackArray, callbackArgsArray);
    } catch (err) {
      logger.log({ level: 'error', title: 'Main call error', message: err });
    } 
  }
})();
