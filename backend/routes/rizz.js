const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/rizzController');
const { protect } = require('../middleware/auth');
router.use(protect);
// AI calls cost money: 30 per 10 minutes per user
const limiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 30, keyGenerator: (req) => String(req.user._id), validate: false,
  message: { success: false, message: 'Slow down! Rizz Bot needs a breather. Try again in a few minutes.' } });
router.post('/chat', limiter, c.chat);
router.get('/history', c.history);
router.delete('/history', c.clear);
router.delete('/history/:id', c.clear);
module.exports = router;
