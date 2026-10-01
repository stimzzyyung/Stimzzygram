const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/error');

exports.list = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id }).sort('-createdAt').limit(80)
    .populate('sender', 'username avatar isVerified').populate('post', 'media');
  res.json({ success: true, notifications });
});
exports.unreadCount = asyncHandler(async (req, res) =>
  res.json({ success: true, count: await Notification.countDocuments({ recipient: req.user._id, read: false }) }));
exports.readAll = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
  res.json({ success: true });
});
