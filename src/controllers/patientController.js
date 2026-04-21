const User = require("../models/User");
const HealthRecord = require("../models/HealthRecord");
const Prescription = require("../models/Prescription");
const Alert = require("../models/Alert");
const moment = require("moment");
const mongoose = require("mongoose");
// @desc    Get patient dashboard data
// @route   GET /api/patient/dashboard
// @access  Private (Patient)
const getDashboard = async (req, res) => {
  try {
    const patientId = req.userId;

    // Get latest health data
    const latestHealth = await HealthRecord.findOne({ patientId }).sort({
      recordedAt: -1,
    });

    // Get health records for chart (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const healthHistory = await HealthRecord.find({
      patientId,
      recordedAt: { $gte: sevenDaysAgo },
    }).sort({ recordedAt: 1 });

    // Get active prescription
    const activePrescription = await Prescription.findOne({
      patientId,
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).populate("doctorId", "name");

    // Get unread alerts count
    const unreadAlerts = await Alert.countDocuments({
      patientId,
      status: "unread",
    });

    // Calculate statistics
    const stats = {
      totalReadings: await HealthRecord.countDocuments({ patientId }),
      avgHeartRate: await HealthRecord.aggregate([
        { $match: { patientId } },
        { $group: { _id: null, avg: { $avg: "$heartRate" } } },
      ]),
      adherenceRate: activePrescription
        ? activePrescription.getAdherenceRate()
        : 0,
    };

    res.json({
      success: true,
      data: {
        latestHealth,
        healthHistory,
        activePrescription,
        unreadAlerts,
        stats,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get patient health records
// @route   GET /api/patient/health-records
// @access  Private (Patient)
const getHealthRecords = async (req, res) => {
  try {
    const patientId = req.userId;
    const { days = 30, page = 1, limit = 20 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await HealthRecord.find({
      patientId,
      recordedAt: { $gte: startDate },
    })
      .sort({ recordedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await HealthRecord.countDocuments({
      patientId,
      recordedAt: { $gte: startDate },
    });

    res.json({
      success: true,
      data: records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Add health record (manual)
// @route   POST /api/patient/health-records
// @access  Private (Patient)
const addHealthRecord = async (req, res) => {
  try {
    const patientId = req.userId;
    const healthData = req.body;

    const record = await HealthRecord.create({
      patientId,
      ...healthData,
      source: "manual",
    });

    // Check for abnormal readings
    const abnormalCheck = record.checkAbnormal();

    if (abnormalCheck.isAbnormal) {
      const patient = await User.findById(patientId);
      const alerts = await Alert.createFromHealthReading(record, patient);

      // Emit alerts
      const io = req.app.get("io");
      alerts.forEach((alert) => {
        io.to(`patient-${patientId}`).emit("healthAlert", alert);
        if (patient.assignedDoctor) {
          io.to(`doctor-${patient.assignedDoctor}`).emit("patientAlert", alert);
        }
      });
    }

    res.status(201).json({
      success: true,
      data: record,
      abnormal: abnormalCheck,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get patient prescriptions
// @route   GET /api/patient/prescriptions
// @access  Private (Patient)
const getPrescriptions = async (req, res) => {
  try {
    const patientId = req.userId;

    const prescriptions = await Prescription.find({
      patientId,
    })
      .populate("doctorId", "name email phone")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: prescriptions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get patient alerts
// @route   GET /api/patient/alerts
// @access  Private (Patient)
const getAlerts = async (req, res) => {
  try {
    const patientId = req.userId;
    const { status, limit = 50 } = req.query;

    const query = { patientId };
    if (status) query.status = status;

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Mark alert as read
// @route   PATCH /api/patient/alerts/:alertId/read
// @access  Private (Patient)
const markAlertRead = async (req, res) => {
  try {
    const { alertId } = req.params;

    const alert = await Alert.findById(alertId);
    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    alert.status = "read";
    await alert.save();

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update patient profile
// @route   PUT /api/patient/profile
// @access  Private (Patient)
const updateProfile = async (req, res) => {
  try {
    const patientId = req.userId;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates.password;
    delete updates.role;
    delete updates.email;

    const patient = await User.findByIdAndUpdate(patientId, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get patient profile
// @route   GET /api/patient/profile
// @access  Private (Patient)
const getProfile = async (req, res) => {
  try {
    const patientId = req.userId;

    // Find patient by ID and exclude password
    const patient = await User.findById(patientId)
      .select('-password -otp -otpExpire -resetPasswordToken -resetPasswordExpire')
      .populate('deviceId', 'deviceId name status batteryLevel lastSeen')
      .populate('assignedDoctor','name email role phone age gender');
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    console.log(patient)
    // Get additional stats for the profile
    const [totalReadings, activePrescriptions, unreadAlerts] = await Promise.all([
      // Total health readings
      HealthRecord.countDocuments({ patientId }),
      
      // Active prescriptions count
      Prescription.countDocuments({ 
        patientId, 
        isActive: true,
        endDate: { $gte: new Date() }
      }),
      
      // Unread alerts count
      Alert.countDocuments({ patientId, status: 'unread' })
    ]);

    // Get today's medicines count (without using MedicineIntakeLog)
    const todaysMedicinesResult = await Prescription.aggregate([
      { 
        $match: { 
          patientId, 
          isActive: true,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() }
        }
      },
      { $unwind: '$medicines' },
      { $unwind: '$medicines.times' },
      { 
        $match: { 
          'medicines.times.taken': false,
          'medicines.times.skipped': false 
        }
      },
      { $count: 'total' }
    ]);

    // Get latest health reading
    const latestHealth = await HealthRecord.findOne({ patientId })
      .sort({ recordedAt: -1 })
      .limit(1);

    // Calculate adherence rate based on today's medicines taken vs total
    const totalTodayMeds = await Prescription.aggregate([
      { 
        $match: { 
          patientId, 
          isActive: true,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() }
        }
      },
      { $unwind: '$medicines' },
      { $unwind: '$medicines.times' },
      { $count: 'total' }
    ]);

    const takenTodayMeds = await Prescription.aggregate([
      { 
        $match: { 
          patientId, 
          isActive: true,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() }
        }
      },
      { $unwind: '$medicines' },
      { $unwind: '$medicines.times' },
      { 
        $match: { 
          'medicines.times.taken': true
        }
      },
      { $count: 'total' }
    ]);

    const totalDoses = totalTodayMeds[0]?.total || 0;
    const takenDoses = takenTodayMeds[0]?.total || 0;
    const adherenceRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

    // Calculate days active (account creation to now)
    const daysActive = Math.ceil((new Date() - patient.createdAt) / (1000 * 60 * 60 * 24));

    // Prepare profile response with stats
    const profileData = {
      _id: patient._id,
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      age: patient.age,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      allergies: patient.allergies || [],
      medicalConditions: patient.medicalConditions || [],
      address: patient.address || {},
      emergencyContact: patient.emergencyContact || {},
      device: patient.deviceId || null,
      createdAt: patient.createdAt,
      assignedDoctor : patient.assignedDoctor || {},
      // Stats
      stats: {
        daysActive,
        totalReadings,
        activePrescriptions,
        todaysMedicines: todaysMedicinesResult[0]?.total || 0,
        unreadAlerts,
        adherenceRate,
        latestHeartRate: latestHealth?.heartRate || null,
        latestBloodPressure: latestHealth?.systolic && latestHealth?.diastolic 
          ? `${latestHealth.systolic}/${latestHealth.diastolic}` 
          : null,
        latestOxygenLevel: latestHealth?.oxygenLevel || null
      }
    };

    res.json({
      success: true,
      data: profileData,
      message: 'Profile fetched successfully'
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};
// @desc    Get today's medicines for patient
// @route   GET /api/patient/medicines/today
// @access  Private (Patient)
const getTodaysMedicines = async (req, res) => {
  try {
    const patientId = req.userId;

    // Get current date range (start and end of today)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Find active prescriptions for this patient
    const activePrescriptions = await Prescription.find({
      patientId,
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).populate("doctorId", "name");

    if (!activePrescriptions.length) {
      return res.json({
        success: true,
        data: [],
        message: "No active prescriptions found",
      });
    }

    // Get all medicines from active prescriptions
    let todaysMedicines = [];

    activePrescriptions.forEach((prescription) => {
      prescription.medicines.forEach((medicine) => {
        // Check if medicine should be taken today based on frequency
        const shouldTakeToday = checkIfMedicineShouldBeTakenToday(medicine);

        if (shouldTakeToday) {
          // Get today's schedule for this medicine
          const todaysSchedule = getTodaysSchedule(medicine);

          todaysMedicines.push({
            _id: medicine._id,
            prescriptionId: prescription._id,
            name: medicine.name,
            dosage: medicine.dosage,
            form: medicine.form,
            frequency: medicine.frequency,
            instructions: medicine.instructions,
            times: todaysSchedule, // Array of time slots for today
            doctorName: prescription.doctorId?.name,
            diagnosis: prescription.diagnosis,
            startDate: prescription.startDate,
            endDate: prescription.endDate,
          });
        }
      });
    });

    // Sort by time
    todaysMedicines.sort((a, b) => {
      if (a.times && b.times) {
        return a.times[0]?.time.localeCompare(b.times[0]?.time);
      }
      return 0;
    });

    res.json({
      success: true,
      data: todaysMedicines,
      count: todaysMedicines.length,
    });
  } catch (error) {
    console.error("Error fetching today's medicines:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching today's medicines",
      error: error.message,
    });
  }
};

// Helper function to check if medicine should be taken today
const checkIfMedicineShouldBeTakenToday = (medicine) => {
  const today = moment().format("dddd").toLowerCase();

  switch (medicine.frequency) {
    case "once-daily":
    case "twice-daily":
    case "thrice-daily":
      return true; // Take every day

    case "alternate-days":
      // Check if today is an alternate day
      const startDate = moment(medicine.startDate || new Date());
      const daysSinceStart = moment().diff(startDate, "days");
      return daysSinceStart % 2 === 0;

    case "weekly":
      // Check if today is the specified day of week
      return medicine.dayOfWeek?.toLowerCase() === today;

    case "custom":
      // Check custom schedule
      return medicine.customSchedule?.includes(today);

    default:
      return true;
  }
};

// Helper function to get today's schedule for a medicine
const getTodaysSchedule = (medicine) => {
  const schedule = [];
  const now = new Date();

  // Get intake logs for today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Define default times based on frequency
  let times = [];

  switch (medicine.frequency) {
    case "once-daily":
      times = [medicine.time || "08:00"];
      break;
    case "twice-daily":
      times = medicine.times || ["08:00", "20:00"];
      break;
    case "thrice-daily":
      times = medicine.times || ["08:00", "14:00", "20:00"];
      break;
    default:
      times = medicine.times || [medicine.time || "08:00"];
  }

  // Check each time slot for taken status
  times.forEach((time) => {
    // Check if this time slot has been taken today
    const takenLog = medicine.intakeLogs?.find(
      (log) =>
        moment(log.time).format("HH:mm") === time &&
        moment(log.takenAt).isBetween(todayStart, todayEnd),
    );

    schedule.push({
      time,
      taken: !!takenLog,
      takenAt: takenLog?.takenAt,
      skipped: takenLog?.skipped || false,
      skippedReason: takenLog?.skippedReason,
      _id: takenLog?._id || new mongoose.Types.ObjectId(),
    });
  });

  return schedule;
};
// @desc    Mark medicine time slot as taken
// @route   POST /api/patient/prescriptions/:prescriptionId/medicines/:medicineId/times/:timeId/taken
// @access  Private (Patient)
const markMedicineTaken = async (req, res) => {
  try {
    const { prescriptionId, medicineId, timeId } = req.params;
    const { takenAt = new Date() } = req.body;
    const patientId = req.userId;

    console.log("Marking medicine as taken:", {
      prescriptionId,
      medicineId,
      timeId,
      patientId,
    });

    // Find the specific prescription
    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      patientId,
      isActive: true,
    });

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found or not active",
      });
    }

    // Find the specific medicine in the prescription
    const medicine = prescription.medicines.id(medicineId);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found in this prescription",
      });
    }

    // Find the specific time slot in the medicine
    const timeSlot = medicine.times.id(timeId);

    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        message: "Time slot not found for this medicine",
      });
    }

    // Check if already taken
    if (timeSlot.taken) {
      return res.status(400).json({
        success: false,
        message: "This medicine has already been marked as taken",
      });
    }

    // Update the time slot
    timeSlot.taken = true;
    timeSlot.takenAt = takenAt;
    timeSlot.skipped = false; // Ensure skipped is false if it was previously set

    await prescription.save();

    // Create intake log
    await MedicineIntakeLog.create({
      patientId,
      prescriptionId: prescription._id,
      medicineId,
      timeId,
      taken: true,
      takenAt,
      scheduledTime: timeSlot.time,
    });

    res.json({
      success: true,
      message: "Medicine marked as taken successfully",
      data: {
        prescriptionId,
        medicineId,
        timeId,
        takenAt,
        medicineName: medicine.name,
        scheduledTime: timeSlot.time,
      },
    });
  } catch (error) {
    console.error("Error marking medicine as taken:", error);
    res.status(500).json({
      success: false,
      message: "Error updating medicine status",
      error: error.message,
    });
  }
};

// @desc    Mark medicine time slot as skipped
// @route   POST /api/patient/prescriptions/:prescriptionId/medicines/:medicineId/times/:timeId/skipped
// @access  Private (Patient)
const markMedicineSkipped = async (req, res) => {
  try {
    const { prescriptionId, medicineId, timeId } = req.params;
    const { reason } = req.body;
    const patientId = req.userId;

    console.log("Marking medicine as skipped:", {
      prescriptionId,
      medicineId,
      timeId,
      reason,
      patientId,
    });

    // Find the specific prescription
    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      patientId,
      isActive: true,
    });

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found or not active",
      });
    }

    // Find the specific medicine in the prescription
    const medicine = prescription.medicines.id(medicineId);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found in this prescription",
      });
    }

    // Find the specific time slot in the medicine
    const timeSlot = medicine.times.id(timeId);

    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        message: "Time slot not found for this medicine",
      });
    }

    // Check if already taken or skipped
    if (timeSlot.taken) {
      return res.status(400).json({
        success: false,
        message: "This medicine has already been marked as taken",
      });
    }

    if (timeSlot.skipped) {
      return res.status(400).json({
        success: false,
        message: "This medicine has already been marked as skipped",
      });
    }

    // Update the time slot
    timeSlot.skipped = true;
    timeSlot.skippedAt = new Date();
    timeSlot.skippedReason = reason || "No reason provided";

    await prescription.save();

    // Create intake log
    await MedicineIntakeLog.create({
      patientId,
      prescriptionId: prescription._id,
      medicineId,
      timeId,
      taken: false,
      skipped: true,
      skippedReason: reason,
      skippedAt: new Date(),
      scheduledTime: timeSlot.time,
    });

    res.json({
      success: true,
      message: "Medicine marked as skipped successfully",
      data: {
        prescriptionId,
        medicineId,
        timeId,
        reason,
        medicineName: medicine.name,
        scheduledTime: timeSlot.time,
      },
    });
  } catch (error) {
    console.error("Error marking medicine as skipped:", error);
    res.status(500).json({
      success: false,
      message: "Error updating medicine status",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboard,
  getHealthRecords,
  addHealthRecord,
  getPrescriptions,
  getAlerts,
  markAlertRead,
  getProfile,
  updateProfile,
  getTodaysMedicines,
  markMedicineSkipped,
  markMedicineTaken,
};
