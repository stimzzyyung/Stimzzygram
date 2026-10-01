const Hashtag = require('../models/Hashtag');
const User = require('../models/User');

exports.extractHashtags = (text = '') => [...new Set((text.match(/#([\p{L}\p{N}_]{1,50})/gu) || []).map((h) => h.slice(1).toLowerCase()))];
exports.extractMentions = (text = '') => [...new Set((text.match(/@([a-z0-9._]{3,30})/gi) || []).map((m) => m.slice(1).toLowerCase()))];

exports.bumpHashtags = async (tags, delta = 1) => {
  await Promise.all(tags.map((name) => Hashtag.updateOne({ name }, { $inc: { count: delta } }, { upsert: true })));
};

exports.resolveMentions = async (text) => {
  const names = exports.extractMentions(text);
  return names.length ? User.find({ username: { $in: names } }).select('_id privacy') : [];
};
