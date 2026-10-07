const mongoose = require('mongoose');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Post = require('../models/Post');
const Video = require('../models/Video');
const SavedPost = require('../models/SavedPost');
const Report = require('../models/Report');
const { asyncHandler, httpError } = require('../middleware/error');
const { uploadFile } = require('../services/upload');
const { notify } = require('../services/notify');
const { recountFollows, USER_BRIEF, decoratePosts, followingIds } = require('../services/helpers');

const findUser = async (idOrName) => {
  const q = mongoose.isValidObjectId(idOrName) ? { _id: idOrName } : { username: String(idOrName).toLowerCase() };
  const u = await User.findOne(q);
  if (!u) throw httpError(404, 'User not found.');
  return u;
};

exports.getUser = asyncHandler(async (req, res) => {
  const u = await findUser(req.params.id);
  const me = String(req.user._id);
  if (u.blocked.some((b) => String(b) === me)) throw httpError(404, 'User not found.');
  const [rel, back] = await Promise.all([
    Follow.findOne({ follower: me, following: u._id }), Follow.exists({ follower: u._id, following: me, status: 'accepted' }),
  ]);
  const isMe = String(u._id) === me;
  const o = u.toObject();
  ['password', 'email', 'phone', 'country', 'language', 'isPremium', 'premiumRequested', 'blocked', 'closeFriends', 'pushToken', 'loginActivity', 'resetTokenHash', 'dateOfBirth'].forEach((k) => !isMe && delete o[k]);
  res.json({ success: true, user: { ...o, isMe, isFollowing: rel?.status === 'accepted', isPending: rel?.status === 'pending', followsMe: !!back,
    isBlocked: req.user.blocked.some((b) => String(b) === String(u._id)),
    canViewContent: isMe || !u.isPrivate || rel?.status === 'accepted' } });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const allowed = ['fullName', 'bio', 'website', 'phone', 'isPrivate', 'privacy', 'notificationPrefs', 'twoFactorEnabled', 'pushToken', 'email', 'username', 'avatarCustomization', 'avatar'];
  const update = {};
  allowed.forEach((k) => req.body[k] !== undefined && (update[k] = req.body[k]));
  if (typeof update.privacy === 'string') {
    try { update.privacy = JSON.parse(update.privacy); } catch {}
  }
  if (typeof update.avatarCustomization === 'string') {
    try { update.avatarCustomization = JSON.parse(update.avatarCustomization); } catch {}
  }
  if (update.privacy) { Object.entries(update.privacy).forEach(([k, v]) => (update[`privacy.${k}`] = v)); delete update.privacy; }
  if (update.notificationPrefs) { Object.entries(update.notificationPrefs).forEach(([k, v]) => (update[`notificationPrefs.${k}`] = v)); delete update.notificationPrefs; }
  if (req.file) update.avatar = (await uploadFile(req.file, req)).url;
  const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true, runValidators: true });
  res.json({ success: true, user });
});

exports.requestPremium = asyncHandler(async (req, res) => {
  if (req.user.isPremium) throw httpError(400, 'Your account already has Premium.');
  await User.findByIdAndUpdate(req.user._id, { premiumRequested: true });
  res.json({ success: true, user: { isPremium: false, premiumRequested: true } });
});

exports.follow = asyncHandler(async (req, res) => {
  const target = await findUser(req.params.id);
  if (String(target._id) === String(req.user._id)) throw httpError(400, "You can't follow yourself.");
  if (target.blocked.includes(req.user._id)) throw httpError(403, 'You cannot follow this user.');
  const status = target.isPrivate ? 'pending' : 'accepted';
  await Follow.updateOne({ follower: req.user._id, following: target._id }, { $setOnInsert: { status } }, { upsert: true });
  await recountFollows(req.user._id, target._id);
  notify({ recipient: target._id, sender: req.user._id, type: status === 'pending' ? 'follow_request' : 'follow' });
  res.json({ success: true, status });
});

exports.unfollow = asyncHandler(async (req, res) => {
  await Follow.deleteOne({ follower: req.user._id, following: req.params.id });
  await recountFollows(req.user._id, req.params.id);
  res.json({ success: true });
});

