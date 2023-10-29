const fs = require('fs');
const mongoose = require('mongoose');
const { logger } = require('./logger.js');
require('dotenv').config();
mongoose.set('strictQuery', false);

// Environment
const usedb = (process.env.USEDB === 'true')
const mongoHost = (process.env.DEV == 'true' ? process.env.DEV_MONGO_HOST : process.env.MONGO_HOST );
const dbUri = `mongodb://${process.env.DB_USER}:${process.env.DB_USER_PWD}@${mongoHost}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=admin&w=1`;

if (usedb) {
  mongoose.connect(dbUri).then(logger.log({ level: 'info', title: 'MongoDB', message: `Connected to DB on: ${dbUri}` }));
}


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
      }
    });
}


// 
function _formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

// 
// Connects to MongoDB dumps data older than 24h
//   into a json file, also removes this data 
//   from the database.
// 
//   The function takes the following arguments
//      
//      Parameter    Type
//      -----------  ---------
//       modelName    <string>
// 
async function dumpDataToFile(modelName) {
  try {
    // Calculate the date 24 hours ago from now
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 1);

    console.log(twentyFourHoursAgo);

     // Query the collection to find data older than 24 hours
    const oldTrades = await mongoose.model(modelName).find({ timestamp: { $lt: twentyFourHoursAgo } }).exec();


    if (oldTrades.length > 0) {
      // Convert oldTrades to JSON format
      const jsonData = JSON.stringify(oldTrades, null, 2);

      // Get the current date in the format "year-month-day" (e.g., 20230719)
      const currentDate = await _formatDate(new Date());
      // Write the JSON data to a file with the appropriate name
      fs.writeFileSync(`./dump/trades_${currentDate}.json`, jsonData);
      console.log(`Old data dumped to dump/trades_${currentDate}.json file.`);

      // Delete all the old documents from the collection
      await mongoose.model(modelName).deleteMany({ timestamp: { $lt: twentyFourHoursAgo } });

      console.log('Old data deleted from the collection.');
    } else {
      console.log('No old documents found.');
    }
  } catch (err) {
    console.error('Error occurred:', err);
  }
}

// 
// Saves data into the configured MONGODB database
//
//   The function takes the following arguments
//      
//      Parameter    Type
//      -----------  ---------
//       modelName    <string>
//       modelID      <string>
//       data         <obj>
// 
//  It will check database for matching modelID 
//    if none are found the data is saved, 
//    if there is a match it is skipped.
// 
function saveToDB(data, modelName, modelID) {
  const Model = require(`./models/${modelName}.js`);
  const instance = new Model(data);

  if (!usedb) {
    logger.log({ level: 'max', title: 'MongoDB', message: `Env variable USEDB is ${usedb}. NOT saving to DB` });
    return;
  }

  // Create query in advance
  const query = {};
  query[modelID] = instance[modelID];

  setTimeout(() => {
    // Database check for ID and save
    mongoose.model(modelName)
      .find(query, (err, matches) => {
        if (err) {
          logger.log({ level: 'error', title: 'MongoDB', message: `Object ID ${instance[modelID]} An error has ocurred: ${err}` });
        } else {
          if (matches.length === 0) {
            instance.save()
              .then((instance) => logger.log({ level: 'verbose', title: 'MongoDB', message: `Object with ID: ${instance[modelID]} saved to DB.` }))
              .catch((err) => logger.log({ level: 'error', title: 'MongoDB', message: `Error saving object with ID: ${instance[modelID]} ${err}` }));
          } else {
            logger.log({ level: 'verbose', title: 'MongoDB', message: `Object with ID ${instance[modelID]} already exists. Skipping ... ` });
          }
        }
      }).allowDiskUse();

  }, 1 + Math.random()); // Add somee random time
}

// 
// Connect to DB and execute a callback
//
//   The function takes the following arguments
//      
//      Parameter    Type
//      -----------  ---------
//       callback     <function>
//       args         <args>
// 
function executeOnDB(callback, ...args) {
  try {
    logger.log({ level: 'info', title: 'MongoDB', message: `Using DB: ${dbUri}` });
    callback(...args);
  } catch(err) {
    logger.log({ level: 'error', title: 'Entrypoint error', message: `Error connectToDB: ${err}` });
  };
  logger.log({ level: 'info', title: 'Callback executed', message: `Executed: ${callback.name}` });
}

module.exports = { saveToDB, executeOnDB }
