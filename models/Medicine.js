const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true,
    index: true
  },
  genericName: {
    type: String,
    trim: true
  },
  brandName: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'antibiotic',
      'painkiller',
      'antihypertensive',
      'antidiabetic',
      'antacid',
      'antidepressant',
      'antihistamine',
      'antiviral',
      'antifungal',
      'vitamin',
      'supplement',
      'other'
    ],
    default: 'other'
  },
  form: {
    type: String,
    enum: ['tablet', 'capsule', 'liquid', 'injection', 'topical', 'inhaler', 'drops'],
    // required: true
  },
  strength: {
    value: Number,
    unit: {
      type: String,
      enum: ['mg', 'mcg', 'g', 'ml', 'IU']
    }
  },
  manufacturer: String,
  description: String,
  sideEffects: [String],
  warnings: [String],
  interactions: [{
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine'
    },
    description: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    }
  }],
  storage: {
    temperature: String,
    light: String,
    humidity: String
  },
  requiresPrescription: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for search
medicineSchema.index({ name: 'text', genericName: 'text', brandName: 'text' });

// Pre-save middleware
medicineSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check interaction with another medicine
medicineSchema.methods.checkInteraction = async function(otherMedicineId) {
  const interaction = this.interactions.find(
    i => i.medicineId.toString() === otherMedicineId.toString()
  );
  return interaction || null;
};

// Static method to search medicines
medicineSchema.statics.search = function(query) {
  return this.find({
    $text: { $search: query },
    isActive: true
  }).limit(20);
};

// Static method to get common medicines by category
medicineSchema.statics.getByCategory = function(category, limit = 50) {
  return this.find({ category, isActive: true }).limit(limit);
};

const Medicine = mongoose.model('Medicine', medicineSchema);

module.exports = Medicine