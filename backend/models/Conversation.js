const mongoose = require('mongoose');
const { Schema } = mongoose;

const conversationSchema = new Schema({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
  type: { type: String, enum: ['direct', 'group'], default: 'direct' },
  groupInformation: {
    name: { type: String, trim: true, maxlength: 100 },
    picture: { type: String, default: '' },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    permissions: {
      onlyAdminsMessage: { type: Boolean, default: false },
      onlyAdminsEditInfo: { type: Boolean, default: true },
    },
    moderation: {
      filterProfanity: { type: Boolean, default: false },
    },
  },
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  unread: { type: Map, of: Number, default: {} },
}, { timestamps: true });

conversationSchema.index({ type: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
