const fetch = require('node-fetch');
const crypto = require('crypto');
const qs = require('qs');
const mongoose = require('mongoose');
const Trade = require('./models/Trade');
require('dotenv').config()

// Environement
const testnet = (process.env.TESTNET === 'true');
const symbol = process.env.SYMBOL;
const mongoHost = (process.env.DEV == 'true' ? process.env.DEV_MONGO_HOST : process.env.MONGO_HOST );
const db_uri = `mongodb://${process.env.DB_USER}:${process.env.DB_USER_PWD}@${mongoHost}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=admin&w=1`;
// Required for private endpoints
const apiKey = process.env.PKEY;
const apiSecret = process.env.PSECRET;

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

/*
async function extract(method, endpoint, symbol, data={}) {
  try {
    const result = await makeRequest(
      method, 
      endpoint, 
      { ...data, 
        filter: { symbol: symbol }, 
*/
        /*columns: ['currentQty', 'avgEntryPrice'],*/
/*
      });
    return result;
  } catch (err) {
    console.error(err.message);
    throw (err);
  };
};
*/

// 
// 
// 
function extract(method, endpoint, pageSize, pages, offset) {
  let page = 0;
  while (page < pages) {
    ((i) => {
      setTimeout(() => {
        makeRequest(method, endpoint, data={ count: pageSize, start: i * pageSize + offset, reverse: true })
          .then((data) => {
            if (data.length > 0) {
              data.forEach((trade) => {

                const new_trade = new Trade(trade);

                mongoose.model("Trade").find({ "trdMatchID": new_trade.trdMatchID })
                  .allowDiskUse()
                  .exec()
                  .then((matches) => {
                    if (matches.length === 0) {
                      
                      new_trade.save()
                        .then(
                          console.log(`Trade with ID: ${new_trade.trdMatchID} saved to DB.`))
                        .catch(console.log);

                    } else {
                      console.log(`Trade with ID: ${new_trade.trdMatchID} already exists. Skipping ...`);
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


mongoose.connect(db_uri).then(() => {
  console.log('Connected to mongoDB');
  extract('GET', 'trade', 1000, 100000, 0) {

/*
  while (page < iterations) {
    ((i) => {
      setTimeout(() => {
        makeRequest(method='GET', endpoint='trade', symbol='XBTUSD', data={count: bsize, start: i * bsize + offset, reverse: true})
          .then((data) => {
            if (data.length > 0) {
              data.forEach((trade) => {

                const new_trade = new Trade(trade);

                mongoose.model("Trade").find({ "trdMatchID": new_trade.trdMatchID })
                  .allowDiskUse()
                  .exec()
                  .then((matches) => {
                    if (matches.length === 0) {
                      
                      new_trade.save()
                        .then(
                          console.log(`Trade with ID: ${new_trade.trdMatchID} saved to DB.`))
                        .catch(console.log);

                    } else {
                      console.log(`Trade with ID: ${new_trade.trdMatchID} already exists. Skipping ...`);
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
*/
}).catch((err) => {
  console.log(err);
  mongoose.disconnect();
});
