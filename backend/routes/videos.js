const router = require('express').Router();
const post = require('../controllers/postController');
const c = require('../controllers/videoController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);
router.get('/', c.list);
router.post('/', upload.single('video'), c.create);
router.delete('/:id', c.remove);
router.post('/:id/like', post.videoLikes.like);
router.delete('/:id/like', post.videoLikes.unlike);
router.get('/:id/comments', post.videoComments.list);
router.post('/:id/comments', post.videoComments.add);
router.delete('/:id/comments/:commentId', post.videoComments.remove);
router.post('/:id/report', (req, res, next) => { req.body.targetType = 'video'; next(); }, post.reportPost);
module.exports = router;
