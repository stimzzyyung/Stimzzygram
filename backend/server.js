require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { init: initSocket } = require('./services/socket');
const scheduledMessages = require('./services/scheduledMessages');
const { notFound, errorHandler } = require('./middleware/error');

for (const k of ['MONGO_URI', 'JWT_SECRET']) if (!process.env[k]) { console.error(`Missing env var ${k}. Copy .env.example to .env`); process.exit(1); }

const app = express();
const server = http.createServer(app);
initSocket(server);

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json({ limit: '10mb' })); // Rizz screenshots are sent as base64
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many requests. Please slow down.' } }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many login attempts. Try again later.' } }));
app.use('/api/auth/forgot-password', rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { success: false, message: 'Too many reset requests. Try again later.' } }));

app.get('/api/health', (req, res) => res.json({ success: true, name: 'StimzzyVibe API' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/search', require('./routes/search'));
app.use('/api/hashtags', require('./routes/hashtags'));
app.use('/api/rizz', require('./routes/rizz'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/admin', require('./routes/admin'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
 scheduledMessages.start();
 server.listen(PORT, '0.0.0.0', () => console.log(`StimzzyVibe API running on port ${PORT}`));
})
 .catch((e) => { console.error('DB connection failed:', e.message); process.exit(1); });

module.exports = { app, server };
