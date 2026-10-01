const Follow = require('../models/Follow');
const User = require('../models/User');
const Like = require('../models/Like');
const SavedPost = require('../models/SavedPost');

exports.USER_BRIEF = 'username fullName avatar isVerified isPrivate';

exports.recountFollows = async (...ids) => {
  for (const id of ids) {
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: id, status: 'accepted' }),
      Follow.countDocuments({ follower: id, status: 'accepted' }),
    ]);
    await User.findByIdAndUpdate(id, { followersCount, followingCount });
  }
};

exports.followingIds = async (userId) =>
  (await Follow.find({ follower: userId, status: 'accepted' }).select('following')).map((f) => String(f.following));

/** Does `permission` ('everyone'|'followers'|'none') allow viewer to act on owner? */
exports.allowed = async (permission, ownerId, viewerId) => {
  if (String(ownerId) === String(viewerId) || permission === 'everyone') return true;
  if (permission === 'none') return false;
  return !!(await Follow.exists({ follower: viewerId, following: ownerId, status: 'accepted' }));
};

/** Post/story visibility check. `author` must have isPrivate + closeFriends loaded. */
exports.canSee = (item, author, viewerId, followingSet) => {
  const v = String(viewerId), a = String(author._id);
  if (a === v) return true;
  if (author.blocked?.some((b) => String(b) === v)) return false;
  const follows = followingSet.has(a);
  if (author.isPrivate && !follows) return false;
  if (item.visibility === 'followers') return follows;
  if (item.visibility === 'close_friends') return !!author.closeFriends?.some((c) => String(c) === v);
  return true;
};

exports.decoratePosts = async (posts, userId) => {
  const ids = posts.map((p) => p._id);
  const [likes, saves] = await Promise.all([
    Like.find({ user: userId, target: { $in: ids } }).select('target'),
    SavedPost.find({ user: userId, post: { $in: ids } }).select('post'),
  ]);
  const liked = new Set(likes.map((l) => String(l.target)));
  const saved = new Set(saves.map((s) => String(s.post)));
  return posts.map((p) => ({ ...(p.toObject ? p.toObject() : p), liked: liked.has(String(p._id)), saved: saved.has(String(p._id)) }));
};
