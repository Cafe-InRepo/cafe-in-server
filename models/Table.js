const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tableSchema = new Schema({
  number: {
    type: Number,
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  superClient: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orders: [
    {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
  ],
});

// Create a compound unique index
tableSchema.index({ number: 1, superClient: 1 }, { unique: true });

const Table = mongoose.model("Table", tableSchema);
module.exports = Table;
