const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  verificationCode: { type: String, required: true },
  img: { type: String },
  verified: { type: Boolean, required: false, default: false },
  role: {
    type: String,
    enum: ['client', 'superClient'],
    required: true,
    default: 'client'
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
