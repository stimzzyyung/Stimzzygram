const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

const translationLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  keyGenerator: (req) => String(req.user._id),
  validate: false,
  message: { success: false, message: 'Translation limit reached. Try again in a few minutes.' },
});

router.post('/translate', translationLimit, c.translate);
router.post('/scheduled', c.schedule);
router.post('/quick-share', upload.single('media'), c.quickShare);
router.post('/forward', c.forward);
router.get('/saved-snaps', c.savedSnaps);
router.post('/', upload.single('media'), c.send);
router.get('/with/:userId', c.thread);
router.get('/conversation/:convoId', c.thread);
router.get('/conversation/:convoId/search', c.searchConversationMessages);
router.put('/:id/edit', c.edit);
router.post('/:id/react', c.react);
router.post('/:id/open-snap', c.openSnap);
router.post('/:id/burn-snap', c.burnSnap);
router.post('/:id/save-snap', c.saveSnap);
router.delete('/:id', c.remove);

module.exports = router;
