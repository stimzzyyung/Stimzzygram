const mongoose = require('mongoose');
const { Schema } = mongoose;
module.exports = mongoose.model('Message', new Schema({
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  mediaUrl: String,
  mediaType: { type: String, enum: ['image', 'video', 'audio'] },
  scheduledMessage: { type: Schema.Types.ObjectId, ref: 'ScheduledMessage', unique: true, sparse: true },
  replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
  reactions: [{ user: { type: Schema.Types.ObjectId, ref: 'User' }, emoji: String }],
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isSnap: { type: Boolean, default: false },
  snapTimer: { type: Number, default: 10 },
  snapOpened: { type: Boolean, default: false },
  snapOpenedAt: Date,
  snapBurned: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
}, { timestamps: true }));
