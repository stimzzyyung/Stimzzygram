const mongoose = require('mongoose');
const { Schema } = mongoose;
// "Vibes" short videos
module.exports = mongoose.model('Video', new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  url: { type: String, required: true },
  caption: { type: String, default: '' },
  hashtags: [{ type: String, index: true }],
  audio: { title: { type: String, default: 'Original audio' }, artist: String },
  likesCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  isFlagged: { type: Boolean, default: false },
}, { timestamps: true }));
