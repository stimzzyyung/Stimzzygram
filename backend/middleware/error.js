const { validationResult } = require('express-validator');

exports.asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  next();
};

exports.notFound = (req, res) => res.status(404).json({ success: false, message: 'Route not found.' });

exports.errorHandler = (err, req, res, _next) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    return res.status(409).json({ success: false, message: field === 'username' ? 'Username already exists.' : `${field} already in use.` });
  }
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ success: false, message: status === 500 ? 'Something went wrong on our side.' : err.message });
};

exports.httpError = (status, message) => Object.assign(new Error(message), { status });
