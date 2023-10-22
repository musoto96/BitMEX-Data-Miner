const { makeRequest } = require('./bitmex_rest.js');
const { saveToDB } = require('./database.js');
const { logger } = require('./logger.js');
const { dataDictionary } = require('./apiHelper.js');
require('dotenv').config()

// Environment
const symbol = process.env.SYMBOL;
const dataEndpoint = process.env.STREAM;

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
//       pageSize     <numeric>
//       pages        <numeric>
//       offset       <numeric>
// 
//  It will check database for matching modelID 
//    if none are found the data is saved, 
//    if there is a match it is skipped.
// 
// 
function restExtractData(modelName, modelID, pageSize, pages, offset) {
  let page = 0;
  while (page < pages) {
    ((i) => {
      setTimeout(() => {
        try {
          makeRequest('GET', dataEndpoint, data={ symbol: symbol, count: pageSize, start: i * pageSize + offset, reverse: true })
            .then((data) => {
              logger.log({ level: 'data', title: 'REST API', message: `New data ${data.map(obj => obj[dataDictionary[dataEndpoint].log])}` });
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
        } catch (err) {
          logger.log({ level: 'error', title: 'REST API', message: `Request error: ${err}` });
        }
        logger.log({ level: 'info', title: 'REST API', message: `Loop number: ${i}` });
      }, 5000 * (i - offset));
    })(offset + page++)
  }
}

module.exports = { restExtractData };

// 
// Connects to database and then runs extract 
//   function to start saving data from REST API.
// 
// You can run this in parallel to bitmex_ws.js
//   in order to save new incomming data using websocket 
//   as well as previous data from REST API
// 
/*
mongoose.connect(db_uri).then(() => {
  logger.log({ level: 'info', title: 'MongoDB', message: 'REST API Connected to mongoDB' });
  extract(dataDictionary[dataEndpoint].modelName, dataDictionary[dataEndpoint].id, 1000, 1000, 0);
}).catch((err) => {
  logger.log({ level: 'err', title: 'MongoDB', message: `REST API error connecting to DB: ${error}` });
  mongoose.disconnect();
});
*/
