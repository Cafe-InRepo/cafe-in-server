const { type } = require("express/lib/response");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  img: { type: String },
  verified: { type: Boolean, default: false },
  role: {
    type: String,
    enum: ["client", "superClient"],
    required: true,
    default: "client",
  },
  superClient: {
    // Only for client users to link them to a superClient
    type: Schema.Types.ObjectId,
    ref: "User",
    required: function () {
      return this.role === "client";
    },
  },
  // Fields specific to superClient
  phoneNumber: {
    type: String,
    required: function () {
      return this.role === "superClient";
    },
  },
  contractNumber: {
    type: String,
    required: function () {
      return this.role === "superClient";
    },
  },
  percentage: {
    type: Number,
    required: function () {
      return this.role === "superClient";
    },
    min: 0,
    max: 100,
  },
  placeName: {
    type: String,
    required: function () {
      return this.role === "superClient";
    },
  },
  placeLocation: {
    type: {
      long: {
        type: Number,
        required: function () {
          return this.role === "superClient";
        },
      },
      lat: {
        type: Number,
        required: function () {
          return this.role === "superClient";
        },
      },
    },
    required: function () {
      return this.role === "superClient";
    },
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
