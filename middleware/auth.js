const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from token
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(401).json({ message: 'Not authorized' });
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ 
        message: `Role ${req.userRole} is not authorized to access this route` 
      });
    }
    next();
  };
};

// Device authentication middleware
const authenticateDevice = async (req, res, next) => {
  try {
    const deviceToken = req.headers['x-device-token'];
    
    if (!deviceToken || deviceToken !== process.env.DEVICE_AUTH_TOKEN) {
      return res.status(401).json({ message: 'Invalid device token' });
    }
    
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID required' });
    }
    
    req.deviceId = deviceId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Device authentication failed' });
  }
};

module.exports = { protect, authorize, authenticateDevice };