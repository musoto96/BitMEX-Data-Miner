require('dotenv').config();

const stream = process.env.STREAM;

// API Dictionary for DB and data handlers
const dataDictionary = {
  trade: { 
    id: 'trdMatchID',
    modelName: 'Trade',
    log: 'timestamp'
  }, 
}

// Metadata
const metadata = dataDictionary[stream];

module.exports = { dataDictionary, metadata };
