const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text: { type: String, default: '' },
  mediaUrl: String,
  mediaType: { type: String, enum: ['image', 'video', 'audio', 'document', 'file'] },
  fileInfo: {
    fileName: String,
    fileSize: Number,
    mimeType: String,
  },
  scheduledMessage: { type: Schema.Types.ObjectId, ref: 'ScheduledMessage', unique: true, sparse: true },
  replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
  forwardedFrom: { type: Schema.Types.ObjectId, ref: 'User' },
  reactions: [{ user: { type: Schema.Types.ObjectId, ref: 'User' }, emoji: String }],
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['sending', 'sent', 'delivered', 'read'], default: 'sent' },
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  translatedContent: { type: Map, of: String, default: {} },
  isSnap: { type: Boolean, default: false },
  viewOnce: { type: Boolean, default: false },
  snapTimer: { type: Number, default: 10 },
  snapOpened: { type: Boolean, default: false },
  snapOpenedAt: Date,
  snapBurned: { type: Boolean, default: false },
  snapReplayUrl: { type: String, select: false },
  snapReplayUntil: Date,
  snapSavedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  deleted: { type: Boolean, default: false },
}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
