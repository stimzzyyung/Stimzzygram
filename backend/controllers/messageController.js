const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const ScheduledMessage = require('../models/ScheduledMessage');
const User = require('../models/User');
const mongoose = require('mongoose');
const { asyncHandler, httpError } = require('../middleware/error');
const { uploadFile } = require('../services/upload');
const { emitTo } = require('../services/socket');
const { notify } = require('../services/notify');
const { USER_BRIEF, allowed } = require('../services/helpers');
const translateText = require('../services/translation');

/** Shared by REST and story replies. */
exports.sendDirect = async ({ from, to, text = '', media, replyTo, req, scheduledMessageId }) => {
  if (scheduledMessageId) {
    const existing = await Message.findOne({ scheduledMessage: scheduledMessageId });
    if (existing) return existing.populate([{ path: 'sender', select: USER_BRIEF }, { path: 'replyTo', select: 'text mediaType sender' }]);
  }
  const recipient = await User.findById(to).select('privacy blocked');
  if (!recipient || recipient.blocked.includes(from._id) || from.blocked.some((b) => String(b) === String(to))) throw httpError(403, 'You cannot message this user.');
  if (!(await allowed(recipient.privacy.messages, to, from._id))) throw httpError(403, 'This user only accepts messages from people they follow.');
  let convo = await Conversation.findOne({ participants: { $all: [from._id, to], $size: 2 } });
  if (!convo) convo = await Conversation.create({ participants: [from._id, to] });
  let mediaUrl, mediaType;
  if (media) ({ url: mediaUrl, type: mediaType } = await uploadFile(media, req));
  const msg = await Message.create({ conversation: convo._id, sender: from._id, text, mediaUrl, mediaType, replyTo, readBy: [from._id], scheduledMessage: scheduledMessageId });
  convo.lastMessage = msg._id;
  convo.unread.set(String(to), (convo.unread.get(String(to)) || 0) + 1);
  await convo.save();
  const populated = await msg.populate([{ path: 'sender', select: USER_BRIEF }, { path: 'replyTo', select: 'text mediaType sender' }]);
  emitTo(to, 'message:new', populated);
  emitTo(from._id, 'message:new', populated);
  notify({ recipient: to, sender: from._id, type: 'message', text: text || `Sent ${mediaType || 'a message'}` });
  return populated;
};

exports.send = asyncHandler(async (req, res) => {
  if (!req.body.to) throw httpError(400, 'Recipient is required.');
  if (!req.body.text && !req.file) throw httpError(400, 'Message is empty.');
  const message = await exports.sendDirect({ from: req.user, to: req.body.to, text: req.body.text, media: req.file, replyTo: req.body.replyTo, req });
  res.status(201).json({ success: true, message });
});

exports.translate = asyncHandler(async (req, res) => {
  const { text, targetLanguage } = req.body;
  if (typeof text !== 'string' || !text.trim()) throw httpError(400, 'Enter text to translate.');
  if (text.length > 5000) throw httpError(400, 'Text must be 5,000 characters or fewer.');
  if (typeof targetLanguage !== 'string' || !targetLanguage.trim() || targetLanguage.length > 80) throw httpError(400, 'Enter a valid target language.');
  let translation;
  try {
    translation = await translateText(text.trim(), targetLanguage.trim());
  } catch (error) {
    throw httpError([502, 503, 504].includes(error.status) ? error.status : 502, 'Translation is temporarily unavailable. Please try again.');
  }
  res.json({ success: true, translation });
});

