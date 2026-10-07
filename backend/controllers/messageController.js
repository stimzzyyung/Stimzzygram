const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const ScheduledMessage = require('../models/ScheduledMessage');
const Story = require('../models/Story');
const User = require('../models/User');
const mongoose = require('mongoose');
const { asyncHandler, httpError } = require('../middleware/error');
const { uploadFile } = require('../services/upload');
const { emitTo } = require('../services/socket');
const { notify } = require('../services/notify');
const { USER_BRIEF, allowed } = require('../services/helpers');
const translateText = require('../services/translation');

/** Helper to broadcast a socket event to all conversation participants */
const broadcastToConvo = async (conversationId, event, data) => {
  const convo = await Conversation.findById(conversationId).select('participants');
  if (convo && convo.participants) {
    convo.participants.forEach((p) => emitTo(p, event, data));
  }
};

/** Shared by REST and story replies */
exports.sendDirect = async ({
  from,
  to,
  conversationId,
  text = '',
  media,
  replyTo,
  forwardedFrom,
  req,
  scheduledMessageId,
  isSnap = false,
  snapTimer = 10,
}) => {
  let convo;
  if (conversationId) {
    convo = await Conversation.findOne({ _id: conversationId, participants: from._id });
    if (!convo) throw httpError(404, 'Conversation not found.');
    // If group, check permissions
    if (convo.type === 'group' && convo.groupInformation?.permissions?.onlyAdminsMessage) {
      const isAdmin = convo.groupInformation.admins.some((a) => String(a) === String(from._id));
      if (!isAdmin) throw httpError(403, 'Only admins are permitted to send messages in this group.');
    }
  } else if (to) {
    const recipient = await User.findById(to).select('privacy blocked');
    if (!recipient || recipient.blocked.includes(from._id) || from.blocked.some((b) => String(b) === String(to))) {
      throw httpError(403, 'You cannot message this user.');
    }
    if (!(await allowed(recipient.privacy.messages, to, from._id))) {
      throw httpError(403, 'This user only accepts messages from people they follow.');
    }
    convo = await Conversation.findOne({ participants: { $all: [from._id, to], $size: 2 }, type: 'direct' });
    if (!convo) convo = await Conversation.create({ participants: [from._id, to], type: 'direct' });
  } else {
    throw httpError(400, 'Recipient or conversation is required.');
  }

  let mediaUrl, mediaType, fileInfo;
  if (media) {
    const uploaded = await uploadFile(media, req);
    mediaUrl = uploaded.url;
    mediaType = uploaded.type;
    fileInfo = {
      fileName: uploaded.fileName,
      fileSize: uploaded.fileSize,
      mimeType: uploaded.mimeType,
    };
  }

  const viewOnce = req?.body?.viewOnce === 'true' || req?.body?.viewOnce === true || snapTimer === 1 || req?.body?.snapTimer === '1';
  const snap = isSnap || req?.body?.isSnap === 'true' || req?.body?.isSnap === true || viewOnce;
  const timer = viewOnce ? 1 : Number(snapTimer || req?.body?.snapTimer || 10);

  const msg = await Message.create({
    conversation: convo._id,
    sender: from._id,
    text,
    mediaUrl,
    mediaType,
    fileInfo,
    replyTo,
    forwardedFrom,
    readBy: [from._id],
    scheduledMessage: scheduledMessageId,
    isSnap: snap,
    viewOnce,
    snapTimer: timer,
    snapOpened: false,
    snapBurned: false,
    status: 'sent',
  });

  convo.lastMessage = msg._id;
  // Bump unread for other participants
  convo.participants.forEach((p) => {
    const pid = String(p);
    if (pid !== String(from._id)) {
      convo.unread.set(pid, (convo.unread.get(pid) || 0) + 1);
    }
  });
  await convo.save();

  const populated = await msg.populate([
    { path: 'sender', select: USER_BRIEF },
    { path: 'replyTo', select: 'text mediaType sender' },
    { path: 'forwardedFrom', select: USER_BRIEF },
  ]);

  // Broadcast to all participants in conversation
  convo.participants.forEach((p) => {
    emitTo(p, 'message:new', populated);
    if (String(p) !== String(from._id)) {
      notify({
        recipient: p,
        sender: from._id,
        type: 'message',
        text: snap ? 'Sent a Stimzzy Snap 🔥' : text || `Sent a ${mediaType || 'message'}`,
      });
    }
  });

  return populated;
};

