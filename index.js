const { BitMEXHeartbeatClient } = require('./bitmex_ws.js');
const { openStream, streamDictionary, tradeStreamDataHandler } = require('./streams.js');
const { connectToDB, saveToDB, dbUrl } = require('./database.js');
const { logger } = require('./logger.js');
require('dotenv').config();

// Environment
const usedb = (process.env.USEDB === 'true');

// 
// This is the entrypoint, it is very ugly for now.
// 
// Connects to database and then runs connects to BitMEX
//   function to start saving data from websocket,
//   the connection will drop unexpectedly heartbeat was implemented.
// 
// You can run this in parallel to bitmex_ws.js
// This will save new incomming data using websocket and 
//   past data from REST API
// 
if (usedb) {
  connectToDB(openStream, client, [saveToDB], [{ args: [streamDictionary[stream].modelName, streamDictionary[stream].id] }]);
} else {
  logger.log({ level: 'warn', title: 'MongoDB', message: `Env variable USEDB is ${usedb}. NOT saving to DB` });
  const client = BitMEXHeartbeatClient();
  // Just open stream
  try {
    openStream(client);
  } catch (err) {
    logger.log({ level: 'error', title: 'Main call error', message: err });
  } 
}
