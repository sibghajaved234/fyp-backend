const moment = require('moment');
const crypto = require('crypto');
const constants = require('./constants');

// Date and time helpers
const formatDate = (date, format = 'YYYY-MM-DD') => {
  return moment(date).format(format);
};

const formatDateTime = (date, format = 'YYYY-MM-DD HH:mm') => {
  return moment(date).format(format);
};

const formatTime = (time, format = 'HH:mm') => {
  return moment(time, format).format('hh:mm A');
};

const getAge = (birthDate) => {
  return moment().diff(moment(birthDate), 'years');
};

const getDateRange = (startDate, endDate) => {
  const dates = [];
  let currentDate = moment(startDate);
  const lastDate = moment(endDate);
  
  while (currentDate <= lastDate) {
    dates.push(currentDate.format('YYYY-MM-DD'));
    currentDate = currentDate.add(1, 'day');
  }
  
  return dates;
};

const isWithinDays = (date, days) => {
  const compareDate = moment().subtract(days, 'days');
  return moment(date).isAfter(compareDate);
};

// Health calculation helpers
const calculateBMI = (weight, height) => {
  if (!weight || !height) return null;
  const heightInMeters = height / 100;
  return (weight / (heightInMeters * heightInMeters)).toFixed(1);
};

const getBMICategory = (bmi) => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

const calculateMAP = (systolic, diastolic) => {
  // Mean Arterial Pressure
  return diastolic + (systolic - diastolic) / 3;
};

const calculateHeartRateVariability = (heartRates) => {
  // Simple HRV calculation (RMSSD)
  if (heartRates.length < 2) return 0;
  
  let sum = 0;
  for (let i = 1; i < heartRates.length; i++) {
    const diff = heartRates[i] - heartRates[i - 1];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum / (heartRates.length - 1));
};

// Health status helpers
const getHeartRateStatus = (hr) => {
  const { HEALTH_THRESHOLDS } = constants;
  
  if (!hr) return { status: 'unknown', color: '#95a5a6', message: 'No data' };
  
  if (hr < HEALTH_THRESHOLDS.HEART_RATE.CRITICAL_MIN || 
      hr > HEALTH_THRESHOLDS.HEART_RATE.CRITICAL_MAX) {
    return { status: 'critical', color: '#e74c3c', message: 'Critical' };
  }
  
  if (hr < HEALTH_THRESHOLDS.HEART_RATE.WARNING_MIN || 
      hr > HEALTH_THRESHOLDS.HEART_RATE.WARNING_MAX) {
    return { status: 'warning', color: '#f39c12', message: 'Warning' };
  }
  
  if (hr >= HEALTH_THRESHOLDS.HEART_RATE.NORMAL_MIN && 
      hr <= HEALTH_THRESHOLDS.HEART_RATE.NORMAL_MAX) {
    return { status: 'normal', color: '#2ecc71', message: 'Normal' };
  }
  
  return { status: 'unknown', color: '#95a5a6', message: 'Check' };
};

const getBloodPressureStatus = (systolic, diastolic) => {
  const { HEALTH_THRESHOLDS } = constants;
  
  if (!systolic || !diastolic) {
    return { status: 'unknown', color: '#95a5a6', message: 'No data' };
  }

  if (systolic >= HEALTH_THRESHOLDS.BLOOD_PRESSURE.SYSTOLIC.CRITICAL_MIN ||
      diastolic >= HEALTH_THRESHOLDS.BLOOD_PRESSURE.DIASTOLIC.CRITICAL_MIN) {
    return { status: 'critical', color: '#e74c3c', message: 'Critical' };
  }
  
  if (systolic >= HEALTH_THRESHOLDS.BLOOD_PRESSURE.SYSTOLIC.HIGH_MIN ||
      diastolic >= HEALTH_THRESHOLDS.BLOOD_PRESSURE.DIASTOLIC.HIGH_MIN) {
    return { status: 'high', color: '#f39c12', message: 'High' };
  }
  
  if (systolic >= HEALTH_THRESHOLDS.BLOOD_PRESSURE.SYSTOLIC.ELEVATED_MIN ||
      diastolic >= HEALTH_THRESHOLDS.BLOOD_PRESSURE.DIASTOLIC.ELEVATED_MIN) {
    return { status: 'elevated', color: '#f39c12', message: 'Elevated' };
  }
  
  if (systolic >= HEALTH_THRESHOLDS.BLOOD_PRESSURE.SYSTOLIC.NORMAL_MIN &&
      systolic <= HEALTH_THRESHOLDS.BLOOD_PRESSURE.SYSTOLIC.NORMAL_MAX &&
      diastolic >= HEALTH_THRESHOLDS.BLOOD_PRESSURE.DIASTOLIC.NORMAL_MIN &&
      diastolic <= HEALTH_THRESHOLDS.BLOOD_PRESSURE.DIASTOLIC.NORMAL_MAX) {
    return { status: 'normal', color: '#2ecc71', message: 'Normal' };
  }
  
  if (systolic < HEALTH_THRESHOLDS.BLOOD_PRESSURE.SYSTOLIC.NORMAL_MIN ||
      diastolic < HEALTH_THRESHOLDS.BLOOD_PRESSURE.DIASTOLIC.NORMAL_MIN) {
    return { status: 'low', color: '#f39c12', message: 'Low' };
  }
  
  return { status: 'unknown', color: '#95a5a6', message: 'Check' };
};