exports.send = asyncHandler(async (req, res) => {
  if (!req.body.to && !req.body.conversationId) throw httpError(400, 'Recipient or conversation is required.');
  if (!req.body.text && !req.file) throw httpError(400, 'Message is empty.');

  const isSnap = req.body.isSnap === 'true' || req.body.isSnap === true;
  const snapTimer = Number(req.body.snapTimer || 10);

  const message = await exports.sendDirect({
    from: req.user,
    to: req.body.to,
    conversationId: req.body.conversationId,
    text: req.body.text,
    media: req.file,
    replyTo: req.body.replyTo,
    forwardedFrom: req.body.forwardedFrom,
    req,
    isSnap,
    snapTimer,
  });

  res.status(201).json({ success: true, message });
});

exports.forward = asyncHandler(async (req, res) => {
  const { messageId, to, conversationId } = req.body;
  if (!messageId) throw httpError(400, 'Message ID is required.');

  const original = await Message.findById(messageId).populate('sender', USER_BRIEF);
  if (!original) throw httpError(404, 'Original message not found.');

  const forwarded = await exports.sendDirect({
    from: req.user,
    to,
    conversationId,
    text: original.text,
    replyTo: null,
    forwardedFrom: original.sender._id,
    req,
    isSnap: false,
  });

  if (original.mediaUrl) {
    forwarded.mediaUrl = original.mediaUrl;
    forwarded.mediaType = original.mediaType;
    forwarded.fileInfo = original.fileInfo;
    await forwarded.save();
  }

  res.status(201).json({ success: true, message: forwarded });
});

exports.edit = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) throw httpError(400, 'Updated message text is required.');

  const msg = await Message.findOne({ _id: req.params.id, sender: req.user._id });
  if (!msg) throw httpError(404, 'Message not found or not editable.');
  if (msg.deleted) throw httpError(400, 'Cannot edit deleted message.');

  msg.text = text.trim();
  msg.isEdited = true;
  msg.editedAt = new Date();
  await msg.save();

  const populated = await msg.populate([
    { path: 'sender', select: USER_BRIEF },
    { path: 'replyTo', select: 'text mediaType sender' },
  ]);

  await broadcastToConvo(msg.conversation, 'message:update', populated);
  res.json({ success: true, message: populated });
});

exports.translate = asyncHandler(async (req, res) => {
  const { text, targetLanguage, messageId } = req.body;
  if (typeof text !== 'string' || !text.trim()) throw httpError(400, 'Enter text to translate.');
  if (text.length > 5000) throw httpError(400, 'Text must be 5,000 characters or fewer.');
  if (typeof targetLanguage !== 'string' || !targetLanguage.trim() || targetLanguage.length > 80) {
    throw httpError(400, 'Enter a valid target language.');
  }

  let translation;
  try {
    translation = await translateText(text.trim(), targetLanguage.trim());
  } catch (error) {
    throw httpError([502, 503, 504].includes(error.status) ? error.status : 502, 'Translation is temporarily unavailable. Please try again.');
  }

  if (messageId && mongoose.isValidObjectId(messageId)) {
    const msg = await Message.findById(messageId);
    if (msg) {
      if (!msg.translatedContent) msg.translatedContent = new Map();
      msg.translatedContent.set(targetLanguage.trim(), translation);
      await msg.save();
    }
  }

  res.json({ success: true, translation, targetLanguage });
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
  const list = await Conversation.find({ participants: req.user._id })
    .sort('-updatedAt')
    .limit(100)
    .populate('participants', `${USER_BRIEF} lastSeen`)
    .populate('lastMessage')
    .populate('groupInformation.admins', USER_BRIEF);

  const formatted = list.map((c) => {
    if (c.type === 'group') {
      return {
        _id: c._id,
        type: 'group',
        groupInformation: c.groupInformation,
        participants: c.participants,
        lastMessage: c.lastMessage,
        unread: c.unread.get(String(req.user._id)) || 0,
        updatedAt: c.updatedAt,
      };
    }
    const other = c.participants.find((p) => String(p._id) !== String(req.user._id));
    return {
      _id: c._id,
      type: 'direct',
      user: other,
      lastMessage: c.lastMessage,
      unread: c.unread.get(String(req.user._id)) || 0,
      updatedAt: c.updatedAt,
    };
  }).filter((c) => c.type === 'group' || c.user);

  res.json({ success: true, conversations: formatted });
});

