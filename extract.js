const mongoose = require('mongoose');
const Trade = require('./models/Trade.js');
const { makeRequest } = require('./bitmex_rest.js');
const { saveToDB } = require('./database.js');
const { logger } = require('./logger.js');
const { dataDictionary } = require('./apiHelper.js');
require('dotenv').config()

// Environment
const mongoHost = (process.env.DEV == 'true' ? process.env.DEV_MONGO_HOST : process.env.MONGO_HOST );
const db_uri = `mongodb://${process.env.DB_USER}:${process.env.DB_USER_PWD}@${mongoHost}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=admin&w=1`;
const symbol = process.env.SYMBOL;
const stream = process.env.STREAM;

// 
// This function will extract data from REST api
//   tt has a timeout of 5 seconds in between requests to be 
//   well below rate limit. 
//
//   For more info on rate limits visit BitMEX REST API documentation.
// 
//   The function takes the following arguments
// 
//      Parameter    Type
//      -----------  ---------
//       modelName    <string>
//       modelID      <string>
//       endpoint     <string>
//       symbol       <string>
//       pageSize     <numeric>
//       pages        <numeric>
//       offset       <numeric>
// 
//  It will check database for matching modelID 
//    if none are found the data is saved, 
//    if there is a match it is skipped.
// 
// 
function extract(modelName, modelID, endpoint, symbol, pageSize, pages, offset) {
  let page = 0;
  const Model = mongoose.model(modelName);
  while (page < pages) {
    ((i) => {
      setTimeout(() => {
        makeRequest('GET', endpoint, data={ symbol: symbol, count: pageSize, start: i * pageSize + offset, reverse: true })
          .then((data) => {
            logger.log({ level: 'data', title: 'REST API', message: `New data ${data.map(obj => obj[dataDictionary[stream].log])}` });
            if (data.length > 0) {
              data.forEach((trade) => {
                saveToDB(trade, modelName, modelID);
              });
            } else {
              logger.log({ level: 'data', title: 'REST API', message: 'Empty response' });
              page--
            }
            logger.log({ level: 'info', title: 'REST API', message: `Data collected: ${data.length}` });
          }
        );
        logger.log({ level: 'info', title: 'REST API', message: `Loop number: ${i}` });
      }, 5000 * (i - offset));
    })(offset + page++)
  }
}

// 
// Connects to database and then runs extract 
//   function to start saving data from REST API.
// 
// You can run this in parallel to bitmex_ws.js
//   in order to save new incomming data using websocket 
//   as well as previous data from REST API
// 
mongoose.connect(db_uri).then(() => {
  logger.log({ level: 'info', title: 'MongoDB', message: 'REST API Connected to mongoDB' });
  extract(dataDictionary[stream].modelName, dataDictionary[stream].id,  stream, symbol, 1000, 1000, 0);
}).catch((err) => {
  logger.log({ level: 'err', title: 'MongoDB', message: `REST API error connecting to DB: ${error}` });
  mongoose.disconnect();
});
