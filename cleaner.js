const mongoose = require('mongoose');
const Trade = require('./models/Trade');
require('dotenv').config();

db_uri = `mongodb://${process.env.DB_USER}:${process.env.DB_USER_PWD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=admin&w=1`;
mongoose.connect(db_uri)
  .then(() => { 
    console.log("Connected to MONGODB");

    mongoose.model("Trade").aggregate([{
      $group: {
        _id: "$trdMatchID",
        "dups": {
          "$push": "$_id"
        },
        count: {
          $sum: 1
        }
      }
    }, {
      $match: {
        count: {
          "$gt": 1
        }
      }
    }, {
      $sort: {
        count: -1
      }
    }]).then((data) => {
      console.log(`Duplicates found: ${data.length}`);
      if (data.length > 0) {
        data.forEach((dup) => {
          mongoose.model("Trade").deleteOne({ 'trdMatchID': dup._id })
            .then(console.log(`${dup._id} deleted`))
            .catch((err) => console.log(err.message));
        });
        console.log("Duplicates deleted");
      } else {
        console.log("No duplicates found");
        mongoose.disconnect();
      }
    });
  })
  .catch((err) => {
    console.log(err);
  });

