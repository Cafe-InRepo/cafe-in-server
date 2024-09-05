const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema({
  products: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        default: 1,
      },
    },
  ],
  table: {
    type: Schema.Types.ObjectId,
    ref: "Table",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "preparing", "completed", "archived"],
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
    default: Date.now(),
  },
  rated: {
    type: Boolean,
    default: false,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
