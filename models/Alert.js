const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device'
  },
  type: {
    type: String,
    enum: [
      'heart_rate_high',
      'heart_rate_low',
      'blood_pressure_high',
      'blood_pressure_low',
      'oxygen_low',
      'temperature_high',
      'missed_medicine',
      'device_offline',
      'low_battery',
      'fall_detected',
      'emergency'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical', 'emergency'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'acknowledged', 'resolved'],
    default: 'unread'
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acknowledgedAt: Date,
  resolvedAt: Date,
  expiresAt: Date,
  actions: [{
    type: String,
    action: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performedAt: Date
  }],
  notifications: {
    email: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
    sms: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Index for efficient queries
alertSchema.index({ patientId: 1, status: 1, createdAt: -1 });
alertSchema.index({ doctorId: 1, status: 1 });

// Auto-expire old alerts
alertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to acknowledge alert
alertSchema.methods.acknowledge = function(userId) {
  this.status = 'acknowledged';
  this.acknowledgedBy = userId;
  this.acknowledgedAt = new Date();
  return this.save();
};

// Method to resolve alert
alertSchema.methods.resolve = function() {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  return this.save();
};

// Static method to create alert from health reading
alertSchema.statics.createFromHealthReading = async function(reading, patient) {
  const alerts = [];
  const abnormalCheck = reading.checkAbnormal();
  
  if (abnormalCheck.isAbnormal) {
    for (const condition of abnormalCheck.conditions) {
      let alertType, severity, title, message;
      
      switch(condition) {
        case 'heartRate':
          alertType = reading.heartRate > 100 ? 'heart_rate_high' : 'heart_rate_low';
          severity = 'warning';
          title = 'Abnormal Heart Rate';
          message = `Heart rate is ${reading.heartRate} bpm`;
          break;
        case 'bloodPressure':
          alertType = reading.systolic > 140 ? 'blood_pressure_high' : 'blood_pressure_low';
          severity = 'warning';
          title = 'Abnormal Blood Pressure';
          message = `BP is ${reading.systolic}/${reading.diastolic}`;
          break;
        // Add other conditions
      }
      
      const alert = await this.create({
        patientId: reading.patientId,
        doctorId: patient.assignedDoctor,
        type: alertType,
        severity,
        title,
        message,
        data: {
          reading: reading._id,
          values: {
            heartRate: reading.heartRate,
            systolic: reading.systolic,
            diastolic: reading.diastolic
          }
        }
      });
      
      alerts.push(alert);
    }
  }
  
  return alerts;
};

module.exports = mongoose.model('Alert', alertSchema);