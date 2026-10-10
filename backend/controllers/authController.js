const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { asyncHandler, httpError } = require('../middleware/error');
const { uploadFile } = require('../services/upload');
const { sendVerificationCode, sendPasswordResetOtp } = require('../services/email');

const sign = (u) => jwt.sign({ id: u._id, v: u.tokenVersion }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });
const clean = (u) => {
  const o = u.toObject();
  delete o.password;
  delete o.resetTokenHash;
  delete o.resetTokenExpires;
  delete o.emailVerificationHash;
  delete o.emailVerificationExpires;
  return o;
};

exports.register = asyncHandler(async (req, res) => {
  const { fullName, username, email, password, dateOfBirth, country, language } = req.body;
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedUsername = username.toLowerCase().trim();
  if (await User.exists({ username: normalizedUsername })) throw httpError(409, 'Username already exists.');
  if (await User.exists({ email: normalizedEmail })) throw httpError(409, 'An account with this email already exists.');
  const age = (Date.now() - new Date(dateOfBirth)) / (365.25 * 24 * 3600 * 1000);
  if (age < 13) throw httpError(400, 'You must be at least 13 years old to join.');

  const code = String(crypto.randomInt(100000, 1000000));
  const emailVerificationHash = crypto.createHash('sha256').update(code).digest('hex');
  const emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
  let avatar = '';
  if (req.file) avatar = (await uploadFile(req.file, req)).url;
  await sendVerificationCode(normalizedEmail, code);
  await User.create({
    fullName,
    username: normalizedUsername,
    email: normalizedEmail,
    dateOfBirth,
    country,
    language,
    avatar,
    password: await bcrypt.hash(password, 12),
    emailVerified: false,
    emailVerificationHash,
    emailVerificationExpires,
  });
  res.status(201).json({ success: true, email: normalizedEmail, message: 'Verification code sent to your email.' });
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase().trim();
  const code = req.body.code.trim();
  const emailVerificationHash = crypto.createHash('sha256').update(code).digest('hex');
  const user = await User.findOne({
    email,
    emailVerified: false,
    emailVerificationHash,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationHash +emailVerificationExpires');
  if (!user) throw httpError(400, 'The verification code is invalid or expired.');
  user.emailVerified = true;
  user.emailVerificationHash = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
  res.json({ success: true, token: sign(user), user: clean(user) });
});

exports.resendVerification = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase().trim();
  const user = await User.findOne({ email }).select('+emailVerificationHash +emailVerificationExpires');
  if (user && !user.emailVerified) {
    const code = String(crypto.randomInt(100000, 1000000));
    await sendVerificationCode(email, code);
    user.emailVerificationHash = crypto.createHash('sha256').update(code).digest('hex');
    user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
  }
  res.json({ success: true, message: 'If the address belongs to an unverified account, a new code has been sent.' });
});

exports.login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const id = identifier.toLowerCase().trim();
  const user = await User.findOne({ $or: [{ email: id }, { username: id }] }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) throw httpError(401, 'Invalid email/username or password.');
  if (user.emailVerified === false) throw httpError(403, 'Verify your email address before logging in.');
  if (user.isSuspended) throw httpError(403, 'This account is suspended.');
  user.loginActivity = [{ ip: req.ip, device: req.headers['user-agent'] }, ...user.loginActivity].slice(0, 20);
  user.lastSeen = new Date();
  await user.save();
  res.json({ success: true, token: sign(user), user: clean(user) });
});

exports.logout = asyncHandler(async (req, res) => {
  if (req.user && req.body.pushToken === undefined) await User.findByIdAndUpdate(req.user._id, { pushToken: null });
  res.json({ success: true });
});

exports.logoutAll = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 }, pushToken: null });
  res.json({ success: true, message: 'Logged out on all devices.' });
});

exports.me = asyncHandler(async (req, res) => res.json({ success: true, user: clean(req.user) }));

exports.forgotPassword = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase().trim();
  const user = await User.findOne({ email });
  if (user) {
    const otp = String(crypto.randomInt(100000, 1000000)); // 6-digit numeric OTP
    user.resetTokenHash = crypto.createHash('sha256').update(otp).digest('hex');
    user.resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();
    await sendPasswordResetOtp(user.email, otp);
  }
  res.json({ success: true, message: 'If that email exists, an OTP verification code has been sent.' });
});

exports.verifyResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw httpError(400, 'Email and OTP code are required.');
  const hash = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    resetTokenHash: hash,
    resetTokenExpires: { $gt: Date.now() },
  });
  if (!user) throw httpError(400, 'Invalid or expired OTP verification code.');
  res.json({ success: true, message: 'OTP verified successfully.' });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { email, token, otp, password, confirmPassword } = req.body;
  const code = String(otp || token || '').trim();
  if (!code) throw httpError(400, 'OTP code is required.');
  if (confirmPassword && password !== confirmPassword) {
    throw httpError(400, 'Passwords do not match.');
  }
  if (!password || password.length < 8) {
    throw httpError(400, 'Password must be at least 8 characters.');
  }

  const hash = crypto.createHash('sha256').update(code).digest('hex');
  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    resetTokenHash: hash,
    resetTokenExpires: { $gt: Date.now() },
  });
  if (!user) throw httpError(400, 'Invalid or expired reset code.');
  user.password = await bcrypt.hash(password, 12);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  user.tokenVersion += 1;
  await user.save();
  res.json({ success: true, message: 'Password updated successfully. Please log in.' });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await bcrypt.compare(req.body.currentPassword, user.password))) throw httpError(400, 'Current password is incorrect.');
  user.password = await bcrypt.hash(req.body.newPassword, 12);
  await user.save();
  res.json({ success: true, message: 'Password changed.' });
});
