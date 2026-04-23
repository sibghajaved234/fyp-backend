const Device = require("../models/Device");
const Prescription = require("../models/Prescription");

// POST /api/device/register
const registerDevice = async (req, res) => {
  try {
    const { deviceId, deviceName, macAddress } = req.body;
    const userId = req.userId;

    console.log('Registering device:', { deviceId, deviceName, userId });

    // Validate required fields
    if (!deviceId) {
      return res.status(400).json({ 
        success: false, 
        message: "Device ID is required" 
      });
    }

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "User not authenticated" 
      });
    }

    // Find or create device
    let device = await Device.findOne({ deviceId });

    if (!device) {
      // Create new device
      device = await Device.create({
        deviceId,
        deviceName: deviceName || "Medical Box",
        owner: userId,
        macAddress: macAddress || null,
        ipAddress: req.ip || req.connection.remoteAddress,
        status: "online",
        lastSeen: new Date()
      });
      
      console.log(`New device registered: ${deviceId} for user ${userId}`);
      
      return res.status(201).json({ 
        success: true, 
        message: "Device registered successfully",
        device: {
          id: device._id,
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          status: device.status,
          lastSeen: device.lastSeen,
          owner: device.owner
        }
      });
      
    } else {
      // Check if device already belongs to another user
      // Allow overwrite (reassign device)
      device.owner = userId;
      
      // Update existing device
      const previousOwner = device.owner;
      device.owner = userId;
      device.status = "online";
      device.lastSeen = new Date();
      
      if (deviceName) device.deviceName = deviceName;
      if (macAddress) device.macAddress = macAddress;
      if (req.ip) device.ipAddress = req.ip;
      
      await device.save();
      
      console.log(`Device updated: ${deviceId} - Previous owner: ${previousOwner || 'none'}, New owner: ${userId}`);
      
      return res.json({ 
        success: true, 
        message: "Device updated successfully",
        device: {
          id: device._id,
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          status: device.status,
          lastSeen: device.lastSeen,
          owner: device.owner
        }
      });
    }

  } catch (err) {
    console.error("Device registration error:", err);
    
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({ 
        success: false, 
        message: "Device ID already exists" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Failed to register device",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};


const unpairDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.userId;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "Device ID is required"
      });
    }

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }
    console.log(device.owner)
    console.log(userId)
    // 🔒 Ensure only owner can unpair
    if (device.owner && device.owner.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to unpair this device"
      });
    }

    // ✅ Unpair logic
    device.owner = null;
    device.status = "offline";
    device.lastSeen = new Date();

    await device.save();

    return res.json({
      success: true,
      message: "Device unpaired successfully"
    });

  } catch (err) {
    console.error("Unpair error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to unpair device"
    });
  }
};

const updateDeviceIP = async (req, res) => {
  try {
    const { deviceId, ipAddress } = req.body;

    if (!deviceId || !ipAddress) {
      return res.status(400).json({
        success: false,
        message: "deviceId and ipAddress required"
      });
    }

    const device = await Device.findOneAndUpdate(
      { deviceId },
      {
        ipAddress,
        lastSeen: new Date(),
        status: "online"
      },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }

    return res.json({
      success: true,
      message: "IP updated",
      device
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


const getDeviceTodaysMedicines = async (req, res) => {
  try {
    const { deviceId } = req.params; // or req.body

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "deviceId is required"
      });
    }

    // 🔍 Step 1: Find device owner
    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }

    const ownerId = device.ownerId;

    // 📅 Step 2: Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // 📦 Step 3: Get prescriptions for this owner ONLY
    const prescriptions = await Prescription.find({
      patientId: ownerId,
      isActive: true,
      startDate: { $lte: today },
      endDate: { $gte: today }
    });

    let medicines = [];

    // 🔁 Step 4: Flatten medicines
    prescriptions.forEach((prescription) => {
      prescription.medicines.forEach((medicine) => {
        medicine.times.forEach((timeSlot) => {
          medicines.push({
            patientId: prescription.patientId,
            prescriptionId: prescription._id,
            medicineName: medicine.name,
            dosage: medicine.dosage,
            compartment: medicine.compartmentNumber,
            time: timeSlot.time,
            taken: timeSlot.taken,
            instructions: medicine.instructions
          });
        });
      });
    });

    // 📤 Response
    res.json({
      success: true,
      deviceId,
      ownerId,
      date: today.toISOString().split("T")[0],
      total: medicines.length,
      medicines
    });

  } catch (error) {
    console.error("getDeviceTodaysMedicines error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};



const getDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(device);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// replace existing getSchedule with your new logic
const getSchedule = async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "deviceId is required"
      });
    }

    // 🔍 Find device owner
    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }

    const ownerId = device.ownerId;

    // 📅 Today range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 📦 Get prescriptions for this owner
    const prescriptions = await Prescription.find({
      patientId: ownerId,
      isActive: true,
      startDate: { $lte: today },
      endDate: { $gte: today }
    });

    let medicines = [];

    prescriptions.forEach((prescription) => {
      prescription.medicines.forEach((medicine) => {
        medicine.times.forEach((timeSlot) => {
          medicines.push({
            medicineName: medicine.name,
            dosage: medicine.dosage,
            compartment: medicine.compartmentNumber,
            time: timeSlot.time,
            taken: timeSlot.taken,
            instructions: medicine.instructions
          });
        });
      });
    });

    res.json({
      success: true,
      deviceId,
      ownerId,
      date: today.toISOString().split("T")[0],
      total: medicines.length,
      medicines
    });

  } catch (error) {
    console.error("getSchedule error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};


const medicineTaken = async (req, res) => {
  try {
    const { deviceId, compartment } = req.body;

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    device.lastSeen = new Date();
    await device.save();

    res.json({
      success: true,
      message: "Medicine marked as taken"
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


module.exports = {
  registerDevice,
  updateDeviceIP,
  getDevice,
  getSchedule,
  medicineTaken,
  unpairDevice
};
