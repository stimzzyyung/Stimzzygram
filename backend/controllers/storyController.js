const Story = require('../models/Story');
const User = require('../models/User');
const { asyncHandler, httpError } = require('../middleware/error');
const { uploadFile } = require('../services/upload');
const { notify } = require('../services/notify');
const { sendDirect } = require('./messageController');
const { USER_BRIEF, followingIds, canSee } = require('../services/helpers');

exports.create = asyncHandler(async (req, res) => {
  if (!req.file) throw httpError(400, 'Please select a photo or video.');
  const durationHours = Number(req.body.durationHours || 24);
  if (![1, 6, 12, 24, 48, 72, 168].includes(durationHours)) throw httpError(400, 'Choose a valid story duration (1h, 6h, 12h, 24 hours, 2 days, 3 days or 7 days).');
  if (durationHours > 24 && !req.user.isPremium) throw httpError(403, 'Stories longer than 24 hours are available to Premium users.');
  const { url, type } = await uploadFile(req.file, req);
  const story = await Story.create({
    author: req.user._id, mediaUrl: url, mediaType: type === 'video' ? 'video' : 'image', text: req.body.text,
    filter: req.body.filter || 'none',
    durationHours,
    stickers: req.body.stickers ? [].concat(req.body.stickers) : [],
    music: req.body.musicTitle ? { title: req.body.musicTitle, artist: req.body.musicArtist } : undefined,
    visibility: req.body.visibility || (req.user.privacy?.stories === 'close_friends' ? 'close_friends' : 'everyone'),
    expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000),
  });
  res.status(201).json({ success: true, story });
});

/** Story tray: one entry per author, unviewed first, mine first. */
exports.feed = asyncHandler(async (req, res) => {
  const following = await followingIds(req.user._id);
  const ids = [...following, String(req.user._id)];
  const stories = await Story.find({ author: { $in: ids, $nin: req.user.blocked }, expiresAt: { $gt: new Date() } })
    .sort('createdAt').populate('author', `${USER_BRIEF} blocked closeFriends`);
  const set = new Set(following);
  const groups = new Map();
  for (const s of stories) {
    if (!canSee(s, s.author, req.user._id, set)) continue;
    const key = String(s.author._id);
    if (!groups.has(key)) groups.set(key, { user: { _id: s.author._id, username: s.author.username, avatar: s.author.avatar, isVerified: s.author.isVerified, avatarCustomization: s.author.avatarCustomization }, stories: [], allViewed: true });
    const g = groups.get(key);
    const viewed = s.viewers.some((v) => String(v) === String(req.user._id)) || key === String(req.user._id);
    g.stories.push({ _id: s._id, mediaUrl: s.mediaUrl, mediaType: s.mediaType, text: s.text, filter: s.filter, durationHours: s.durationHours, stickers: s.stickers, music: s.music, createdAt: s.createdAt, expiresAt: s.expiresAt, viewed,
      ...(key === String(req.user._id) ? { viewersCount: s.viewers.length, reactions: s.reactions } : {}) });
    if (!viewed) g.allViewed = false;
  }
  const mine = String(req.user._id);
  const arr = [...groups.values()].sort((a, b) => (String(a.user._id) === mine ? -1 : String(b.user._id) === mine ? 1 : a.allViewed - b.allViewed));
  res.json({ success: true, groups: arr });
});

exports.view = asyncHandler(async (req, res) => {
  const result = await Story.updateOne({ _id: req.params.id, expiresAt: { $gt: new Date() } }, { $addToSet: { viewers: req.user._id } });
  if (!result.matchedCount) throw httpError(404, 'Story expired.');
  res.json({ success: true });
});

exports.react = asyncHandler(async (req, res) => {
  const s = await Story.findOne({ _id: req.params.id, expiresAt: { $gt: new Date() } });
  if (!s) throw httpError(404, 'Story expired.');
  s.reactions = s.reactions.filter((r) => String(r.user) !== String(req.user._id));
  s.reactions.push({ user: req.user._id, emoji: req.body.emoji || '❤️' });
  await s.save();
  notify({ recipient: s.author, sender: req.user._id, type: 'story_reaction', text: req.body.emoji || '❤️' });
  res.json({ success: true });
});

exports.reply = asyncHandler(async (req, res) => {
  const s = await Story.findOne({ _id: req.params.id, expiresAt: { $gt: new Date() } });
  if (!s) throw httpError(404, 'Story expired.');
  const message = await sendDirect({ from: req.user, to: s.author, text: `↩️ Replied to your story: ${req.body.text}`, req });
  res.status(201).json({ success: true, message });
});

exports.remove = asyncHandler(async (req, res) => {
  const r = await Story.deleteOne({ _id: req.params.id, author: req.user._id });
  if (!r.deletedCount) throw httpError(404, 'Story not found.');
  res.json({ success: true });
});
