const mongoose = require('mongoose');
const { Schema } = mongoose;
const s = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['follow', 'follow_request', 'like', 'comment', 'reply', 'message', 'mention', 'story_reaction'], required: true },
  post: { type: Schema.Types.ObjectId, ref: 'Post' },
  text: String,
  read: { type: Boolean, default: false },
}, { timestamps: true });
s.index({ recipient: 1, createdAt: -1 });
module.exports = mongoose.model('Notification', s);
