const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device'
  },
  // Vital signs
  heartRate: {
    type: Number,
    min: 30,
    max: 200
  },
  heartRateVariability: {
    type: Number,
    min: 0,
    max: 200
  },
  oxygenLevel: {
    type: Number,
    min: 70,
    max: 100
  },
  temperature: {
    type: Number,
    min: 35,
    max: 42
  },
  // Blood Pressure
  systolic: {
    type: Number,
    min: 70,
    max: 200
  },
  diastolic: {
    type: Number,
    min: 40,
    max: 130
  },
  map: { // Mean Arterial Pressure
    type: Number,
    min: 50,
    max: 150
  },
  // Respiratory
  respiratoryRate: {
    type: Number,
    min: 8,
    max: 30
  },
  // Activity
  steps: {
    type: Number,
    default: 0
  },
  caloriesBurned: {
    type: Number,
    default: 0
  },
  sleepHours: {
    type: Number,
    min: 0,
    max: 24
  },
  // Additional data
  notes: {
    type: String,
    maxlength: 500
  },
  tags: [String],
  isAbnormal: {
    type: Boolean,
    default: false
  },
  alertGenerated: {
    type: Boolean,
    default: false
  },
  source: {
    type: String,
    enum: ['manual', 'device', 'import'],
    default: 'manual'
  },
  recordedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
healthRecordSchema.index({ patientId: 1, recordedAt: -1 });

// Method to check if reading is abnormal
healthRecordSchema.methods.checkAbnormal = function() {
  const abnormalConditions = [];
  
  if (this.heartRate < 60 || this.heartRate > 100) {
    abnormalConditions.push('heartRate');
  }
  if (this.systolic > 140 || this.diastolic > 90) {
    abnormalConditions.push('bloodPressure');
  }
  // if (this.oxygenLevel && this.oxygenLevel < 95) {
  //   abnormalConditions.push('oxygenLevel');
  // }
  // if (this.temperature && (this.temperature < 36 || this.temperature > 37.5)) {
  //   abnormalConditions.push('temperature');
  // }
  
  this.isAbnormal = abnormalConditions.length > 0;
  return {
    isAbnormal: this.isAbnormal,
    conditions: abnormalConditions
  };
};

// Static method to get latest reading
healthRecordSchema.statics.getLatest = function(patientId) {
  return this.findOne({ patientId }).sort({ recordedAt: -1 });
};

// Static method to get readings for a date range
healthRecordSchema.statics.getForDateRange = function(patientId, startDate, endDate) {
  return this.find({
    patientId,
    recordedAt: { $gte: startDate, $lte: endDate }
  }).sort({ recordedAt: 1 });
};

module.exports = mongoose.model('HealthRecord', healthRecordSchema);