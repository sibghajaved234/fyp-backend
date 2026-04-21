const { body, validationResult } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array() 
    });
  };
};

// Auth validations
const registerValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number'),
  body('role').isIn(['patient', 'doctor']).withMessage('Invalid role'),
  body('age').optional().isInt({ min: 1, max: 150 }).withMessage('Please enter a valid age')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

// Health record validations
const healthRecordValidation = [
  body('heartRate').optional().isInt({ min: 30, max: 200 }).withMessage('Heart rate must be between 30-200'),
  body('systolic').optional().isInt({ min: 70, max: 200 }).withMessage('Systolic must be between 70-200'),
  body('diastolic').optional().isInt({ min: 40, max: 130 }).withMessage('Diastolic must be between 40-130'),
  body('oxygenLevel').optional().isInt({ min: 70, max: 100 }).withMessage('Oxygen level must be between 70-100'),
  body('temperature').optional().isFloat({ min: 35, max: 42 }).withMessage('Temperature must be between 35-42°C')
];

// Prescription validations
const prescriptionValidation = [
  body('medicines').isArray({ min: 1 }).withMessage('At least one medicine is required'),
  body('medicines.*.name').notEmpty().withMessage('Medicine name is required'),
  body('medicines.*.dosage').notEmpty().withMessage('Dosage is required'),
  body('medicines.*.times').isArray().withMessage('Times are required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('diagnosis').notEmpty().withMessage('Diagnosis is required')
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  healthRecordValidation,
  prescriptionValidation
};