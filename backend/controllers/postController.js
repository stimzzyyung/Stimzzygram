const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const SavedPost = require('../models/SavedPost');
const Report = require('../models/Report');
const User = require('../models/User');
const Hashtag = require('../models/Hashtag');
const Video = require('../models/Video');
const { asyncHandler, httpError } = require('../middleware/error');
const { uploadFile } = require('../services/upload');
const { notify } = require('../services/notify');
const { extractHashtags, bumpHashtags, resolveMentions } = require('../services/hashtags');
const { USER_BRIEF, followingIds, canSee, decoratePosts, allowed } = require('../services/helpers');

const AUTHOR_FIELDS = `${USER_BRIEF} blocked closeFriends`;

exports.create = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw httpError(400, 'Please select at least one photo or video.');
  const media = [];
  for (const f of req.files) { const { url, type } = await uploadFile(f, req); media.push({ url, type }); }
  const caption = req.body.caption || '';
  const hashtags = extractHashtags(caption + ' ' + (req.body.hashtags || ''));
  let tags = req.body.tags ? [].concat(req.body.tags) : [];
  if (tags.length) { // honor each tagged user's tag privacy
    const users = await User.find({ _id: { $in: tags } }).select('privacy');
    const ok = [];
    for (const u of users) if (await allowed(u.privacy.tags, u._id, req.user._id)) ok.push(u._id);
    tags = ok;
  }
  const post = await Post.create({
    author: req.user._id, media, caption, hashtags, tags, location: req.body.location || '',
    filter: req.body.filter || 'none', visibility: req.body.visibility || 'everyone',
  });
  await Promise.all([User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: 1 } }), bumpHashtags(hashtags, 1)]);
  tags.forEach((t) => notify({ recipient: t, sender: req.user._id, type: 'mention', post: post._id, text: 'tagged you in a post' }));
  (await resolveMentions(caption)).forEach((u) => allowed(u.privacy.mentions, u._id, req.user._id).then((ok) => ok && notify({ recipient: u._id, sender: req.user._id, type: 'mention', post: post._id })));
  res.status(201).json({ success: true, post: await post.populate('author', USER_BRIEF) });
});

exports.feed = asyncHandler(async (req, res) => {
  const following = await followingIds(req.user._id);
  const ids = [...following, String(req.user._id)];
  const q = { author: { $in: ids, $nin: req.user.blocked } };
  if (req.query.before) q.createdAt = { $lt: new Date(req.query.before) };
  const posts = await Post.find(q).sort('-createdAt').limit(30).populate('author', AUTHOR_FIELDS);
  const set = new Set(following);
  const visible = posts.filter((p) => canSee(p, p.author, req.user._id, set)).slice(0, 20);
  res.json({ success: true, posts: await decoratePosts(visible, req.user._id) });
});

exports.explore = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 14 * 24 * 3600 * 1000);
  const posts = await Post.find({ visibility: 'everyone', createdAt: { $gt: since }, author: { $nin: req.user.blocked } })
    .sort({ likesCount: -1, createdAt: -1 }).limit(80).populate('author', AUTHOR_FIELDS);
  const visible = posts.filter((p) => !p.author.isPrivate);
  const trending = await Hashtag.find({ isBanned: false }).sort('-count').limit(10);
  res.json({ success: true, posts: await decoratePosts(visible, req.user._id), trending });
});

exports.getPost = asyncHandler(async (req, res) => {
  const p = await Post.findById(req.params.id).populate('author', AUTHOR_FIELDS);
  if (!p) throw httpError(404, 'Post not found.');
  if (!canSee(p, p.author, req.user._id, new Set(await followingIds(req.user._id)))) throw httpError(403, 'This post is private.');
  res.json({ success: true, post: (await decoratePosts([p], req.user._id))[0] });
});

exports.deletePost = asyncHandler(async (req, res) => {
  const p = await Post.findById(req.params.id);
  if (!p) throw httpError(404, 'Post not found.');
  if (String(p.author) !== String(req.user._id) && req.user.role !== 'admin') throw httpError(403, 'Not allowed.');
  await Promise.all([p.deleteOne(), Comment.deleteMany({ post: p._id }), Like.deleteMany({ target: p._id }), SavedPost.deleteMany({ post: p._id }),
    User.findByIdAndUpdate(p.author, { $inc: { postsCount: -1 } }), bumpHashtags(p.hashtags, -1)]);
  res.json({ success: true });
});

