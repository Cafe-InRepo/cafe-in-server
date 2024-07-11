const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const productSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  rate: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
    required: true,
  },
  raters: {
    type: Number,
    default: 0,
  },
  img: {
    type: String,
    required: false,
  },
  available: {
    type: Boolean,
    default: true,
  }
});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
