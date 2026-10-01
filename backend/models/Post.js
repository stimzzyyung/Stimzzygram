const mongoose = require('mongoose');
const { Schema } = mongoose;
const postSchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  media: [{ url: String, type: { type: String, enum: ['image', 'video'], default: 'image' } }],
  caption: { type: String, default: '', maxlength: 2200 },
  hashtags: [{ type: String, index: true }],
  tags: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  location: { type: String, default: '' },
  filter: { type: String, default: 'none' },
  visibility: { type: String, enum: ['everyone', 'followers', 'close_friends'], default: 'everyone' },
  likesCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  isFlagged: { type: Boolean, default: false },
}, { timestamps: true });
postSchema.index({ createdAt: -1 });
postSchema.index({ caption: 'text' });
module.exports = mongoose.model('Post', postSchema);
