const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tableSchema = new Schema({
  number: {
    type: Number,
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  superClient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const Table = mongoose.model('Table', tableSchema);
module.exports = Table;
