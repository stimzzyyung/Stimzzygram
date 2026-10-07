const router = require('express').Router();
const c = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.get('/', c.conversations);
router.post('/group', upload.single('picture'), c.createGroup);
router.put('/:id/group', upload.single('picture'), c.updateGroup);
router.post('/:id/members', c.addGroupMembers);
router.delete('/:id/members/:userId', c.removeGroupMember);
router.post('/:id/read', c.markRead);

module.exports = router;
