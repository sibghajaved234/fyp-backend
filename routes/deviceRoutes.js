const express = require('express');
const router = express.Router();

const {
  registerDevice,
  updateDeviceIP,
  getDevice,
  getSchedule,
  medicineTaken,
  unpairDevice
} = require('../controllers/deviceController');
const { protect } = require('../middleware/auth');

// 🔵 Pair device
router.post('/register', protect,registerDevice);

// 🔵 ESP32 updates IP after WiFi connect
router.post('/update-ip', updateDeviceIP);

// 🔵 Mobile fetch device
router.get('/:deviceId', getDevice);


router.delete('/:deviceId', protect, unpairDevice);



// 🔵 ESP32 fetch schedule
router.get('/:deviceId/schedule', getSchedule);

// 🔵 Medicine confirmation
router.post('/medicine-taken', medicineTaken);

module.exports = router;
