const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getPatients,
  getPatientDetails,
  getPatientHealthData,
  createPrescription,
  getPrescriptions,
  getAlerts,
  updateAlertStatus,
  sendMessage,
  getPatientReport,
  addPatient,
  getDoctorDashboard,
  getPrescriptionMedicines,
  addPrescriptionMedicine,
  updatePrescriptionMedicine,
  deletePrescriptionMedicine,
  reorderPrescriptionMedicines,
  getPrescriptionById
} = require('../controllers/doctorController');

// All routes require authentication
router.use(protect);

// Patient routes - Only doctors
router.get('/patients', authorize("doctor"), getPatients);
router.get('/patients/:patientId', authorize("doctor"), getPatientDetails);
router.get('/patients/:patientId/health-data', authorize("doctor"), getPatientHealthData);
router.get('/patients/:patientId/report', authorize("doctor"), getPatientReport);

// Add patients - Only doctors
router.post("/create-patient", authorize("doctor"), addPatient);

// Prescription routes
router.post('/prescriptions', authorize("doctor"), createPrescription);
router.get('/prescriptions', authorize("doctor"), getPrescriptions);
router.get('/prescriptions/:id', protect,getPrescriptionById); // No authorize - controller handles both roles

// Alert routes - Only doctors
router.get('/alerts', authorize("doctor"), getAlerts);
router.patch('/alerts/:alertId', authorize("doctor"), updateAlertStatus);

// Message routes - Only doctors
router.post('/message', authorize("doctor"), sendMessage);

// Dashboard - Only doctors
router.get('/dashboard', authorize("doctor"), getDoctorDashboard);

// Prescription medicines routes - Only doctors (for managing medicines)
router.get('/prescriptions/:prescriptionId/medicines', authorize("doctor"), getPrescriptionMedicines);
router.post('/prescriptions/:prescriptionId/medicines', authorize("doctor"), addPrescriptionMedicine);
router.put('/prescriptions/:prescriptionId/medicines/:medicineId', authorize("doctor"), updatePrescriptionMedicine);
router.delete('/prescriptions/:prescriptionId/medicines/:medicineId', authorize("doctor"), deletePrescriptionMedicine);
router.post('/prescriptions/:prescriptionId/medicines/reorder', authorize("doctor"), reorderPrescriptionMedicines);

module.exports = router;