const router = require('express').Router();
const c = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');
router.use(protect);
router.get('/', c.list);
router.get('/unread-count', c.unreadCount);
router.post('/read-all', c.readAll);
module.exports = router;
