const router = require('express').Router();
const c = require('../controllers/searchController');
const { protect } = require('../middleware/auth');
router.use(protect);
router.get('/', c.search);
router.get('/suggest', c.suggest);
module.exports = router;
