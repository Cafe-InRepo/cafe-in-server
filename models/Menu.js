const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Category = require("./Category");

const menuSchema = new Schema({
  categories: [
    { type: Schema.Types.ObjectId, ref: "Category", required: true },
  ],
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true, // Ensures each user can have only one menu
  },
});

const Menu = mongoose.model("Menu", menuSchema);
module.exports = Menu;
