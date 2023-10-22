const BitMEXClient = require('./BitMEX_client.js');
const { Heartbeat } = require('./heartbeat.js');
const { logger } = require('./logger.js');
require('dotenv').config();

// Environment
const testnet = (process.env.TESTNET === 'true');
const key = process.env.KEY;
const secret = process.env.SECRET;

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
