const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { asyncHandler, httpError } = require('../middleware/error');
const { uploadFile } = require('../services/upload');

const sign = (u) => jwt.sign({ id: u._id, v: u.tokenVersion }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });
const clean = (u) => { const o = u.toObject(); delete o.password; delete o.resetTokenHash; delete o.resetTokenExpires; return o; };

exports.register = asyncHandler(async (req, res) => {
  const { fullName, username, email, password, dateOfBirth } = req.body;
  if (await User.exists({ username: username.toLowerCase() })) throw httpError(409, 'Username already exists.');
  if (await User.exists({ email: email.toLowerCase() })) throw httpError(409, 'An account with this email already exists.');
  const age = (Date.now() - new Date(dateOfBirth)) / (365.25 * 24 * 3600 * 1000);
  if (age < 13) throw httpError(400, 'You must be at least 13 years old to join.');
  let avatar = '';
  if (req.file) avatar = (await uploadFile(req.file, req)).url;
  const user = await User.create({ fullName, username, email, dateOfBirth, avatar, password: await bcrypt.hash(password, 12) });
  res.status(201).json({ success: true, token: sign(user), user: clean(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const id = identifier.toLowerCase().trim();
  const user = await User.findOne({ $or: [{ email: id }, { username: id }] }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) throw httpError(401, 'Invalid email/username or password.');
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
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (user) {
    const token = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6-char code
    user.resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    user.resetTokenExpires = Date.now() + 15 * 60 * 1000;
    await user.save();
    // TODO: send via your email provider (SendGrid, Resend, Nodemailer...). Logged for development:
    console.log(`[DEV] Password reset code for ${user.email}: ${token}`);
  }
  res.json({ success: true, message: 'If that email exists, a reset code has been sent.' });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { email, token, password } = req.body;
  const hash = crypto.createHash('sha256').update(token.toUpperCase()).digest('hex');
  const user = await User.findOne({ email: email.toLowerCase(), resetTokenHash: hash, resetTokenExpires: { $gt: Date.now() } });
  if (!user) throw httpError(400, 'Invalid or expired reset code.');
  user.password = await bcrypt.hash(password, 12);
  user.resetTokenHash = undefined; user.resetTokenExpires = undefined; user.tokenVersion += 1;
  await user.save();
  res.json({ success: true, message: 'Password updated. Please log in.' });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await bcrypt.compare(req.body.currentPassword, user.password))) throw httpError(400, 'Current password is incorrect.');
  user.password = await bcrypt.hash(req.body.newPassword, 12);
  await user.save();
  res.json({ success: true, message: 'Password changed.' });
});
