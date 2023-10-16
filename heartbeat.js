const EventEmitter = require('events');

//
// Wrapper for BitMEXClient class.
// 
// Closes connection and emits an error to client when pong is not 
//   received on time.
// 
// Set up a listener for error the main function, to reconnect
// to websocket when an error event is sent.
//
//   e.g. Where heartbeatClient is an initialized client.
//   
//     heartbeatClient.on('error', function() {
//       this.socket.reconnect();
//     });
//
class Heartbeat extends EventEmitter {
  constructor(client) {
    super();
    this.client = client;
    this.socket = client.socket;
    this.client.on('pong', this.pongListener.bind(this));
    this.client.on('message', this.messageListener.bind(this));
    this.client.on('open', this.ping);
    this.timeout = this.startTimeout(20000);
  };

  // Will close connection and emit an error to client 
  //   if no pong is received on time
  startTimeout(ms=20000) {
    return setTimeout(() => {
      console.log('Timeout hit. Closing and emitting error ...');
      clearTimeout(this.ping);
      this.socket.instance.close();
      this.client.emit('error')
    }, ms);
  }

  // Sends a ping to socket from client class.
  ping() {
    this.socket.send('ping');
    console.info(`Sent ping`);
  }

  // Handles a pong message, resets error timeout and
  //   sets a timeout before next ping is sent
  pongListener(data, ms=5000) {
    console.info(`Received data: ${data}`);
    clearTimeout(this.timeout);
    this.timeout = this.startTimeout();
    setTimeout(() => this.ping(), ms);
  }

  // Handles any other message, resets error timeout and
  //   sets a timeout before next ping is sent
  messageListener(data, ms=5000) {
    console.info(`Received data: ${data}`);
    clearTimeout(this.timeout);
    this.timeout = this.startTimeout();
    setTimeout(() => this.ping(), ms);
  }
};

module.exports = { Heartbeat };
