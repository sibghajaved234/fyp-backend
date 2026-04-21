
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');
const User = require('../models/User');

// Generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, age, gender } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      age,
      gender
    });

    // Generate email verification token
    // const verificationToken = crypto.randomBytes(32).toString('hex');
    // user.emailVerificationToken = crypto
    //   .createHash('sha256')
    //   .update(verificationToken)
    //   .digest('hex');
    // await user.save();

    // // Send verification email
    // const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Verify Your Email',
    //   template: 'emailVerification',
    //   data: { name: user.name, verificationUrl }
    // });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        age: user.age,
        gender: user.gender
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last active
    user.lastActive = Date.now();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Emit socket event for online status
    const io = req.app.get('io');
    io.emit('userOnline', { userId: user._id });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        age: user.age,
        gender: user.gender,
        bloodGroup: user.bloodGroup,
        allergies: user.allergies,
        assignedDoctor: user.assignedDoctor
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('-password')
      .populate('assignedDoctor', 'name email phone')
      .populate('deviceId');

    res.json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email }).select('+otp +otpExpire +otpAttempts');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    // Send OTP via email
    await sendEmail({
      email: user.email,
      subject: 'Password Reset OTP',
      template: 'passwordResetOTP',
      data: { 
        name: user.name, 
        otp: otp, // Send plain OTP
        expiryMinutes: 10
      }
    });

    res.json({ 
      success: true, 
      message: 'OTP sent to your email',
      expiresIn: '10 minutes'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify OTP for password reset
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find user with OTP fields
    const user = await User.findOne({ email }).select(
      '+otp +otpExpire +otpAttempts'
    );

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Check if OTP exists
    if (!user.otp || !user.otpExpire) {
      return res.status(400).json({ 
        success: false,
        message: 'No OTP found. Please request a new one.' 
      });
    }

    // Check if OTP has expired
    if (user.otpExpire < Date.now()) {
      // Clear expired OTP
      user.otp = undefined;
      user.otpExpire = undefined;
      user.otpAttempts = 0;
      await user.save();

      return res.status(400).json({ 
        success: false,
        message: 'OTP has expired. Please request a new one.' 
      });
    }

    // Check maximum attempts
    if (user.otpAttempts >= 5) {
      // Clear OTP after max attempts
      user.otp = undefined;
      user.otpExpire = undefined;
      user.otpAttempts = 0;
      await user.save();

      return res.status(429).json({ 
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.' 
      });
    }

    // Verify OTP
    const isOTPValid = user.compareOTP(otp);

    if (!isOTPValid) {
      // Increment failed attempts
      user.otpAttempts += 1;
      await user.save();

      const remainingAttempts = 5 - user.otpAttempts;
      
      return res.status(400).json({ 
        success: false,
        message: `Invalid OTP. ${remainingAttempts} attempts remaining.` 
      });
    }

    // OTP is valid - don't clear OTP yet (will clear after password reset)
    // Just return success
    res.json({ 
      success: true,
      message: 'OTP verified successfully'
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during OTP verification' 
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/
// @access  Public
// Reset password after OTP verification
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Passwords do not match' 
      });
    }

    // Find user
    const user = await User.findOne({ email }).select('+otp +otpExpire');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Check if OTP was verified (by checking if OTP still exists and is valid)
    if (!user.otp || !user.otpExpire || user.otpExpire < Date.now()) {
      return res.status(400).json({ 
        success: false,
        message: 'Please verify OTP first or request a new one.' 
      });
    }

    // Update password
    user.password = newPassword;
    
    // Clear OTP fields
    user.otp = undefined;
    user.otpExpire = undefined;
    user.otpAttempts = 0;
    
    await user.save();

    res.json({ 
      success: true,
      message: 'Password reset successfully. Please login with your new password.' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during password reset' 
    });
  }
};
// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email }).select('+otp +otpExpire');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Generate new OTP
    const otp = user.generateOTP();
    await user.save();

    // Send OTP via email
    await sendEmail({
      email: user.email,
      subject: 'New Password Reset OTP',
      data: { name: user.name, otp }
    });

    console.log(`New OTP for ${email}: ${otp}`); // For testing

    res.json({ 
      success: true, 
      message: 'New OTP sent to your email',
      expiresIn: '10 minutes'
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};
// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({ emailVerificationToken });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // Emit socket event for offline status
    const io = req.app.get('io');
    io.emit('userOffline', { userId: req.userId });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  verifyOTP,
  resendOTP,
  resetPassword,
  verifyEmail,
  logout
};