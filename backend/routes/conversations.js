const router = require('express').Router();
const c = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
router.use(protect);
router.get('/', c.conversations);
router.post('/:id/read', c.markRead);
module.exports = router;
