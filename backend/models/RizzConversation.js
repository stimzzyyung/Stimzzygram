const mongoose = require('mongoose');
const { Schema } = mongoose;
module.exports = mongoose.model('RizzConversation', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'New chat' },
}, { timestamps: true }));
