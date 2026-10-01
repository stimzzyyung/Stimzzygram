const RizzConversation = require('../models/RizzConversation');
const RizzMessage = require('../models/RizzMessage');
const { asyncHandler, httpError } = require('../middleware/error');
const { generate } = require('../services/rizzService');

exports.chat = asyncHandler(async (req, res) => {
  const { message = '', style = 'smooth', context = '', category = 'chat', conversationId, image } = req.body;
  if (!message.trim() && !image && !context.trim()) throw httpError(400, 'Tell Rizz Bot what you need help with.');

  let convo = conversationId && (await RizzConversation.findOne({ _id: conversationId, user: req.user._id }));
  if (!convo) convo = await RizzConversation.create({ user: req.user._id, title: (message || context || 'Screenshot').slice(0, 40) });
  const history = await RizzMessage.find({ conversation: convo._id }).sort('-createdAt').limit(6);

  let responses;
  try {
    responses = await generate({ message, style, context, category, image, history: history.reverse().map((h) => ({ role: h.role, content: h.role === 'bot' ? h.responses.join(' | ') : h.content })) });
  } catch (e) {
    if (e.detail) console.error('AI error:', JSON.stringify(e.detail));
    throw httpError(e.status === 503 ? 503 : 502, '🤖 Rizz Bot is unavailable right now. Please try again in a moment.');
  }
  await RizzMessage.create([
    { conversation: convo._id, role: 'user', content: message || context || '📷 Screenshot', style, category },
    { conversation: convo._id, role: 'bot', responses, style, category },
  ]);
  convo.updatedAt = new Date(); await convo.save();
  res.json({ success: true, conversationId: convo._id, responses });
});

exports.history = asyncHandler(async (req, res) => {
  if (req.query.conversationId) {
    const convo = await RizzConversation.findOne({ _id: req.query.conversationId, user: req.user._id });
    if (!convo) throw httpError(404, 'Chat not found.');
    return res.json({ success: true, messages: await RizzMessage.find({ conversation: convo._id }).sort('createdAt').limit(200) });
  }
  res.json({ success: true, conversations: await RizzConversation.find({ user: req.user._id }).sort('-updatedAt').limit(30) });
});

exports.clear = asyncHandler(async (req, res) => {
  const filter = req.params.id ? { _id: req.params.id, user: req.user._id } : { user: req.user._id };
  const convos = await RizzConversation.find(filter).select('_id');
  await RizzMessage.deleteMany({ conversation: { $in: convos.map((c) => c._id) } });
  await RizzConversation.deleteMany({ _id: { $in: convos.map((c) => c._id) } });
  res.json({ success: true });
});
