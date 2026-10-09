const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Conversation = require('../models/Conversation');

let io;
const online = new Map(); // userId -> connection count
const activeCalls = new Map();
const userCalls = new Map();
const callTimers = new Map();

function finishCall(callId, reason, endedBy) {
  const call = activeCalls.get(callId);
  if (!call) return;
  activeCalls.delete(callId);
  clearTimeout(callTimers.get(callId));
  callTimers.delete(callId);
  userCalls.delete(call.caller);
  userCalls.delete(call.callee);
  const payload = { callId, reason, endedBy };
  io.to(call.caller).emit('call:ended', payload);
  io.to(call.callee).emit('call:ended', payload);
}

exports.init = (server) => {
  io = new Server(server, { cors: { origin: process.env.CLIENT_URL || '*' } });

  io.use((socket, next) => {
    try {
      const decoded = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch { next(new Error('unauthorized')); }
  });

  io.on('connection', (socket) => {
    const id = socket.userId;
    socket.join(id);
    online.set(id, (online.get(id) || 0) + 1);
    io.emit('presence', { userId: id, online: true });

    socket.on('typing', ({ to, isTyping }) => to && io.to(to).emit('typing', { from: id, isTyping: !!isTyping }));
    socket.on('presence:check', (ids, cb) => cb && cb((ids || []).map((u) => ({ userId: u, online: online.has(u) }))));

    socket.on('call:offer', async (payload = {}, acknowledge = () => {}) => {
      try {
        const to = String(payload.to || '');
        if (!mongoose.Types.ObjectId.isValid(to) || to === String(id) || !['audio', 'video'].includes(payload.callType) ||
          !payload.offer?.type || typeof payload.offer.sdp !== 'string' || payload.offer.sdp.length > 100000) {
          return acknowledge({ success: false, message: 'Invalid call request.' });
        }
        if (userCalls.has(String(id)) || userCalls.has(to)) {
          return acknowledge({ success: false, message: 'You or this person is already on another call.' });
        }
        if (!online.has(to)) return acknowledge({ success: false, message: 'This person is offline.' });

        if (payload.conversationId) {
          const convo = await Conversation.findOne({
            _id: payload.conversationId,
            type: 'direct',
            participants: { $all: [id, to], $size: 2 },
          }).select('_id');
          if (!convo) return acknowledge({ success: false, message: 'This direct conversation could not be verified.' });
        } else if (!(await User.exists({ _id: to }))) {
          return acknowledge({ success: false, message: 'This person could not be found.' });
        }

        const callId = new mongoose.Types.ObjectId().toString();
        const caller = await User.findById(id).select('username fullName profilePicture');
        if (!caller) return acknowledge({ success: false, message: 'Your account could not be verified.' });
        if (userCalls.has(String(id)) || userCalls.has(to)) {
          return acknowledge({ success: false, message: 'You or this person is already on another call.' });
        }
        const call = { callId, caller: String(id), callee: to };
        activeCalls.set(callId, call);
        userCalls.set(call.caller, callId);
        userCalls.set(call.callee, callId);
        io.to(to).emit('call:incoming', {
          callId,
          from: String(id),
          fromUser: caller,
          conversationId: payload.conversationId || null,
          callType: payload.callType,
          offer: payload.offer,
        });
        callTimers.set(callId, setTimeout(() => finishCall(callId, 'missed', call.caller), 30000));
        acknowledge({ success: true, callId });
      } catch (error) {
        console.error('[Call] Could not start call:', error.message);
        acknowledge({ success: false, message: 'Could not start this call. Please try again.' });
      }
    });

    socket.on('call:answer', (payload = {}, acknowledge = () => {}) => {
      const call = activeCalls.get(payload.callId);
      if (!call || call.callee !== String(id) || !payload.answer?.type || typeof payload.answer.sdp !== 'string') {
        return acknowledge({ success: false, message: 'This call is no longer available.' });
      }
      clearTimeout(callTimers.get(call.callId));
      callTimers.delete(call.callId);
      io.to(call.caller).emit('call:answered', { callId: call.callId, answer: payload.answer });
      acknowledge({ success: true });
    });

    socket.on('call:ice', (payload = {}) => {
      const call = activeCalls.get(payload.callId);
      if (!call || (call.caller !== String(id) && call.callee !== String(id)) || !payload.candidate) return;
      const other = call.caller === String(id) ? call.callee : call.caller;
      io.to(other).emit('call:ice', { callId: call.callId, candidate: payload.candidate });
    });

    socket.on('call:reject', (payload = {}) => {
      const call = activeCalls.get(payload.callId);
      if (!call || call.callee !== String(id)) return;
      finishCall(call.callId, 'rejected', String(id));
    });

    socket.on('call:end', (payload = {}) => {
      const call = activeCalls.get(payload.callId);
      if (!call || (call.caller !== String(id) && call.callee !== String(id))) return;
      finishCall(call.callId, 'ended', String(id));
    });

    socket.on('disconnect', async () => {
      const n = (online.get(id) || 1) - 1;
      if (n <= 0) {
        online.delete(id);
        const callId = userCalls.get(String(id));
        if (callId) finishCall(callId, 'disconnected', String(id));
        await User.findByIdAndUpdate(id, { lastSeen: new Date() });
        io.emit('presence', { userId: id, online: false, lastSeen: new Date() });
      } else online.set(id, n);
    });
  });
  return io;
};
exports.getIO = () => io;
exports.emitTo = (userId, event, payload) => io && io.to(String(userId)).emit(event, payload);
