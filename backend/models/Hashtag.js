const mongoose = require('mongoose');
module.exports = mongoose.model('Hashtag', new mongoose.Schema({
  name: { type: String, required: true, unique: true, lowercase: true },
  count: { type: Number, default: 0, index: true },
  isBanned: { type: Boolean, default: false },
}, { timestamps: true }));
