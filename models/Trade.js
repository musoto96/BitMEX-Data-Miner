const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const tradeSchema = new Schema(
  {
    timestamp: String,
    symbol: String,
    side: String,
    size: Number,
    price: Number,
    tickDirection: String,
    trdMatchID: String,
    grossValue: Number,
    homeNotional: Number,
    foreignNotional: Number
  }, { timestamps: false }
);

const Model = mongoose.model("Trade", tradeSchema);

module.exports = Model;
