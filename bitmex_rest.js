const fetch = require('node-fetch');
const crypto = require('crypto');
const qs = require('qs');
const { logger } = require('./logger.js');
require('dotenv').config()

// Environment
const testnet = (process.env.TESTNET === 'true');
const apiKey = process.env.KEY;
const apiSecret = process.env.SECRET;

//
// Create and make a request to BitMEX REST API
//
function makeRequest(verb, endpoint, data = {}) {
  logger.log({ level: 'verbose', title: 'REST API', message: 'Request made' });
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
    err => logger.log({ level: 'error', title: 'REST API', message: `Error: ${err}` }),
  );
}

module.exports = { makeRequest };
