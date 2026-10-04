const mongoose = require('mongoose');
const { Schema } = mongoose;

const scheduledMessageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 5000 },
  replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'processing', 'sent', 'failed'], default: 'pending', index: true },
  message: { type: Schema.Types.ObjectId, ref: 'Message' },
  error: String,
}, { timestamps: true });

scheduledMessageSchema.index({ status: 1, scheduledAt: 1 });
module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema);
