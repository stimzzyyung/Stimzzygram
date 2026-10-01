const router = require('express').Router();
const { body } = require('express-validator');
const c = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/error');
const upload = require('../middleware/upload');

router.post('/register', upload.single('avatar'), [
  body('fullName').trim().notEmpty().withMessage('Full name is required.'),
  body('username').trim().matches(/^[A-Za-z0-9._]{3,30}$/).withMessage('Username must be 3-30 letters, numbers, dots or underscores.'),
  body('email').isEmail().withMessage('Enter a valid email.').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('dateOfBirth').isISO8601().withMessage('Enter a valid date of birth.'),
], validate, c.register);
router.post('/login', [body('identifier').notEmpty().withMessage('Email or username is required.'), body('password').notEmpty().withMessage('Password is required.')], validate, c.login);
router.post('/logout', protect, c.logout);
router.post('/logout-all', protect, c.logoutAll);
router.get('/me', protect, c.me);
router.post('/forgot-password', [body('email').isEmail().withMessage('Enter a valid email.')], validate, c.forgotPassword);
router.post('/reset-password', [body('email').isEmail(), body('token').notEmpty().withMessage('Reset code is required.'), body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')], validate, c.resetPassword);
router.put('/change-password', protect, [body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')], validate, c.changePassword);
module.exports = router;
