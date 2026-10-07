const mongoose = require('mongoose');
const { Schema } = mongoose;

const subscriptionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan: { type: String, default: 'stimzzyvibe_premium_monthly' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'NGN' },
  paymentProvider: { type: String, enum: ['paystack', 'flutterwave', 'stripe', 'manual', 'admin'], default: 'paystack' },
  reference: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ['active', 'pending', 'cancelled', 'expired'], default: 'active' },
  startDate: { type: Date, default: Date.now },
  expirationDate: { type: Date, required: true },
  metadata: { type: Map, of: Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
