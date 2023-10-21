const EventEmitter = require('events');
const { logger } = require('./logger.js');

//
// Wrapper for BitMEXClient class.
// 
// Emits an error to client when pong is not 
//   received on time.
//
// Make sure your websocket object emits 'pong' when 
//   pong data is received. See method wsClient.onmessage
//   under ./lib/createSocket.js
// 
// You have to set up a listener for error the main function, 
//   to reconnect to websocket when an error event is sent.
//
//   e.g. 
//     client.on('error', function() {
//       this.socket.instance.close();
//     });
//
// When we close with no code the default behaviour is to reconnect.
// The reconnect method from WebSocketClient will start.
//
//
// Also add an 'end' event listener to avoid any errors from client
// 
//   e.g. 
//     client.on('end', () => console.log("Connection ended"));
//
class Heartbeat extends EventEmitter {
  constructor(client) {
    super();
    this.client = client;
    this.socket = client.socket;
    this.client.on('pong', this.pongListener.bind(this));
    this.client.on('message', this.messageListener.bind(this));
    this.client.on('open', this.ping);
  };

  // Will  emit an error to client 
  //   if no pong is received on time
  startTimeout(ms=20000) {
    return setTimeout(() => {
      logger.log({ level: 'error', title: 'Heartbeat Error', message: 'Timeout hit. Emitting error ...' });
      clearTimeout(this.ping);
      this.client.emit('error')
    }, ms);
  }

  // Sends a ping to socket from client class.
  ping() {
    this.socket.send('ping');
    logger.log({ level: 'max', title: 'Heartbeat ping', message: 'Ping SENT' });
  }

  // Handles a pong message, resets error timeout and
  //   sets a timeout before next ping is sent
  pongListener(data, ms=5000) {
    logger.log({ level: 'max', title: 'Heartbeat pong', message: `Received data: ${data}` });
    clearTimeout(this.timeout);
    this.timeout = this.startTimeout();
    this.pingTimeout = setTimeout(() => this.ping(), ms);
  }

  // Handles any other message, resets error timeout and
  //   sets a timeout before next ping is sent
  messageListener(data, ms=5000) {
    logger.log({ level: 'max', title: 'Heartbeat data', message: `Received data: ${data}` });
    clearTimeout(this.timeout);
    this.timeout = this.startTimeout();
    setTimeout(() => this.ping(), ms);
  }
};

module.exports = { Heartbeat };
