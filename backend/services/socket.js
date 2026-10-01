const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;
const online = new Map(); // userId -> connection count

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

    socket.on('disconnect', async () => {
      const n = (online.get(id) || 1) - 1;
      if (n <= 0) {
        online.delete(id);
        await User.findByIdAndUpdate(id, { lastSeen: new Date() });
        io.emit('presence', { userId: id, online: false, lastSeen: new Date() });
      } else online.set(id, n);
    });
  });
  return io;
};
exports.getIO = () => io;
exports.emitTo = (userId, event, payload) => io && io.to(String(userId)).emit(event, payload);
