const mongoose = require('mongoose');
const { Schema } = mongoose;
const s = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
}, { timestamps: true });
s.index({ user: 1, post: 1 }, { unique: true });
module.exports = mongoose.model('SavedPost', s);
