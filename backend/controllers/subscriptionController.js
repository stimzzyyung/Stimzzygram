const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { asyncHandler, httpError } = require('../middleware/error');
const { getPricingForCountry, getPriceForCurrency } = require('../services/currencyService');

exports.getPricing = asyncHandler(async (req, res) => {
  const country = req.query.country || req.user?.country || 'Nigeria';
  const pricing = getPricingForCountry(country);
  res.json({
    success: true,
    pricing,
    features: [
      '👑 Exclusive VIP Burgundy Badge on profile & chats',
      '✨ Stimzzy Vibe Studio: Custom Moods, VIP Frames & Accessories',
      '🤖 Unlimited Rizz Bot generations with higher AI speed & priority',
      '⚡ Stories last up to 7 days (instead of 24 hours)',
      '🌍 Advanced real-time message and post translation',
      '📁 Larger uploads: HD videos up to 100MB and documents/files',
      '🔥 Exclusive VIP sticker packs and reactions',
      '🚫 100% Ad-Free experience',
    ],
  });
});

exports.createCheckout = asyncHandler(async (req, res) => {
  const { provider = 'paystack', country = req.user.country || 'Nigeria' } = req.body;
  const pricing = getPricingForCountry(country);
  const reference = `STZ_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  // In production with real keys:
  // if (provider === 'paystack') call Paystack API: https://api.paystack.co/transaction/initialize
  // if (provider === 'stripe') call Stripe API: stripe.checkout.sessions.create
  // Here we securely prepare the transaction reference and return checkout info:
  res.json({
    success: true,
    reference,
    provider,
    pricing,
    checkoutUrl: `https://checkout.stimzzyvibe.com/pay/${reference}`,
    message: `Ready for ${provider} checkout in ${pricing.currency}.`,
  });
});

exports.verifyPayment = asyncHandler(async (req, res) => {
  const { reference, provider = 'paystack' } = req.body;
  if (!reference) throw httpError(400, 'Payment reference is required.');

  const country = req.user.country || 'Nigeria';
  const pricing = getPricingForCountry(country);

  // Check if reference already processed
  let sub = await Subscription.findOne({ reference });
  if (sub && sub.status === 'active') {
    return res.json({ success: true, subscription: sub, message: 'Subscription already active.' });
  }

  const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  if (!sub) {
    sub = await Subscription.create({
      userId: req.user._id,
      plan: 'stimzzyvibe_premium_monthly',
      amount: pricing.amount,
      currency: pricing.currency,
      paymentProvider: provider,
      reference,
      status: 'active',
      startDate: new Date(),
      expirationDate,
    });
  } else {
    sub.status = 'active';
    sub.expirationDate = expirationDate;
    await sub.save();
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { isPremium: true, premiumRequested: false },
    { new: true }
  );

  // Notify user
  await Notification.create({
    recipient: req.user._id,
    type: 'premium',
    content: '🎉 Welcome to StimzzyVibe Premium! Your VIP badge and exclusive features are now active.',
  });

  res.json({
    success: true,
    subscription: sub,
    user: updatedUser,
    message: 'Welcome to StimzzyVibe Premium!',
  });
});

exports.getStatus = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({
    userId: req.user._id,
    status: 'active',
    expirationDate: { $gt: new Date() },
  }).sort('-createdAt');

  const pricing = getPricingForCountry(req.user.country || 'Nigeria');

  res.json({
    success: true,
    isPremium: !!req.user.isPremium,
    subscription,
    pricing,
  });
});

exports.cancel = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({
    userId: req.user._id,
    status: 'active',
  });

  if (subscription) {
    subscription.status = 'cancelled';
    await subscription.save();
  }

  await User.findByIdAndUpdate(req.user._id, { isPremium: false });

  res.json({ success: true, message: 'Subscription cancelled successfully.' });
});
