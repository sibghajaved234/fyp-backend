const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validate, healthRecordValidation } = require('../middleware/validation');
const {
  getDashboard,
  getHealthRecords,
  addHealthRecord,
  getPrescriptions,
  getAlerts,
  markAlertRead,
  updateProfile,
  getTodaysMedicines,
  markMedicineTaken,
  markMedicineSkipped,
  getProfile
} = require('../controllers/patientController');

// All routes require authentication and patient role
router.get('/today-medicine-all')
// TODAY'S MEDICINES ROUTES
router.get('/medicines/today', getTodaysMedicines);
router.use(protect);
router.use(authorize('patient')); 

router.get('/dashboard', getDashboard);
router.get('/health-records', getHealthRecords);
router.post('/health-records', validate(healthRecordValidation), addHealthRecord);
router.get('/prescriptions', getPrescriptions);
router.get('/alerts', getAlerts);
router.patch('/alerts/:alertId/read', markAlertRead);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// TODAY'S MEDICINES ROUTES
router.get('/medicines/today', getTodaysMedicines);
// Updated routes with prescriptionId
router.post('/prescriptions/:prescriptionId/medicines/:medicineId/times/:timeId/taken', markMedicineTaken);
router.post('/prescriptions/:prescriptionId/medicines/:medicineId/times/:timeId/skipped', markMedicineSkipped);

module.exports = router;