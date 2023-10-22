const util = require('util');
const BitMEXClient = require('./BitMEX_client.js');
const { Heartbeat } = require('./heartbeat.js');
const { saveToDB, dbUrl } = require('./database.js');
const { logger } = require('./logger.js');

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
//
const usedb = (process.env.USEDB === 'true')
const symbol = process.env.SYMBOL;
const stream = process.env.STREAM;

//
// Connects to BitMEX websocket and starts a heartbeat with websocket.
//  See README for options.
//
function BitMEXHeartbeatClient(maxLen=1000) {
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

  heartbeatClient.on('error', function(err) {
    logger.log({ level: 'error', title: 'Client error', message: `Error received, closing connection: ${err}` });
    this.socket.instance.close();
  });
  heartbeatClient.on('end', () => logger.log({ level: 'warn', title: 'Websocket warning', message: 'Connection ended.' }));
  heartbeatClient.on('close', () => logger.log({ level: 'warn', title: 'Websocket warning', message: 'Connection closed.' }));
  heartbeatClient.on('open', () => logger.log({ level: 'info',   title: 'Websocket info',  message: 'Connection opened.' }));
  heartbeatClient.on('reconnect', () => logger.log({ level: 'info', title: 'Websocket info', message: 'Reconnecting ...' }));
  heartbeatClient.on('initialize', () => logger.log({ level: 'info', title: 'Websocket info', message: 'Client initialized, data is flowing.' }));

  return heartbeatClient;
}

module.exports = { BitMEXHeartbeatClient };

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
    logger.log({ level: 'data', title: 'Websocket Data', message: `New data ${newData.map(obj => obj[streamDictionary[stream].log])}` });
    logger.log({ level: 'data', title: 'Websocket Data', message: `New data length: ${newData.length}` });
    oldData = args[0]
  });
}

//
// Stream dictionary for DB and data handlers
//
const streamDictionary = {
  trade: { 
    id: 'trdMatchID',
    modelName: 'Trade',
    log: 'timestamp'
  }, 
}

//
// Handle trade stream data, returns new trade objects.
//
function tradeStreamDataHandler(oldData, trade) {
  return !oldData.some((oldTrade) => oldTrade[streamDictionary.trade.id] === trade[streamDictionary.trade.id]);
}


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
  mongoose.connect(dbUri)
    .then(() => { 
      const cllient = BitMEXHeartbeatClient()
      // Open stream and save data to mongodb
      try {
        openStream(client, symbol, stream, [saveToDB], [
          { args: 
              [streamDictionary[stream].modelName, streamDictionary[stream].id] 
          }
        ]);
      } catch (err) {
        logger.log({ level: 'error', title: 'Main call error', message: err });
      } 
    })
    .catch((err) => {
      logger.log({ level: 'error', title: 'Entrypoint error', message: `Error connecting: ${err}` });
    });
} else {
  logger.log({ level: 'warn', title: 'MongoDB', message: `Env variable USEDB is ${usedb}. NOT saving to DB` });
  const client = BitMEXHeartbeatClient();
  // Just open stream
  try {
    openStream(client, symbol, stream);
  } catch (err) {
    logger.log({ level: 'error', title: 'Main call error', message: err });
  } 
}
