# BitMEX-Data-Miner

### Quickstart
To run the application (_nodeJS_ + _MongoDB_) on docker
```
docker compose up --build
```
This will consume the default `docker-compose.yml`
&nbsp;
### Development
For development you can turn on
```
DEV="true"
```
on `.env`, this will make use of any variable(s) with `DEV` prefix.

Start the database and web gui with
```
docker compose up -f mongo-docker-compose.yml up --build
```

This will bring up a containers for _MongoDB_ and _Mongo-Express_, and now running the websocket with _nodeJS_ will connect to this _MongoDB_ container.
```
npm install
node bitmex_ws.js
```

### Basic usage
There are three main scripts

 - `bitmex_ws.js` &nbsp;&nbsp;&nbsp;&nbsp; Connects to BitMEX websocket and saves incomming data.
 - `bitmex_rest.js` &nbsp;&nbsp;&nbsp;&nbsp; Makes requests to BitMEX REST API every 5 seconds and saves the data. It will request `page` number of pages of `pageSize` data points each. 
 - `cleaner.js` &nbsp;&nbsp;&nbsp;&nbsp; This script is meant to be run periodically, it will remove any duplicates from database, it is specially usefull if running both `bitmex_ws.js` and `bitmex_rest.js` in parallel.

For some more information consult the inline comments inside the scripts.

&nbsp;
&nbsp;

---
This repository makes use of the code under `lib` directory from the official [BitMEX-API-Connectors](https://github.com/BitMEX/api-connectors/tree/master/official-ws/nodejs).