exports.schedule = asyncHandler(async (req, res) => {
  const { to, text, scheduledAt, replyTo } = req.body;
  if (!mongoose.isValidObjectId(to)) throw httpError(400, 'A valid recipient is required.');
  if (typeof text !== 'string' || !text.trim()) throw httpError(400, 'Enter a message to schedule.');
  if (text.length > 5000) throw httpError(400, 'Message must be 5,000 characters or fewer.');
  const sendAt = new Date(scheduledAt);
  if (typeof scheduledAt !== 'string' || !Number.isFinite(sendAt.getTime()) || sendAt <= new Date()) {
    throw httpError(400, 'Choose a send time in the future.');
  }

  const recipient = await User.findById(to).select('privacy blocked');
  if (!recipient || recipient.blocked.includes(req.user._id) || req.user.blocked.some((id) => String(id) === String(to))) {
    throw httpError(403, 'You cannot message this user.');
  }
  if (!(await allowed(recipient.privacy.messages, to, req.user._id))) {
    throw httpError(403, 'This user only accepts messages from people they follow.');
  }
  if (replyTo) {
    if (!mongoose.isValidObjectId(replyTo)) throw httpError(400, 'Reply message is invalid.');
    const original = await Message.findById(replyTo).select('conversation');
    const conversation = original && await Conversation.findOne({
      _id: original.conversation,
      participants: { $all: [req.user._id, to], $size: 2 },
    });
    if (!conversation) throw httpError(400, 'Reply message is not in this conversation.');
  }

  const scheduled = await ScheduledMessage.create({
    sender: req.user._id,
    recipient: to,
    text: text.trim(),
    scheduledAt: sendAt,
    replyTo,
  });
  res.status(201).json({ success: true, scheduledMessage: { _id: scheduled._id, scheduledAt: scheduled.scheduledAt } });
});

exports.conversations = asyncHandler(async (req, res) => {
  const list = await Conversation.find({ participants: req.user._id }).sort('-updatedAt').limit(100)
    .populate('participants', `${USER_BRIEF} lastSeen`).populate('lastMessage');
  res.json({ success: true, conversations: list.map((c) => {
    const other = c.participants.find((p) => String(p._id) !== String(req.user._id));
    return { _id: c._id, user: other, lastMessage: c.lastMessage, unread: c.unread.get(String(req.user._id)) || 0, updatedAt: c.updatedAt };
  }).filter((c) => c.user) });
});

exports.thread = asyncHandler(async (req, res) => {
  const convo = await Conversation.findOne({ participants: { $all: [req.user._id, req.params.userId], $size: 2 } });
  if (!convo) return res.json({ success: true, messages: [], conversationId: null });
  const messages = await Message.find({ conversation: convo._id }).sort('-createdAt').limit(80).populate('replyTo', 'text mediaType sender');
  res.json({ success: true, conversationId: convo._id, messages: messages.reverse() });
});

exports.markRead = asyncHandler(async (req, res) => {
  const convo = await Conversation.findOne({ _id: req.params.id, participants: req.user._id });
  if (!convo) throw httpError(404, 'Conversation not found.');
  await Message.updateMany({ conversation: convo._id, readBy: { $ne: req.user._id } }, { $addToSet: { readBy: req.user._id } });
  convo.unread.set(String(req.user._id), 0); await convo.save();
  const other = convo.participants.find((p) => String(p) !== String(req.user._id));
  emitTo(other, 'message:read', { conversationId: convo._id, by: req.user._id });
  res.json({ success: true });
});

exports.react = asyncHandler(async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) throw httpError(404, 'Message not found.');
  msg.reactions = msg.reactions.filter((r) => String(r.user) !== String(req.user._id));
  if (req.body.emoji) msg.reactions.push({ user: req.user._id, emoji: req.body.emoji });
  await msg.save();
  const convo = await Conversation.findById(msg.conversation);
  convo.participants.forEach((p) => emitTo(p, 'message:update', msg));
  res.json({ success: true, message: msg });
});

exports.remove = asyncHandler(async (req, res) => {
  const msg = await Message.findOne({ _id: req.params.id, sender: req.user._id });
  if (!msg) throw httpError(404, 'Message not found.');
  msg.deleted = true; msg.text = ''; msg.mediaUrl = undefined; await msg.save();
  const convo = await Conversation.findById(msg.conversation);
  convo.participants.forEach((p) => emitTo(p, 'message:update', msg));
  res.json({ success: true });
});
