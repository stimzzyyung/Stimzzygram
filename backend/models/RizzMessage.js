const mongoose = require('mongoose');
const { Schema } = mongoose;
module.exports = mongoose.model('RizzMessage', new Schema({
  conversation: { type: Schema.Types.ObjectId, ref: 'RizzConversation', required: true, index: true },
  role: { type: String, enum: ['user', 'bot'], required: true },
  content: { type: String, default: '' },
  responses: [String],
  style: String,
  category: String,
}, { timestamps: true }));
