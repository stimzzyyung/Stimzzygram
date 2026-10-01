const Video = require('../models/Video');
const Like = require('../models/Like');
const User = require('../models/User');
const Follow = require('../models/Follow');
const { asyncHandler, httpError } = require('../middleware/error');
const { uploadFile } = require('../services/upload');
const { extractHashtags, bumpHashtags } = require('../services/hashtags');
const { USER_BRIEF } = require('../services/helpers');

exports.create = asyncHandler(async (req, res) => {
  if (!req.file) throw httpError(400, 'Please select a video.');
  const { url } = await uploadFile(req.file, req);
  const hashtags = extractHashtags(req.body.caption);
  const v = await Video.create({ author: req.user._id, url, caption: req.body.caption || '', hashtags,
    audio: { title: req.body.audioTitle || 'Original audio', artist: req.body.audioArtist || req.user.username } });
  await bumpHashtags(hashtags, 1);
  res.status(201).json({ success: true, video: await v.populate('author', USER_BRIEF) });
});

exports.list = asyncHandler(async (req, res) => {
  const q = { author: { $nin: req.user.blocked } };
  if (req.query.before) q.createdAt = { $lt: new Date(req.query.before) };
  const videos = await Video.find(q).sort('-createdAt').limit(15).populate('author', `${USER_BRIEF} blocked`);
  const public_ = videos.filter((v) => !v.author.isPrivate && !v.author.blocked.some((b) => String(b) === String(req.user._id)));
  const [likes, follows] = await Promise.all([
    Like.find({ user: req.user._id, targetType: 'video', target: { $in: public_.map((v) => v._id) } }),
    Follow.find({ follower: req.user._id, status: 'accepted' }),
  ]);
  const liked = new Set(likes.map((l) => String(l.target)));
  const following = new Set(follows.map((f) => String(f.following)));
  res.json({ success: true, videos: public_.map((v) => ({ ...v.toObject(), liked: liked.has(String(v._id)), following: following.has(String(v.author._id)) })) });
});

exports.remove = asyncHandler(async (req, res) => {
  const v = await Video.findById(req.params.id);
  if (!v) throw httpError(404, 'Not found.');
  if (String(v.author) !== String(req.user._id) && req.user.role !== 'admin') throw httpError(403, 'Not allowed.');
  await v.deleteOne();
  res.json({ success: true });
});