exports.thread = asyncHandler(async (req, res) => {
  let convo;
  if (req.params.convoId) {
    convo = await Conversation.findOne({ _id: req.params.convoId, participants: req.user._id })
      .populate('participants', USER_BRIEF)
      .populate('groupInformation.admins', USER_BRIEF);
  } else if (req.params.userId) {
    convo = await Conversation.findOne({
      participants: { $all: [req.user._id, req.params.userId], $size: 2 },
      type: 'direct',
    }).populate('participants', USER_BRIEF);
  }

  if (!convo) return res.json({ success: true, messages: [], conversation: null });

  const messages = await Message.find({ conversation: convo._id })
    .sort('-createdAt')
    .limit(100)
    .populate('sender', USER_BRIEF)
    .populate('replyTo', 'text mediaType sender')
    .populate('forwardedFrom', USER_BRIEF);

  res.json({
    success: true,
    conversationId: convo._id,
    conversation: convo,
    messages: messages.reverse(),
  });
});

exports.markRead = asyncHandler(async (req, res) => {
  const convo = await Conversation.findOne({ _id: req.params.id, participants: req.user._id });
  if (!convo) throw httpError(404, 'Conversation not found.');

  await Message.updateMany(
    { conversation: convo._id, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id }, $set: { status: 'read' } }
  );

  convo.unread.set(String(req.user._id), 0);
  await convo.save();

  convo.participants.forEach((p) => {
    if (String(p) !== String(req.user._id)) {
      emitTo(p, 'message:read', { conversationId: convo._id, by: req.user._id });
    }
  });

  res.json({ success: true });
});

exports.react = asyncHandler(async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) throw httpError(404, 'Message not found.');

  msg.reactions = msg.reactions.filter((r) => String(r.user) !== String(req.user._id));
  if (req.body.emoji) msg.reactions.push({ user: req.user._id, emoji: req.body.emoji });
  await msg.save();

  await broadcastToConvo(msg.conversation, 'message:update', msg);
  res.json({ success: true, message: msg });
});

exports.remove = asyncHandler(async (req, res) => {
  const msg = await Message.findOne({ _id: req.params.id, sender: req.user._id });
  if (!msg) throw httpError(404, 'Message not found.');

  msg.deleted = true;
  msg.text = '';
  msg.mediaUrl = undefined;
  await msg.save();

  await broadcastToConvo(msg.conversation, 'message:update', msg);
  res.json({ success: true });
});

exports.openSnap = asyncHandler(async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) throw httpError(404, 'Snap not found.');
  if (!msg.isSnap && !msg.viewOnce) throw httpError(400, 'This message is not a snap or view-once media.');
  if (msg.snapBurned) throw httpError(410, 'This view-once snap has already expired and burned.');

  msg.snapOpened = true;
  msg.snapOpenedAt = new Date();
  if (!msg.readBy.some((id) => String(id) === String(req.user._id))) {
    msg.readBy.push(req.user._id);
  }
  await msg.save();

  await broadcastToConvo(msg.conversation, 'message:update', msg);
  res.json({ success: true, message: msg });
});

exports.burnSnap = asyncHandler(async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) throw httpError(404, 'Snap not found.');
  msg.snapBurned = true;
  msg.mediaUrl = '';
  await msg.save();

  await broadcastToConvo(msg.conversation, 'message:update', msg);
  res.json({ success: true, message: msg });
});

