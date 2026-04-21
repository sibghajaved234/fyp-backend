const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Medicine name is required"],
    trim: true,
  },
  dosage: {
    type: String,
  },
  strength: {
    type: String,
  },
  form: {
    type: String,
    enum: ["tablet", "capsule", "liquid", "injection", "topical"],
    default: "tablet",
  },
  frequency: {
    type: String,
    enum: ["once-daily", "twice-daily", "thrice-daily", "as-needed"],
    required: true,
  },
  times: [
    {
      time: String,
      taken: { type: Boolean, default: false },
      takenAt: Date,
    },
  ],
  compartmentNumber: {
    type: Number,
    min: 1,
    max: 8,
  },
  quantity: Number,
  refills: {
    type: Number,
    default: 0,
  },
  instructions: String,
  warnings: [String],
});

const prescriptionSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    medicines: [medicineSchema],
    diagnosis: {
      type: String,
      required: true,
    },
    notes: String,
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Update timestamps on save
prescriptionSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Check if prescription is expired
prescriptionSchema.methods.isExpired = function () {
  return new Date() > this.endDate;
};

// Get today's medicines
prescriptionSchema.methods.getTodaysMedicines = function () {
  const now = new Date();
  return this.medicines.filter((med) => {
    return med.times.some((time) => {
      const [hours, minutes] = time.time.split(":");
      const medTime = new Date();
      medTime.setHours(hours, minutes, 0);
      return medTime > now;
    });
  });
};

// Calculate adherence rate
prescriptionSchema.methods.getAdherenceRate = function () {
  let total = 0;
  let taken = 0;

  this.medicines.forEach((med) => {
    med.times.forEach((time) => {
      total++;
      if (time.taken) taken++;
    });
  });

  return total === 0 ? 0 : (taken / total) * 100;
};

const Prescription = mongoose.model("Prescription", prescriptionSchema);
module.exports = Prescription
