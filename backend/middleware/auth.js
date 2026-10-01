const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Please log in to continue.' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || decoded.v !== user.tokenVersion)
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    if (user.isSuspended) return res.status(403).json({ success: false, message: 'This account is suspended.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired session.' });
  }
};

exports.adminOnly = (req, res, next) =>
  req.user?.role === 'admin' ? next() : res.status(403).json({ success: false, message: 'Admins only.' });