/** Group chat operations */
exports.createGroup = asyncHandler(async (req, res) => {
  const { name, description = '', memberIds = [] } = req.body;
  if (!name || !name.trim()) throw httpError(400, 'Group name is required.');

  let picture = '';
  if (req.file) {
    picture = (await uploadFile(req.file, req)).url;
  }

  const participants = Array.from(new Set([String(req.user._id), ...(Array.isArray(memberIds) ? memberIds : JSON.parse(memberIds || '[]'))]));

  const convo = await Conversation.create({
    type: 'group',
    participants,
    groupInformation: {
      name: name.trim(),
      description: description.trim(),
      picture,
      admins: [req.user._id],
      createdBy: req.user._id,
      permissions: { onlyAdminsMessage: false, onlyAdminsEditInfo: true },
      moderation: { filterProfanity: false },
    },
  });

  const populated = await convo.populate([
    { path: 'participants', select: USER_BRIEF },
    { path: 'groupInformation.admins', select: USER_BRIEF },
  ]);

  participants.forEach((p) => {
    emitTo(p, 'conversation:new', populated);
  });

  res.status(201).json({ success: true, conversation: populated });
});

exports.updateGroup = asyncHandler(async (req, res) => {
  const convo = await Conversation.findOne({ _id: req.params.id, type: 'group', participants: req.user._id });
  if (!convo) throw httpError(404, 'Group conversation not found.');

  const isAdmin = convo.groupInformation.admins.some((a) => String(a) === String(req.user._id));
  if (convo.groupInformation.permissions.onlyAdminsEditInfo && !isAdmin) {
    throw httpError(403, 'Only admins can update group information.');
  }

  const { name, description, onlyAdminsMessage, onlyAdminsEditInfo, filterProfanity } = req.body;
  if (name) convo.groupInformation.name = name.trim();
  if (description !== undefined) convo.groupInformation.description = description.trim();
  if (onlyAdminsMessage !== undefined) convo.groupInformation.permissions.onlyAdminsMessage = !!onlyAdminsMessage;
  if (onlyAdminsEditInfo !== undefined) convo.groupInformation.permissions.onlyAdminsEditInfo = !!onlyAdminsEditInfo;
  if (filterProfanity !== undefined) convo.groupInformation.moderation.filterProfanity = !!filterProfanity;

  if (req.file) {
    convo.groupInformation.picture = (await uploadFile(req.file, req)).url;
  }

  await convo.save();
  const populated = await convo.populate([
    { path: 'participants', select: USER_BRIEF },
    { path: 'groupInformation.admins', select: USER_BRIEF },
  ]);

  await broadcastToConvo(convo._id, 'conversation:update', populated);
  res.json({ success: true, conversation: populated });
});

exports.addGroupMembers = asyncHandler(async (req, res) => {
  const convo = await Conversation.findOne({ _id: req.params.id, type: 'group', participants: req.user._id });
  if (!convo) throw httpError(404, 'Group conversation not found.');

  const { memberIds = [] } = req.body;
  const newMembers = Array.isArray(memberIds) ? memberIds : [memberIds];
  newMembers.forEach((id) => {
    if (!convo.participants.some((p) => String(p) === String(id))) {
      convo.participants.push(id);
    }
  });

  await convo.save();
  const populated = await convo.populate([
    { path: 'participants', select: USER_BRIEF },
    { path: 'groupInformation.admins', select: USER_BRIEF },
  ]);

  await broadcastToConvo(convo._id, 'conversation:update', populated);
  res.json({ success: true, conversation: populated });
});

