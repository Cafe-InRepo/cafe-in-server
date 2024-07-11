const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema({
  products: [
    {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
  ],
  table: {
    type: Schema.Types.ObjectId,
    ref: "Table",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "preparing", "completed"],
    default: "pending",
  },
  payed: {
    type: Boolean,
    default: false,
  },
  totalPrice: {
    type: Number,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