const getOxygenStatus = (level) => {
  const { HEALTH_THRESHOLDS } = constants;
  
  if (!level) return { status: 'unknown', color: '#95a5a6', message: 'No data' };
  
  if (level < HEALTH_THRESHOLDS.OXYGEN_LEVEL.CRITICAL_MIN) {
    return { status: 'critical', color: '#e74c3c', message: 'Critical' };
  }
  
  if (level < HEALTH_THRESHOLDS.OXYGEN_LEVEL.WARNING_MIN) {
    return { status: 'warning', color: '#f39c12', message: 'Warning' };
  }
  
  if (level >= HEALTH_THRESHOLDS.OXYGEN_LEVEL.NORMAL_MIN) {
    return { status: 'normal', color: '#2ecc71', message: 'Normal' };
  }
  
  return { status: 'unknown', color: '#95a5a6', message: 'Check' };
};

const getTemperatureStatus = (temp) => {
  const { HEALTH_THRESHOLDS } = constants;
  
  if (!temp) return { status: 'unknown', color: '#95a5a6', message: 'No data' };
  
  if (temp < HEALTH_THRESHOLDS.TEMPERATURE.CRITICAL_MIN || 
      temp > HEALTH_THRESHOLDS.TEMPERATURE.CRITICAL_MAX) {
    return { status: 'critical', color: '#e74c3c', message: 'Critical' };
  }
  
  if (temp < HEALTH_THRESHOLDS.TEMPERATURE.WARNING_MIN || 
      temp > HEALTH_THRESHOLDS.TEMPERATURE.WARNING_MAX) {
    return { status: 'warning', color: '#f39c12', message: 'Warning' };
  }
  
  if (temp >= HEALTH_THRESHOLDS.TEMPERATURE.NORMAL_MIN && 
      temp <= HEALTH_THRESHOLDS.TEMPERATURE.NORMAL_MAX) {
    return { status: 'normal', color: '#2ecc71', message: 'Normal' };
  }
  
  return { status: 'unknown', color: '#95a5a6', message: 'Check' };
};

// Validation helpers
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePhone = (phone) => {
  const re = /^[0-9]{10}$/;
  return re.test(phone);
};

const validatePassword = (password) => {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasNonalphas = /\W/.test(password);
  
  return {
    isValid: password.length >= 8 && hasUpperCase && hasLowerCase && hasNumbers,
    strength: password.length >= 12 && hasUpperCase && hasLowerCase && hasNumbers && hasNonalphas ? 'strong' :
              password.length >= 8 && hasUpperCase && hasLowerCase && hasNumbers ? 'medium' : 'weak',
    checks: {
      length: password.length >= 8,
      upperCase: hasUpperCase,
      lowerCase: hasLowerCase,
      numbers: hasNumbers,
      special: hasNonalphas
    }
  };
};

// Token generation
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

const generateOTP = (length = 6) => {
  return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
};

// Pagination helper
const paginateResults = (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return { skip, limit: parseInt(limit) };
};

// Data aggregation helpers
const calculateAverage = (numbers) => {
  if (!numbers.length) return 0;
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
};

const calculateMedian = (numbers) => {
  if (!numbers.length) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const calculateMode = (numbers) => {
  const frequency = {};
  let maxFreq = 0;
  let modes = [];
  
  numbers.forEach(num => {
    frequency[num] = (frequency[num] || 0) + 1;
    if (frequency[num] > maxFreq) {
      maxFreq = frequency[num];
    }
  });
  
  for (let num in frequency) {
    if (frequency[num] === maxFreq) {
      modes.push(parseFloat(num));
    }
  }
  
  return modes;
};

// Color generation
const generateColor = (index, opacity = 1) => {
  const colors = [
    `rgba(52, 152, 219, ${opacity})`,   // Blue
    `rgba(46, 204, 113, ${opacity})`,   // Green
    `rgba(231, 76, 60, ${opacity})`,    // Red
    `rgba(241, 196, 15, ${opacity})`,   // Yellow
    `rgba(155, 89, 182, ${opacity})`,   // Purple
    `rgba(26, 188, 156, ${opacity})`,   // Turquoise
    `rgba(230, 126, 34, ${opacity})`,   // Orange
    `rgba(149, 165, 166, ${opacity})`   // Gray
  ];
  
  return colors[index % colors.length];
};

// Error handling
const createError = (message, status = 500) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const handleAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Response formatter
const formatResponse = (success, data = null, message = null, errors = null) => {
  const response = { success };
  if (data) response.data = data;
  if (message) response.message = message;
  if (errors) response.errors = errors;
  return response;
};

module.exports = {
  // Date helpers
  formatDate,
  formatDateTime,
  formatTime,
  getAge,
  getDateRange,
  isWithinDays,
  
  // Health calculations
  calculateBMI,
  getBMICategory,
  calculateMAP,
  calculateHeartRateVariability,
  
  // Health status
  getHeartRateStatus,
  getBloodPressureStatus,
  getOxygenStatus,
  getTemperatureStatus,
  
  // Validation
  validateEmail,
  validatePhone,
  validatePassword,
  
  // Token generation
  generateToken,
  generateOTP,
  
  // Pagination
  paginateResults,
  
  // Statistics
  calculateAverage,
  calculateMedian,
  calculateMode,
  
  // Utilities
  generateColor,
  createError,
  handleAsync,
  formatResponse
};