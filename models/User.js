const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require("crypto")
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['patient', 'doctor'],
    required: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  age: {
    type: Number,
    min: [1, 'Age must be at least 1'],
    max: [150, 'Age cannot exceed 150']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  allergies: [{
    type: String,
    trim: true
  }],
  medicalConditions: [{
    type: String,
    trim: true
  }],
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device'
  },
  profileImage: {
    type: String,
    default: null
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    type: String,
    select: false
  },
  otpExpire: {
    type: Date,
    select: false
  },
  otpAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  emailVerificationToken: String,
  notificationPreferences: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Generate password reset token
userSchema.methods.generateResetToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};


// Add OTP generation method
userSchema.methods.generateOTP = function() {
  // Generate 4-digit OTP (from 0 to 9999) and pad with leading zeros
  const otp = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  // Hash OTP before storing (for security)
  this.otp = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');
  
  // Set OTP expiry (10 minutes)
  this.otpExpire = Date.now() + 10 * 60 * 1000;
  
  // Reset attempts
  this.otpAttempts = 0;
  
  return otp; // Return plain OTP to send via email (always 4 digits)
};
userSchema.methods.compareOTP = function(candidateOTP) {
  // Hash candidate OTP and compare with stored hash
  const hashedCandidate = crypto
    .createHash('sha256')
    .update(candidateOTP.toString())
    .digest('hex');
  
  return hashedCandidate === this.otp;
};
// Add OTP verification method
userSchema.methods.verifyOTP = function(enteredOTP) {
  // Check if OTP exists and not expired
  if (!this.otp || !this.otpExpire) {
    return { valid: false, message: 'No OTP found' };
  }
  
  if (Date.now() > this.otpExpire) {
    return { valid: false, message: 'OTP expired' };
  }
  
  // Check attempts (max 3 attempts)
  if (this.otpAttempts >= 3) {
    return { valid: false, message: 'Maximum attempts exceeded' };
  }
  
  // Hash entered OTP for comparison
  const hashedOTP = crypto
    .createHash('sha256')
    .update(enteredOTP)
    .digest('hex');
  
  // Verify OTP
  if (hashedOTP !== this.otp) {
    this.otpAttempts += 1;
    return { valid: false, message: 'Invalid OTP' };
  }
  
  // Clear OTP after successful verification
  this.otp = undefined;
  this.otpExpire = undefined;
  this.otpAttempts = 0;
  
  return { valid: true, message: 'OTP verified successfully' };
};

const User = mongoose.model('User', userSchema);

module.exports = User