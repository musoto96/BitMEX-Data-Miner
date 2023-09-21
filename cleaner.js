const mongoose = require('mongoose');
const Trade = require('./models/Trade');
require('dotenv').config();


// Environement
const testnet = (process.env.TESTNET === 'true');
const symbol = process.env.SYMBOL;
const mongoHost = (process.env.DEV == 'true' ? process.env.DEV_MONGO_HOST : process.env.MONGO_HOST );
const db_uri = `mongodb://${process.env.DB_USER}:${process.env.DB_USER_PWD}@${mongoHost}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=admin&w=1`;

//
// Find and remove any duplicates in database based on ID.
// 
// Even though the main function in websocket connectToBitMEX checks for 
//   modelID before writing to DB, duplicates may still happen if you run
//   multiple nodes of the function or if you run the rest API extractor 
//   in parallel.
//
// Schedule to run this cleaner periodically.
//
//   The function takes:
//      
//      Parameter    Type
//      -----------  ---------
//       modelName    <string>
//       modelID      <string>
//
function removeDuplicates(modelName, modelID) {
  mongoose.model(modelName)
    .aggregate([
        { $group: 
          {
            _id: `$${modelID}`, "dups": { "$push": "$_id" },
            count: { $sum: 1 } 
          }
        }, 
        { $match: { count: { "$gt": 1 } } }, 
        { $sort: { count: -1 } }
      ], { "allowDiskUse" : true })
    .then((data) => {
      console.log(`Duplicates found: ${data.length}`);
      if (data.length > 0) {
        data.forEach((dup) => {
          mongoose.model(modelName).deleteOne({ modelID: dup._id })
            .then(console.log(`${dup._id} deleted`))
            .catch((err) => console.log(err.message));
        });
        console.log(`${data.length} duplicates deleted`);
      } else {
        console.log("No duplicates found");
        mongoose.disconnect();
      }
    });
}

mongoose.connect(db_uri)
  .then(() => { 
    console.log("Connected to MongoDB");
    removeDuplicates('Trade', 'trdMatchID');
  })
  .catch((err) => {
    console.log(err);
  });