exports.followers = asyncHandler(async (req, res) => {
  const u = await findUser(req.params.id);
  const list = await Follow.find({ following: u._id, status: 'accepted' }).populate('follower', USER_BRIEF).sort('-createdAt').limit(200);
  res.json({ success: true, users: list.map((f) => f.follower) });
});
exports.following = asyncHandler(async (req, res) => {
  const u = await findUser(req.params.id);
  const list = await Follow.find({ follower: u._id, status: 'accepted' }).populate('following', USER_BRIEF).sort('-createdAt').limit(200);
  res.json({ success: true, users: list.map((f) => f.following) });
});

exports.requests = asyncHandler(async (req, res) => {
  const list = await Follow.find({ following: req.user._id, status: 'pending' }).populate('follower', USER_BRIEF).sort('-createdAt');
  res.json({ success: true, users: list.map((f) => f.follower) });
});
exports.acceptRequest = asyncHandler(async (req, res) => {
  const f = await Follow.findOneAndUpdate({ follower: req.params.id, following: req.user._id, status: 'pending' }, { status: 'accepted' });
  if (!f) throw httpError(404, 'Request not found.');
  await recountFollows(req.user._id, req.params.id);
  notify({ recipient: req.params.id, sender: req.user._id, type: 'follow' });
  res.json({ success: true });
});
exports.rejectRequest = asyncHandler(async (req, res) => {
  await Follow.deleteOne({ follower: req.params.id, following: req.user._id, status: 'pending' });
  res.json({ success: true });
});
exports.removeFollower = asyncHandler(async (req, res) => {
  await Follow.deleteOne({ follower: req.params.id, following: req.user._id });
  await recountFollows(req.user._id, req.params.id);
  res.json({ success: true });
});

exports.block = asyncHandler(async (req, res) => {
  const target = await findUser(req.params.id);
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { blocked: target._id } });
  await Follow.deleteMany({ $or: [{ follower: req.user._id, following: target._id }, { follower: target._id, following: req.user._id }] });
  await recountFollows(req.user._id, target._id);
  res.json({ success: true });
});
exports.unblock = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $pull: { blocked: req.params.id } });
  res.json({ success: true });
});
exports.blockedList = asyncHandler(async (req, res) => {
  const u = await User.findById(req.user._id).populate('blocked', USER_BRIEF);
  res.json({ success: true, users: u.blocked });
});

exports.report = asyncHandler(async (req, res) => {
  await Report.create({ reporter: req.user._id, targetType: 'user', target: req.params.id, reason: req.body.reason || 'Reported' });
  res.status(201).json({ success: true, message: 'Thanks for letting us know.' });
});

exports.closeFriends = asyncHandler(async (req, res) => {
  const op = req.body.add ? '$addToSet' : '$pull';
  await User.findByIdAndUpdate(req.user._id, { [op]: { closeFriends: req.params.id } });
  res.json({ success: true });
});

/** tab = posts | videos | saved | tagged */
exports.userContent = asyncHandler(async (req, res) => {
  const u = await findUser(req.params.id);
  const isMe = String(u._id) === String(req.user._id);
  const tab = req.query.tab || 'posts';
  if (tab === 'saved') {
    if (!isMe) throw httpError(403, 'Only you can see saved posts.');
    const saved = await SavedPost.find({ user: u._id }).sort('-createdAt').populate({ path: 'post', populate: { path: 'author', select: USER_BRIEF } });
    return res.json({ success: true, items: await decoratePosts(saved.map((s) => s.post).filter(Boolean), req.user._id) });
  }
  const following = new Set(await followingIds(req.user._id));
  if (!isMe && u.isPrivate && !following.has(String(u._id))) return res.json({ success: true, items: [], private: true });
  const vis = isMe ? {} : { visibility: { $in: following.has(String(u._id)) ? ['everyone', 'followers'].concat(u.closeFriends.includes(req.user._id) ? ['close_friends'] : []) : ['everyone'] } };
  let items;
  if (tab === 'videos') items = await Video.find({ author: u._id }).sort('-createdAt').populate('author', USER_BRIEF).limit(60);
  else if (tab === 'tagged') items = await Post.find({ tags: u._id, ...vis }).sort('-createdAt').populate('author', USER_BRIEF).limit(60);
  else items = await Post.find({ author: u._id, ...vis }).sort('-createdAt').populate('author', USER_BRIEF).limit(60);
  res.json({ success: true, items: tab === 'videos' ? items : await decoratePosts(items, req.user._id) });
});
