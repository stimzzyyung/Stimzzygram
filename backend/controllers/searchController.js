const User = require('../models/User');
const Post = require('../models/Post');
const Video = require('../models/Video');
const Hashtag = require('../models/Hashtag');
const { asyncHandler } = require('../middleware/error');
const { USER_BRIEF, decoratePosts } = require('../services/helpers');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.suggest = asyncHandler(async (req, res) => {
  const q = esc((req.query.q || '').replace(/^[#@]/, '').trim());
  if (!q) return res.json({ success: true, users: [], hashtags: [] });
  const [users, hashtags] = await Promise.all([
    User.find({ $or: [{ username: new RegExp('^' + q, 'i') }, { fullName: new RegExp(q, 'i') }], _id: { $nin: req.user.blocked }, isSuspended: false }).select(USER_BRIEF).limit(6),
    Hashtag.find({ name: new RegExp('^' + q.toLowerCase()), isBanned: false }).sort('-count').limit(5),
  ]);
  res.json({ success: true, users, hashtags });
});

/** type = all | users | posts | hashtags | videos */
exports.search = asyncHandler(async (req, res) => {
  const raw = (req.query.q || '').trim();
  const q = esc(raw.replace(/^[#@]/, ''));
  const type = req.query.type || 'all';
  const out = { success: true };
  if (!q) return res.json({ ...out, users: [], posts: [], hashtags: [], videos: [] });
  const re = new RegExp(q, 'i');
  const jobs = [];
  if (['all', 'users'].includes(type)) jobs.push(User.find({ $or: [{ username: re }, { fullName: re }], _id: { $nin: req.user.blocked }, isSuspended: false }).select(USER_BRIEF + ' followersCount').sort('-followersCount').limit(30).then((r) => (out.users = r)));
  if (['all', 'hashtags'].includes(type)) jobs.push(Hashtag.find({ name: new RegExp(q.toLowerCase()), isBanned: false }).sort('-count').limit(30).then((r) => (out.hashtags = r)));
  if (['all', 'posts'].includes(type)) jobs.push(Post.find({ caption: re, visibility: 'everyone' }).sort('-likesCount').limit(40).populate('author', USER_BRIEF).then(async (r) => (out.posts = await decoratePosts(r.filter((p) => !p.author.isPrivate), req.user._id))));
  if (['all', 'videos'].includes(type)) jobs.push(Video.find({ caption: re }).sort('-createdAt').limit(30).populate('author', USER_BRIEF).then((r) => (out.videos = r.filter((v) => !v.author.isPrivate))));
  await Promise.all(jobs);
  res.json(out);
});
