const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const c = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/error');
const upload = require('../middleware/upload');

const verificationEmailLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification email requests. Try again later.' },
});
const verificationAttemptLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification attempts. Try again later.' },
});

router.post('/register', verificationEmailLimit, upload.single('avatar'), [
  body('fullName').trim().notEmpty().withMessage('Full name is required.'),
  body('username').trim().matches(/^[A-Za-z0-9._]{3,30}$/).withMessage('Username must be 3-30 letters, numbers, dots or underscores.'),
  body('email').isEmail().withMessage('Enter a valid email.').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('dateOfBirth').isISO8601().withMessage('Enter a valid date of birth.'),
  body('country').trim().notEmpty().withMessage('Country is required.').isLength({ max: 80 }).withMessage('Country must be 80 characters or fewer.'),
  body('language').trim().notEmpty().withMessage('Preferred language is required.').isLength({ max: 80 }).withMessage('Preferred language must be 80 characters or fewer.'),
], validate, c.register);
router.post('/verify-email', verificationAttemptLimit, [
  body('email').isEmail().withMessage('Enter a valid email.').normalizeEmail(),
  body('code').matches(/^\d{6}$/).withMessage('Enter the 6-digit verification code.'),
], validate, c.verifyEmail);
router.post('/resend-verification', verificationEmailLimit, [
  body('email').isEmail().withMessage('Enter a valid email.').normalizeEmail(),
], validate, c.resendVerification);
router.post('/login', [body('identifier').notEmpty().withMessage('Email or username is required.'), body('password').notEmpty().withMessage('Password is required.')], validate, c.login);
router.post('/logout', protect, c.logout);
router.post('/logout-all', protect, c.logoutAll);
router.get('/me', protect, c.me);
router.post('/forgot-password', [body('email').isEmail().withMessage('Enter a valid email.')], validate, c.forgotPassword);
router.post('/verify-reset-otp', [
  body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('otp').matches(/^\d{6}$/).withMessage('Enter the 6-digit OTP code.'),
], validate, c.verifyResetOtp);
router.post('/reset-password', [
  body('email').isEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
], validate, c.resetPassword);
router.put('/change-password', protect, [body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')], validate, c.changePassword);
module.exports = router;
