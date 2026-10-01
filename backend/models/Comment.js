const mongoose = require('mongoose');
const { Schema } = mongoose;
module.exports = mongoose.model('Comment', new Schema({
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 1000 },
  parent: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
}, { timestamps: true }));
