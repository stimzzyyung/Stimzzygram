const router = require('express').Router();
const c = require('../controllers/postController');
const { protect } = require('../middleware/auth');
router.use(protect);
router.get('/trending', c.trendingHashtags);
router.get('/:name', c.byHashtag);
module.exports = router;
