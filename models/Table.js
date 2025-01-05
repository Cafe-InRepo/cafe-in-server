const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reservationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
});

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
  qrCode: {
    type: String, // Will store the QR code as a data URL (base64 string)
    required: false,
  },
  reservations: [reservationSchema], // New field for reservations
});

// Create a compound unique index
tableSchema.index({ number: 1, superClient: 1 }, { unique: true });

const Table = mongoose.model("Table", tableSchema);
module.exports = Table;
