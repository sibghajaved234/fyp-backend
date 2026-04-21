const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'medicine_reminder',
      'health_alert',
      'appointment',
      'message',
      'system'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending'
  },
  channel: {
    type: String,
    enum: ['push', 'email', 'sms'],
    required: true
  },
  scheduledFor: Date,
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  error: String,
  retryCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for cleanup
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days

module.exports = mongoose.model('Notification', notificationSchema);