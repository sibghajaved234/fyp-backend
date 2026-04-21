const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');

// CRUD routes
router.post('/', medicineController.createMedicine);
router.get('/', medicineController.getMedicines);
router.get('/:id', medicineController.getMedicineById);
router.put('/:id', medicineController.updateMedicine);
router.delete('/:id', medicineController.deleteMedicine);

module.exports = router;