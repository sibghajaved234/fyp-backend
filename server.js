const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const os = require("os")
require('dotenv').config();

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const patientRoutes = require('./src/routes/patientRoutes');
const doctorRoutes = require('./src/routes/doctorRoutes');
const deviceRoutes = require('./src/routes/deviceRoutes');
const alertRoutes = require('./src/routes/alertRoutes');
const medicineRoutes = require('./src/routes/medicineRoutes');
// Import socket handler
const { initializeSocket } = require('./src/sockets/socketHandler');

// Import error handler
const errorHandler = require('./src/middleware/errorHandler');
const connectDB = require('./src/config/database');
const Prescription = require('./src/models/Prescription');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize socket handlers
initializeSocket(io);

// Make io accessible in routes
app.set('io', io);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', limiter);

// Database connection
connectDB()

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/medicines', medicineRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    uptime: process.uptime(),
    websocket: `ws://localhost:${process.env.SOCKET_PORT || 5001}`
  });
});


app.get('/api/medicines/today', async (req, res) => {
  try {
    // Aaj ki date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Active prescriptions jo aaj valid hain
    const prescriptions = await Prescription.find({
      startDate: { $lte: today },
      endDate: { $gte: today },
      isActive: true
    }).toArray();
    
    // Sirf times nikal kar simplified data banao
    const simplifiedData = [];
    
    prescriptions.forEach(prescription => {
      prescription.medicines.forEach(medicine => {
        medicine.times.forEach(timeSlot => {
          simplifiedData.push({
            patientId: prescription.patientId,
            medicineName: medicine.name,
            dosage: medicine.dosage,
            time: timeSlot.time,
            compartment: medicine.compartmentNumber,
            taken: timeSlot.taken,
            instructions: medicine.instructions
          });
        });
      });
    });
    
    res.json({
      success: true,
      date: today.toISOString().split('T')[0],
      total: simplifiedData.length,
      medicines: simplifiedData
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📌 2. SPECIFIC PATIENT KI MEDICINES
app.get('/api/medicines/patient/:patientId', async (req, res) => {
  try {
    const patientId = req.params.patientId;
    
    const prescriptions = await collection.find({
      patientId: patientId,
      isActive: true
    }).toArray();
    
    const medicines = [];
    
    prescriptions.forEach(prescription => {
      prescription.medicines.forEach(medicine => {
        medicine.times.forEach(timeSlot => {
          medicines.push({
            medicineName: medicine.name,
            dosage: medicine.dosage,
            time: timeSlot.time,
            compartment: medicine.compartmentNumber,
            taken: timeSlot.taken,
            instructions: medicine.instructions,
            prescriptionId: prescription._id,
            medicineId: medicine._id,
            timeId: timeSlot._id
          });
        });
      });
    });
    
    res.json({
      success: true,
      patientId: patientId,
      total: medicines.length,
      medicines: medicines
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📌 3. CURRENT TIME KI MEDICINES
app.get('/api/medicines/current', async (req, res) => {
  try {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const prescriptions = await collection.find({
      isActive: true
    }).toArray();
    
    const currentMedicines = [];
    
    prescriptions.forEach(prescription => {
      prescription.medicines.forEach(medicine => {
        medicine.times.forEach(timeSlot => {
          if (timeSlot.time === currentTime && !timeSlot.taken) {
            currentMedicines.push({
              patientId: prescription.patientId,
              medicineName: medicine.name,
              dosage: medicine.dosage,
              time: timeSlot.time,
              compartment: medicine.compartmentNumber,
              taken: timeSlot.taken,
              instructions: medicine.instructions,
              timeId: timeSlot._id  // Update karne ke liye
            });
          }
        });
      });
    });
    
    res.json({
      success: true,
      currentTime: currentTime,
      total: currentMedicines.length,
      medicines: currentMedicines
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📌 4. SPECIFIC TIME KI MEDICINES
app.get('/api/medicines/time/:time', async (req, res) => {
  try {
    const time = req.params.time;  // Format: "08:00"
    
    const prescriptions = await collection.find({
      isActive: true
    }).toArray();
    
    const timeMedicines = [];
    
    prescriptions.forEach(prescription => {
      prescription.medicines.forEach(medicine => {
        medicine.times.forEach(timeSlot => {
          if (timeSlot.time === time) {
            timeMedicines.push({
              patientId: prescription.patientId,
              medicineName: medicine.name,
              dosage: medicine.dosage,
              time: timeSlot.time,
              compartment: medicine.compartmentNumber,
              taken: timeSlot.taken,
              instructions: medicine.instructions
            });
          }
        });
      });
    });
    
    res.json({
      success: true,
      time: time,
      total: timeMedicines.length,
      medicines: timeMedicines
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📌 5. MEDICINE TAKEN MARK KARO (update)
app.post('/api/medicines/taken/:prescriptionId/:medicineId/:timeId', async (req, res) => {
  try {
    const { prescriptionId, medicineId, timeId } = req.params;
    
    // MongoDB mein update karo
    const result = await collection.updateOne(
      { 
        "_id": new ObjectId(prescriptionId),
        "medicines._id": new ObjectId(medicineId),
        "medicines.times._id": new ObjectId(timeId)
      },
      {
        $set: {
          "medicines.$[medicine].times.$[time].taken": true
        }
      },
      {
        arrayFilters: [
          { "medicine._id": new ObjectId(medicineId) },
          { "time._id": new ObjectId(timeId) }
        ]
      }
    );
    
    if (result.modifiedCount > 0) {
      res.json({
        success: true,
        message: "Medicine marked as taken"
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Medicine not found or already taken"
      });
    }
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log("hello server")
//   console.log(`✅ Server running on port ${PORT}`);
//   console.log(`✅ WebSocket running on port ${process.env.SOCKET_PORT || 5001}`);
// });



// Server start
async function startServer() {
  connectDB()
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 MongoDB Medicine API Server Running!');
    console.log('='.repeat(50));
    
    const networkInterfaces = os.networkInterfaces();
    let localIP = '';
    
    Object.keys(networkInterfaces).forEach((interfaceName) => {
      networkInterfaces[interfaceName].forEach((iface) => {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIP = iface.address;
        }
      });
    });
    
    console.log(`📡 Local URL: http://localhost:${PORT}`);
    console.log(`🌐 Network URL: http://${localIP}:${PORT}`);
    console.log('\n📌 ESP32 mein ye URL use karo:');
    console.log(`   http://${localIP}:${PORT}/api/medicines/today`);
    console.log('='.repeat(50));
  });
}

startServer();