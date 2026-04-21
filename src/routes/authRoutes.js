const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validate, registerValidation, loginValidation } = require('../middleware/validation');
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  logout,
  verifyOTP,
  resendOTP
} = require('../controllers/authController');

router.post('/register', validate(registerValidation), register);
router.post('/login', validate(loginValidation), login);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.get('/verify-email/:token', verifyEmail);
router.post('/logout', protect, logout);

module.exports = router;