const fetch = require('node-fetch');
const crypto = require('crypto');
const qs = require('qs');
const mongoose = require('mongoose');
const Trade = require('./models/Trade');
require('dotenv').config()

// Environment
const testnet = (process.env.TESTNET === 'true');
const symbol = process.env.SYMBOL;
const mongoHost = (process.env.DEV == 'true' ? process.env.DEV_MONGO_HOST : process.env.MONGO_HOST );
const db_uri = `mongodb://${process.env.DB_USER}:${process.env.DB_USER_PWD}@${mongoHost}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=admin&w=1`;
// Required for private endpoints
const apiKey = process.env.KEY;
const apiSecret = process.env.SECRET;

//
// Create and make a request 
//
function makeRequest(verb, endpoint, data = {}) {
  console.log("Request made");
  const apiRoot = '/api/v1/';
  const expires = Math.round(new Date().getTime() / 1000) + 60; // 1 min in the future

  let query = '';
  let postBody = '';

  if (verb === 'GET')
    query = '?' + qs.stringify(data);
  else
    // Pre-compute the reqBody so we can be sure that we're using *exactly* the same body in the request
    // and in the signature. If you don't do this, you might get differently-sorted keys and blow the signature.
    postBody = JSON.stringify(data);

  const signature = crypto.createHmac('sha256', apiSecret)
    .update(verb + apiRoot + endpoint + query + expires + postBody).digest('hex');

  const headers = {
    'content-type': 'application/json',
    'accept': 'application/json',
    // This example uses the 'expires' scheme. You can also use the 'nonce' scheme. See
    // https://www.bitmex.com/app/apiKeysUsage for more details.
    'api-expires': expires,
    'api-key': apiKey,
    'api-signature': signature,
  };

  const requestOptions = {
    method: verb,
    headers,
  };
  if (verb !== 'GET') requestOptions.body = postBody;  // GET/HEAD requests can't have body

  const url = `https://${testnet ? "testnet" : "www"}.bitmex.com` + apiRoot + endpoint + query;

  return fetch(url, requestOptions).then(response => response.json()).then(
    response => {
      if ('error' in response) throw new Error(response.error.message);
      return response;
    },
    error => console.error('Network error', error),
  );
}

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
//       method       <string>
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
function extract(modelName, modelID, method, endpoint, symbol, pageSize, pages, offset) {
  let page = 0;
  const Model = mongoose.model(modelName);
  while (page < pages) {
    ((i) => {
      setTimeout(() => {
        makeRequest(method, endpoint, data={ symbol: symbol, count: pageSize, start: i * pageSize + offset, reverse: true })
          .then((data) => {
            if (data.length > 0) {
              data.forEach((trade) => {

                const newTrade = new Model(trade);
                const query = {};
                query[modelID] = newTrade[modelID];

                mongoose.model(modelName).find(query)
                  .allowDiskUse()
                  .exec()
                  .then((matches) => {
                    if (matches.length === 0) {
                      
                      newTrade.save()
                        .then(
                          console.log(`Object with ID: ${newTrade[modelID]} saved to DB.`))
                        .catch(console.log);

                    } else {
                      console.log(`Object with ID: ${newTrade[modelID]} already exists. Skipping ...`);
                    }
                  })
                  .catch((err) => {
                    console.log(err);
                  })
              });
            } else {
              console.log(data);
              console.log('Empty response');
              page--
            }
            console.log(`Data collected: ${data.length}`);
          }
        );
        console.log(`Loop number: ${i}`);
      }, 5000 * (i - offset));
    })(offset + page++)
  }
}

// 
// Connects to database and then runs extract 
//   function to start saving data from REST API.
// 
// You can run this in parallel to bitmex_ws.js
// This will save new incomming data using websocket and 
//   past data from REST API
// 
mongoose.connect(db_uri).then(() => {
  console.log('Connected to mongoDB');
  extract('Trade', 'trdMatchID', 'GET', 'trade', symbol, 1000, 1000, 0);
}).catch((err) => {
  console.log(err);
  mongoose.disconnect();
});
