const router = require('express').Router();
const c = require('../controllers/subscriptionController');
const { protect } = require('../middleware/auth');

router.get('/pricing', protect, c.getPricing);
router.get('/status', protect, c.getStatus);
router.post('/checkout', protect, c.createCheckout);
router.post('/verify', protect, c.verifyPayment);
router.post('/cancel', protect, c.cancel);

module.exports = router;
