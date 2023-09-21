
# BitMEX-Data-Miner

To run the application (nodeJS + MongoDB) on docker
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

This will bring up a containers for _MongoDB_ and _Mongo-Express_, and now running the websocket with nodeJS will connect to this MongoDB container.
```
npm install
node bitmex_ws.js
```
&nbsp;
&nbsp;

---
This repository makes use of the code under `lib` directory from the official [BitMEX-API-Connectors](https://github.com/BitMEX/api-connectors/tree/master/official-ws/nodejs).
