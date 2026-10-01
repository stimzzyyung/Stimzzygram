const mongoose = require('mongoose');
const { Schema } = mongoose;
module.exports = mongoose.model('Conversation', new Schema({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  unread: { type: Map, of: Number, default: {} },
}, { timestamps: true }));
