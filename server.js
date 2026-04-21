const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();
global.__base = __dirname + '/src/';

const authRoutes = require('./routes/authRoutes.js');
const patientRoutes = require('./routes/patientRoutes.js');
const doctorRoutes = require('./routes/doctorRoutes.js');
const deviceRoutes = require('./routes/deviceRoutes.js');
const alertRoutes = require('./routes/alertRoutes.js');
const medicineRoutes = require('./routes/medicineRoutes.js');

const errorHandler = require('./middleware/errorHandler.js');
const connectDB = require('./config/database.js');
const Prescription = require('./models/Prescription.js');

const app = express();

// ================= TRUST PROXY (IMPORTANT FOR RAILWAY) =================
app.set("trust proxy", 1);

// ================= RATE LIMIT =================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// ================= MIDDLEWARE =================
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', limiter);

// ================= DATABASE =================
connectDB();

// ================= ROUTES =================
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/medicines', medicineRoutes);

// ================= HEALTH CHECK =================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// ================= MEDICINE APIs =================

// 📌 TODAY MEDICINES
app.get('/api/medicines/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const prescriptions = await Prescription.find({
      startDate: { $lte: today },
      endDate: { $gte: today },
      isActive: true
    });

    const result = [];

    prescriptions.forEach(p => {
      p.medicines.forEach(m => {
        m.times.forEach(t => {
          result.push({
            patientId: p.patientId,
            medicineName: m.name,
            dosage: m.dosage,
            time: t.time,
            compartment: m.compartmentNumber,
            taken: t.taken,
            instructions: m.instructions
          });
        });
      });
    });

    res.json({
      success: true,
      total: result.length,
      medicines: result
    });

  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📌 PATIENT MEDICINES
app.get('/api/medicines/patient/:patientId', async (req, res) => {
  try {
    const prescriptions = await Prescription.find({
      patientId: req.params.patientId,
      isActive: true
    });

    const result = [];

    prescriptions.forEach(p => {
      p.medicines.forEach(m => {
        m.times.forEach(t => {
          result.push({
            medicineName: m.name,
            dosage: m.dosage,
            time: t.time,
            compartment: m.compartmentNumber,
            taken: t.taken
          });
        });
      });
    });

    res.json({
      success: true,
      total: result.length,
      medicines: result
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================= ERROR HANDLER =================
app.use(errorHandler);

// ================= 404 =================
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ================= START SERVER (RAILWAY SAFE) =================
const PORT = process.env.PORT || 8080;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log('\n==================================');
      console.log('🚀 SERVER RUNNING SUCCESSFULLY');
      console.log('==================================');
      console.log(`📡 Local: http://localhost:${PORT}`);
      console.log(`🌐 Port: ${PORT}`);
    });

  } catch (err) {
    console.log("❌ Server Failed:", err);
    process.exit(1);
  }
}

startServer();
