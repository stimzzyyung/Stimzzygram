const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
router.use(protect);
const translationLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => String(req.user._id),
  validate: false,
  message: { success: false, message: 'Translation limit reached. Try again in a few minutes.' },
});
router.post('/translate', translationLimit, c.translate);
router.post('/scheduled', c.schedule);
router.post('/quick-share', upload.single('media'), c.quickShare);
router.post('/', upload.single('media'), c.send);
router.get('/with/:userId', c.thread);
router.post('/:id/react', c.react);
router.post('/:id/open-snap', c.openSnap);
router.post('/:id/burn-snap', c.burnSnap);
router.delete('/:id', c.remove);
module.exports = router;
