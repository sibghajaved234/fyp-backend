const Alert = require('../models/Alert');
const User = require('../models/User');

// @desc    Get all alerts for current user
// @route   GET /api/alerts
// @access  Private
const getAlerts = async (req, res) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    const { status, severity, type, page = 1, limit = 50 } = req.query;

    let query = {};

    if (userRole === 'patient') {
      query.patientId = userId;
    } else if (userRole === 'doctor') {
      // Get all patients of this doctor
      const patients = await User.find({ 
        assignedDoctor: userId,
        role: 'patient' 
      }).select('_id');
      query.patientId = { $in: patients.map(p => p._id) };
    }

    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (type) query.type = type;

    const alerts = await Alert.find(query)
      .populate('patientId', 'name email phone age')
      .populate('doctorId', 'name')
      .populate('acknowledgedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Alert.countDocuments(query);

    // Get counts by status and severity
    const statusCounts = await Alert.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const severityCounts = await Alert.aggregate([
      { $match: query },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: alerts,
      counts: {
        total,
        byStatus: statusCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        bySeverity: severityCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single alert
// @route   GET /api/alerts/:id
// @access  Private
const getAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    const alert = await Alert.findById(id)
      .populate('patientId', 'name email phone age')
      .populate('doctorId', 'name')
      .populate('acknowledgedBy', 'name')
      .populate('deviceId');

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    // Check authorization
    if (userRole === 'patient' && alert.patientId._id.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (userRole === 'doctor') {
      const patient = await User.findById(alert.patientId._id);
      if (patient.assignedDoctor?.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update alert
// @route   PATCH /api/alerts/:id
// @access  Private
const updateAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.userId;
    const userRole = req.userRole;

    const alert = await Alert.findById(id).populate('patientId');

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    // Check authorization
    if (userRole === 'patient' && alert.patientId._id.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (userRole === 'doctor') {
      const patient = await User.findById(alert.patientId._id);
      if (patient.assignedDoctor?.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }

    // Update alert
    if (status) {
      alert.status = status;
      if (status === 'acknowledged') {
        alert.acknowledgedBy = userId;
        alert.acknowledgedAt = new Date();
      } else if (status === 'resolved') {
        alert.resolvedAt = new Date();
      }
    }

    if (notes) {
      alert.actions.push({
        type: 'note',
        action: notes,
        performedBy: userId,
        performedAt: new Date()
      });
    }

    await alert.save();

    // Emit WebSocket event
    const io = req.app.get('io');
    io.to(`patient-${alert.patientId._id}`).emit('alertUpdated', {
      alertId: alert._id,
      status: alert.status
    });

    if (alert.patientId.assignedDoctor) {
      io.to(`doctor-${alert.patientId.assignedDoctor}`).emit('alertUpdated', {
        alertId: alert._id,
        status: alert.status,
        patientId: alert.patientId._id
      });
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete alert
// @route   DELETE /api/alerts/:id
// @access  Private (Admin/Doctor only)
const deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.userRole;

    if (userRole !== 'doctor' && userRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const alert = await Alert.findById(id);

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    await alert.remove();

    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get unread alerts count
// @route   GET /api/alerts/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;

    let query = { status: 'unread' };

    if (userRole === 'patient') {
      query.patientId = userId;
    } else if (userRole === 'doctor') {
      const patients = await User.find({ 
        assignedDoctor: userId,
        role: 'patient' 
      }).select('_id');
      query.patientId = { $in: patients.map(p => p._id) };
    }

    const count = await Alert.countDocuments(query);

    res.json({
      success: true,
      data: { unreadCount: count }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark multiple alerts as read
// @route   POST /api/alerts/mark-read
// @access  Private
const markMultipleAsRead = async (req, res) => {
  try {
    const { alertIds } = req.body;
    const userId = req.userId;

    const result = await Alert.updateMany(
      { _id: { $in: alertIds } },
      { 
        status: 'read',
        $push: {
          actions: {
            type: 'bulk_read',
            performedBy: userId,
            performedAt: new Date()
          }
        }
      }
    );

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAlerts,
  getAlert,
  updateAlert,
  deleteAlert,
  getUnreadCount,
  markMultipleAsRead
};