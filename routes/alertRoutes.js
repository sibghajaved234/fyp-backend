const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAlerts,
  getAlert,
  updateAlert,
  deleteAlert,
  getUnreadCount,
  markMultipleAsRead
} = require('../controllers/alertController');

router.use(protect);

router.get('/', getAlerts);
router.get('/unread-count', getUnreadCount);
router.post('/mark-read', markMultipleAsRead);
router.get('/:id', getAlert);
router.patch('/:id', updateAlert);
router.delete('/:id', deleteAlert);

module.exports = router;