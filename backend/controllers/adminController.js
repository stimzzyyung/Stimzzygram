const User = require('../models/User');
const Post = require('../models/Post');
const Video = require('../models/Video');
const Comment = require('../models/Comment');
const Report = require('../models/Report');
const Hashtag = require('../models/Hashtag');
const Story = require('../models/Story');
const { asyncHandler, httpError } = require('../middleware/error');
const { USER_BRIEF } = require('../services/helpers');

exports.stats = asyncHandler(async (req, res) => {
  const day = new Date(Date.now() - 24 * 3600 * 1000), week = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const [totalUsers, activeUsers, newUsers, totalPosts, totalVideos, openReports, flagged] = await Promise.all([
    User.countDocuments(), User.countDocuments({ lastSeen: { $gt: day } }), User.countDocuments({ createdAt: { $gt: week } }),
    Post.countDocuments(), Video.countDocuments(), Report.countDocuments({ status: 'open' }), Post.countDocuments({ isFlagged: true }),
  ]);
  res.json({ success: true, stats: { totalUsers, activeUsers, newUsers, totalPosts, totalVideos, openReports, flagged } });
});

exports.users = asyncHandler(async (req, res) => {
  const q = req.query.q ? { $or: [{ username: new RegExp(req.query.q, 'i') }, { email: new RegExp(req.query.q, 'i') }, { fullName: new RegExp(req.query.q, 'i') }] } : {};
  const users = await User.find(q).sort('-createdAt').limit(50).select('username fullName email avatar isVerified isSuspended role createdAt postsCount');
  res.json({ success: true, users });
});
exports.suspend = asyncHandler(async (req, res) => {
  const u = await User.findByIdAndUpdate(req.params.id, { isSuspended: !!req.body.suspend, $inc: { tokenVersion: 1 } }, { new: true });
  if (!u) throw httpError(404, 'User not found.');
  res.json({ success: true, user: u });
});
exports.verify = asyncHandler(async (req, res) => {
  const u = await User.findByIdAndUpdate(req.params.id, { isVerified: !!req.body.verified }, { new: true });
  res.json({ success: true, user: u });
});
exports.premiumRequests = asyncHandler(async (req, res) => {
  const users = await User.find({ premiumRequested: true }).sort('createdAt').limit(100)
    .select('username fullName email avatar premiumRequested isPremium createdAt');
  res.json({ success: true, users });
});
exports.setPremium = asyncHandler(async (req, res) => {
  if (typeof req.body.premium !== 'boolean') throw httpError(400, 'Premium status must be true or false.');
  const user = await User.findByIdAndUpdate(req.params.id, {
    isPremium: req.body.premium,
    premiumRequested: false,
  }, { new: true }).select('_id isPremium premiumRequested');
  if (!user) throw httpError(404, 'User not found.');
  res.json({ success: true, user });
});
exports.deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw httpError(400, "You can't delete yourself.");
  const posts = await Post.find({ author: req.params.id }).select('_id');
  await Promise.all([Post.deleteMany({ author: req.params.id }), Video.deleteMany({ author: req.params.id }), Comment.deleteMany({ author: req.params.id }),
    Comment.deleteMany({ post: { $in: posts.map((p) => p._id) } }), Story.deleteMany({ author: req.params.id }), User.findByIdAndDelete(req.params.id)]);
  res.json({ success: true });
});

exports.reports = asyncHandler(async (req, res) => {
  const reports = await Report.find({ status: req.query.status || 'open' }).sort('-createdAt').limit(100).populate('reporter', 'username');
  const withTargets = await Promise.all(reports.map(async (r) => {
    const Model = { post: Post, video: Video, comment: Comment, user: User }[r.targetType];
    const t = Model ? await Model.findById(r.target).lean() : null;
    return { ...r.toObject(), targetPreview: t ? (t.caption || t.text || t.username || '').slice(0, 120) : '(deleted)', targetMedia: t?.media?.[0]?.url || t?.url };
  }));
  res.json({ success: true, reports: withTargets });
});
exports.resolveReport = asyncHandler(async (req, res) => {
  const r = await Report.findById(req.params.id);
  if (!r) throw httpError(404, 'Report not found.');
  if (req.body.action === 'remove_content') {
    const Model = { post: Post, video: Video, comment: Comment }[r.targetType];
    if (Model) await Model.findByIdAndDelete(r.target);
  }
  r.status = req.body.action === 'dismiss' ? 'dismissed' : 'resolved'; await r.save();
  res.json({ success: true });
});

exports.flagged = asyncHandler(async (req, res) => {
  res.json({ success: true, posts: await Post.find({ isFlagged: true }).populate('author', USER_BRIEF).limit(50) });
});
exports.flagPost = asyncHandler(async (req, res) => {
  await Post.findByIdAndUpdate(req.params.id, { isFlagged: !!req.body.flagged });
  res.json({ success: true });
});
exports.removePost = asyncHandler(async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

exports.hashtags = asyncHandler(async (req, res) => {
  res.json({ success: true, hashtags: await Hashtag.find(req.query.q ? { name: new RegExp(req.query.q, 'i') } : {}).sort('-count').limit(100) });
});
exports.banHashtag = asyncHandler(async (req, res) => {
  const h = await Hashtag.findByIdAndUpdate(req.params.id, { isBanned: !!req.body.banned }, { new: true });
  res.json({ success: true, hashtag: h });
});

const Subscription = require('../models/Subscription');
const Message = require('../models/Message');
const { getRates, updateBasePrice } = require('../services/currencyService');

exports.subscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await Subscription.find()
    .sort('-createdAt')
    .limit(50)
    .populate('userId', 'username fullName email avatar isPremium');
  res.json({ success: true, subscriptions });
});

exports.getPricingConfig = asyncHandler(async (req, res) => {
  res.json({ success: true, config: getRates() });
});

exports.updatePricingConfig = asyncHandler(async (req, res) => {
  const { basePriceNGN } = req.body;
  const updated = updateBasePrice(basePriceNGN);
  res.json({ success: true, basePriceNGN: updated });
});

exports.deleteMessage = asyncHandler(async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) throw httpError(404, 'Message not found.');
  msg.deleted = true;
  msg.text = '[Removed by admin moderation]';
  msg.mediaUrl = undefined;
  await msg.save();
  res.json({ success: true, message: 'Message moderated and removed.' });
});

