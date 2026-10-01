const mongoose = require('mongoose');
const { Schema } = mongoose;
module.exports = mongoose.model('Report', new Schema({
  reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['post', 'user', 'comment', 'video'], required: true },
  target: { type: Schema.Types.ObjectId, required: true },
  reason: { type: String, required: true, maxlength: 500 },
  status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open', index: true },
}, { timestamps: true }));