exports.removeGroupMember = asyncHandler(async (req, res) => {
  const convo = await Conversation.findOne({ _id: req.params.id, type: 'group', participants: req.user._id });
  if (!convo) throw httpError(404, 'Group conversation not found.');

  const targetId = req.params.userId;
  const isAdmin = convo.groupInformation.admins.some((a) => String(a) === String(req.user._id));
  const isSelf = String(targetId) === String(req.user._id);

  if (!isAdmin && !isSelf) throw httpError(403, 'Only admins can remove other members.');

  convo.participants = convo.participants.filter((p) => String(p) !== String(targetId));
  convo.groupInformation.admins = convo.groupInformation.admins.filter((a) => String(a) !== String(targetId));
  await convo.save();

  const populated = await convo.populate([
    { path: 'participants', select: USER_BRIEF },
    { path: 'groupInformation.admins', select: USER_BRIEF },
  ]);

  await broadcastToConvo(convo._id, 'conversation:update', populated);
  emitTo(targetId, 'conversation:removed', { conversationId: convo._id });

  res.json({ success: true, conversation: populated });
});

exports.searchConversationMessages = asyncHandler(async (req, res) => {
  const { convoId } = req.params;
  const { q } = req.query;
  if (!q || !q.trim()) return res.json({ success: true, messages: [] });

  const messages = await Message.find({
    conversation: convoId,
    deleted: false,
    text: new RegExp(q.trim(), 'i'),
  })
    .sort('-createdAt')
    .limit(30)
    .populate('sender', USER_BRIEF);

  res.json({ success: true, messages });
});

exports.quickShare = asyncHandler(async (req, res) => {
  if (!req.file) throw httpError(400, 'Please select a photo or video to share.');
  let recipientIds = [];
  try {
    if (req.body.recipients) {
      recipientIds = Array.isArray(req.body.recipients) ? req.body.recipients : JSON.parse(req.body.recipients);
    }
  } catch {
    recipientIds = [].concat(req.body.recipients || []);
  }

  const toStory = req.body.toStory === 'true' || req.body.toStory === true;
  const viewOnce = req.body.viewOnce === 'true' || req.body.viewOnce === true || req.body.snapTimer === '1' || req.body.snapTimer === 1;
  const isSnap = req.body.isSnap === 'true' || req.body.isSnap === true || viewOnce;
  const snapTimer = viewOnce ? 1 : Number(req.body.snapTimer || 10);
  const text = req.body.text || '';
  const filter = req.body.filter || 'none';
  const { url, type } = await uploadFile(req.file, req);

  let story = null;
  if (toStory) {
    const durationHours = Number(req.body.durationHours || 24);
    story = await Story.create({
      author: req.user._id,
      mediaUrl: url,
      mediaType: type === 'video' ? 'video' : 'image',
      text: req.body.storyText || text,
      filter,
      durationHours,
      visibility: req.body.storyVisibility || 'everyone',
      expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000),
    });
  }

  const sentMessages = [];
  for (const recipientId of recipientIds) {
    try {
      const recipient = await User.findById(recipientId).select('privacy blocked');
      if (!recipient || recipient.blocked.includes(req.user._id) || req.user.blocked.some((b) => String(b) === String(recipientId))) continue;
      let convo = await Conversation.findOne({ participants: { $all: [req.user._id, recipientId], $size: 2 }, type: 'direct' });
      if (!convo) convo = await Conversation.create({ participants: [req.user._id, recipientId], type: 'direct' });
      const msg = await Message.create({
        conversation: convo._id,
        sender: req.user._id,
        text,
        mediaUrl: url,
        mediaType: type === 'video' ? 'video' : 'image',
        readBy: [req.user._id],
        isSnap,
        viewOnce,
        snapTimer,
        snapOpened: false,
        snapBurned: false,
        status: 'sent',
      });
      convo.lastMessage = msg._id;
      convo.unread.set(String(recipientId), (convo.unread.get(String(recipientId)) || 0) + 1);
      await convo.save();
      const populated = await msg.populate([{ path: 'sender', select: USER_BRIEF }]);
      emitTo(recipientId, 'message:new', populated);
      emitTo(req.user._id, 'message:new', populated);
      notify({ recipient: recipientId, sender: req.user._id, type: 'message', text: viewOnce ? 'Sent a View Once photo 👀' : (isSnap ? 'Sent a Stimzzy Snap 🔥' : (text || `Sent a ${type}`)) });
      sentMessages.push(populated);
    } catch {}
  }
  res.status(201).json({ success: true, count: sentMessages.length, story, messages: sentMessages });
});
