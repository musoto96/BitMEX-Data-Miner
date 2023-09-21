const fs = require('fs');
const mongoose = require('mongoose');
const Trade = require('./models/Trade');

require('dotenv').config();

db_uri = `mongodb://${process.env.DB_USER}:${process.env.DB_USER_PWD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=admin&w=1`;

/*
async function getLatest() {
    await mongoose.connect(db_uri)

    const latestTrade = await mongoose.model('Trade').findOne({})
       .sort({ timestampField: -1 })
       .exec((err, newestDocument) => {
           if (err) {
               console.error('Error occurred while querying:', err);
           }
        })

    console.log(await latestTrade)
    await mongoose.connection.close();
}

getLatest()
*/


function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

async function dumpDataToFile() {
  try {
    // Connect to the MongoDB database
    await mongoose.connect(db_uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to the database.');

    // Calculate the date 24 hours ago from now
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 1);

    console.log(twentyFourHoursAgo);

     // Query the collection to find data older than 24 hours
    const oldTrades = await Trade.find({ timestamp: { $lt: twentyFourHoursAgo } }).exec();


    if (oldTrades.length > 0) {
      // Convert oldTrades to JSON format
      const jsonData = JSON.stringify(oldTrades, null, 2);

      // Get the current date in the format "year-month-day" (e.g., 20230719)
      const currentDate = await formatDate(new Date());
      // Write the JSON data to a file with the appropriate name
      fs.writeFileSync(`./dump/trades_${currentDate}.json`, jsonData);
      console.log(`Old data dumped to dump/trades_${currentDate}.json file.`);

      // Delete all the old documents from the collection
      await Trade.deleteMany({ timestamp: { $lt: twentyFourHoursAgo } });

      console.log('Old data deleted from the collection.');
    } else {
      console.log('No old documents found.');
    }

    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed.');
  } catch (err) {
    console.error('Error occurred:', err);
  }
}

// Call the function to dump data to a file
dumpDataToFile();
