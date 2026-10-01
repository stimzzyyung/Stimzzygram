const mongoose = require('mongoose');
const { Schema } = mongoose;
const s = new Schema({
  follower: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  following: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'accepted'], default: 'accepted' },
}, { timestamps: true });
s.index({ follower: 1, following: 1 }, { unique: true });
module.exports = mongoose.model('Follow', s);