// ---- likes / saves (generic so Vibes reuse them) ----
const likeFactory = (Model, targetType) => ({
  like: asyncHandler(async (req, res) => {
    const item = await Model.findById(req.params.id);
    if (!item) throw httpError(404, 'Not found.');
    const r = await Like.updateOne({ user: req.user._id, targetType, target: item._id }, { $setOnInsert: {} }, { upsert: true });
    if (r.upsertedCount) { item.likesCount += 1; await item.save(); if (targetType === 'post') notify({ recipient: item.author, sender: req.user._id, type: 'like', post: item._id }); }
    res.json({ success: true, liked: true, likesCount: item.likesCount });
  }),
  unlike: asyncHandler(async (req, res) => {
    const r = await Like.deleteOne({ user: req.user._id, targetType, target: req.params.id });
    const item = await Model.findByIdAndUpdate(req.params.id, { $inc: { likesCount: r.deletedCount ? -1 : 0 } }, { new: true });
    res.json({ success: true, liked: false, likesCount: item?.likesCount || 0 });
  }),
});
exports.postLikes = likeFactory(Post, 'post');
exports.videoLikes = likeFactory(Video, 'video');

exports.save = asyncHandler(async (req, res) => {
  await SavedPost.updateOne({ user: req.user._id, post: req.params.id }, { $setOnInsert: {} }, { upsert: true });
  res.json({ success: true, saved: true });
});
exports.unsave = asyncHandler(async (req, res) => {
  await SavedPost.deleteOne({ user: req.user._id, post: req.params.id });
  res.json({ success: true, saved: false });
});

// ---- comments (generic: works for posts and videos) ----
const commentFactory = (Model) => ({
  list: asyncHandler(async (req, res) => {
    const comments = await Comment.find({ post: req.params.id }).sort('createdAt').limit(200).populate('author', USER_BRIEF);
    res.json({ success: true, comments });
  }),
  add: asyncHandler(async (req, res) => {
    const item = await Model.findById(req.params.id).populate('author', 'privacy');
    if (!item) throw httpError(404, 'Not found.');
    if (!(await allowed(item.author.privacy.comments, item.author._id, req.user._id))) throw httpError(403, 'Comments are limited on this post.');
    const c = await Comment.create({ post: item._id, author: req.user._id, text: req.body.text, parent: req.body.parent || null });
    item.commentsCount += 1; await item.save();
    if (c.parent) { const parent = await Comment.findById(c.parent); parent && notify({ recipient: parent.author, sender: req.user._id, type: 'reply', post: item._id, text: c.text }); }
    else notify({ recipient: item.author._id, sender: req.user._id, type: 'comment', post: item._id, text: c.text });
    (await resolveMentions(c.text)).forEach((u) => notify({ recipient: u._id, sender: req.user._id, type: 'mention', post: item._id, text: c.text }));
    res.status(201).json({ success: true, comment: await c.populate('author', USER_BRIEF) });
  }),
  remove: asyncHandler(async (req, res) => {
    const c = await Comment.findById(req.params.commentId);
    if (!c) throw httpError(404, 'Comment not found.');
    const item = await Model.findById(c.post);
    if (String(c.author) !== String(req.user._id) && String(item?.author) !== String(req.user._id) && req.user.role !== 'admin') throw httpError(403, 'Not allowed.');
    const removed = await Comment.deleteMany({ $or: [{ _id: c._id }, { parent: c._id }] });
    if (item) { item.commentsCount = Math.max(0, item.commentsCount - removed.deletedCount); await item.save(); }
    res.json({ success: true });
  }),
});
exports.postComments = commentFactory(Post);
exports.videoComments = commentFactory(Video);

exports.reportPost = asyncHandler(async (req, res) => {
  await Report.create({ reporter: req.user._id, targetType: req.body.targetType || 'post', target: req.params.id, reason: req.body.reason || 'Inappropriate' });
  res.status(201).json({ success: true, message: 'Thanks. Our team will review this.' });
});

exports.byHashtag = asyncHandler(async (req, res) => {
  const name = req.params.name.toLowerCase().replace('#', '');
  const tag = await Hashtag.findOne({ name });
  if (tag?.isBanned) throw httpError(404, 'This hashtag is unavailable.');
  const posts = await Post.find({ hashtags: name, visibility: 'everyone', author: { $nin: req.user.blocked } }).sort('-createdAt').limit(60).populate('author', AUTHOR_FIELDS);
  res.json({ success: true, hashtag: { name, count: tag?.count || posts.length }, posts: await decoratePosts(posts.filter((p) => !p.author.isPrivate), req.user._id) });
});
exports.trendingHashtags = asyncHandler(async (req, res) => {
  res.json({ success: true, hashtags: await Hashtag.find({ isBanned: false, count: { $gt: 0 } }).sort('-count').limit(20) });
});
