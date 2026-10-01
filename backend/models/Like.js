const mongoose = require('mongoose');
const { Schema } = mongoose;
const s = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['post', 'video'], default: 'post' },
  target: { type: Schema.Types.ObjectId, required: true },
}, { timestamps: true });
s.index({ user: 1, targetType: 1, target: 1 }, { unique: true });
module.exports = mongoose.model('Like', s);
