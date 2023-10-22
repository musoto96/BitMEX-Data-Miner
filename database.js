const mongoose = require('mongoose');
const { logger } = require('./logger.js');
require('dotenv').config();
mongoose.set('strictQuery', false);

// Environment
const usedb = (process.env.USEDB === 'true')
const mongoHost = (process.env.DEV == 'true' ? process.env.DEV_MONGO_HOST : process.env.MONGO_HOST );
const dbUri = `mongodb://${process.env.DB_USER}:${process.env.DB_USER_PWD}@${mongoHost}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=admin&w=1`;

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

  setTimeout( () => {
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
function connectToDB(callback, ...args) {
  mongoose.connect(dbUri)
    .then(() => { 
      // Open stream and save data to mongodb
      try {
        callback(...args);
      } catch (err) {
        logger.log({ level: 'error', title: 'Main call error', message: err });
      } 
    })
    .catch((err) => {
      logger.log({ level: 'error', title: 'Entrypoint error', message: `Error connecting: ${err}` });
    });
}

module.exports = { saveToDB, connectToDB }
