const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const tradeSchema = new Schema(
  {
    timestamp: { type: Date, index: true },
    symbol: String,
    side: String,
    size: Number,
    price: Number,
    tickDirection: String,
    trdMatchID: { type: String, index: true },
    grossValue: Number,
    homeNotional: Number,
    foreignNotional: Number
  }, { timestamps: false }
);

tradeSchema.index({ trdMatchID: 1, type: -1 })
tradeSchema.index({ timestamp: 1, type: -1 })
const Model = mongoose.model("Trade", tradeSchema);

module.exports = Model;
