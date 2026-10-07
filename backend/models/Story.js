const mongoose = require('mongoose');
const { Schema } = mongoose;
const s = new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  mediaUrl: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  text: String,
  filter: { type: String, default: 'none' },
  durationHours: { type: Number, default: 24 },
  stickers: [String],
  music: { title: String, artist: String },
  visibility: { type: String, enum: ['everyone', 'followers', 'close_friends'], default: 'everyone' },
  viewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  reactions: [{ user: { type: Schema.Types.ObjectId, ref: 'User' }, emoji: String }],
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 3600 * 1000) },
}, { timestamps: true });
s.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto-delete at each story's chosen expiry
module.exports = mongoose.model('Story', s);
