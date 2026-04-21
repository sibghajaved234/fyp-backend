const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Device = require('../models/Device');

// Store connected users
const connectedUsers = new Map();
const connectedDevices = new Map();

const initializeSocket = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const deviceId = socket.handshake.auth.deviceId;

      if (deviceId) {
        // Device connection
        const device = await Device.findOne({ deviceId });
        if (!device) {
          return next(new Error('Device not found'));
        }
        socket.device = device;
        socket.isDevice = true;
      } else if (token) {
        // User connection
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
          return next(new Error('User not found'));
        }
        socket.user = user;
        socket.isDevice = false;
      } else {
        return next(new Error('Authentication required'));
      }

      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    if (socket.isDevice) {
      // Handle device connection
      handleDeviceConnection(socket);
    } else {
      // Handle user connection
      handleUserConnection(socket);
    }

    // Common event handlers
    socket.on('disconnect', () => {
      handleDisconnect(socket);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

const handleDeviceConnection = (socket) => {
  const device = socket.device;
  
  // Store device connection
  connectedDevices.set(device.deviceId, socket);
  
  // Update device status
  device.status = 'online';
  device.lastSeen = new Date();
  device.save();

  console.log(`Device connected: ${device.deviceId}`);

  // Join device room
  socket.join(`device-${device.deviceId}`);

  // Join patient room if device has owner
  if (device.owner) {
    socket.join(`patient-${device.owner}`);
  }

  // Send initial data
  socket.emit('connected', {
    type: 'device',
    deviceId: device.deviceId,
    timestamp: new Date()
  });

  // Handle device data
  socket.on('sensorData', async (data) => {
    try {
      // Process sensor data
      const io = socket.server;
      
      // Emit to patient and doctor
      if (device.owner) {
        io.to(`patient-${device.owner}`).emit('healthUpdate', {
          deviceId: device.deviceId,
          data,
          timestamp: new Date()
        });

        // Get patient's doctor
        const patient = await User.findById(device.owner).populate('assignedDoctor');
        if (patient.assignedDoctor) {
          io.to(`doctor-${patient.assignedDoctor}`).emit('patientHealthUpdate', {
            patientId: device.owner,
            data,
            timestamp: new Date()
          });
        }
      }

      // Acknowledge receipt
      socket.emit('dataReceived', { timestamp: new Date() });
    } catch (error) {
      console.error('Error processing sensor data:', error);
    }
  });

  // Handle alarm trigger
  socket.on('alarm', (data) => {
    const io = socket.server;
    
    if (device.owner) {
      io.to(`patient-${device.owner}`).emit('alarmTriggered', {
        deviceId: device.deviceId,
        ...data,
        timestamp: new Date()
      });
    }
  });

  // Handle battery status
  socket.on('battery', (data) => {
    device.batteryLevel = data.level;
    device.save();

    if (data.level < 20) {
      const io = socket.server;
      if (device.owner) {
        io.to(`patient-${device.owner}`).emit('lowBattery', {
          deviceId: device.deviceId,
          level: data.level,
          timestamp: new Date()
        });
      }
    }
  });
};

const handleUserConnection = (socket) => {
  const user = socket.user;
  
  // Store user connection
  connectedUsers.set(user._id.toString(), socket);
  
  // Update last active
  user.lastActive = new Date();
  user.save();

  console.log(`User connected: ${user.name} (${user.role})`);

  // Join user rooms based on role
  socket.join(`user-${user._id}`);
  
  if (user.role === 'patient') {
    socket.join(`patient-${user._id}`);
    
    // If patient has a device, connect to device updates
    if (user.deviceId) {
      socket.join(`device-${user.deviceId}`);
    }
  } else if (user.role === 'doctor') {
    socket.join(`doctor-${user._id}`);
  }

  // Send initial data
  socket.emit('connected', {
    type: 'user',
    userId: user._id,
    role: user.role,
    timestamp: new Date()
  });

  // Handle real-time events based on role
  if (user.role === 'patient') {
    handlePatientEvents(socket, user);
  } else if (user.role === 'doctor') {
    handleDoctorEvents(socket, user);
  }

  // Handle typing indicators
  socket.on('typing', (data) => {
    socket.to(`doctor-${data.doctorId}`).emit('userTyping', {
      userId: user._id,
      userName: user.name,
      ...data
    });
  });

  // Handle read receipts
  socket.on('markRead', (data) => {
    // Handle read receipts for messages/alerts
  });
};

const handlePatientEvents = (socket, user) => {
  // Patient-specific event handlers
  socket.on('requestHealthUpdate', () => {
    // Request latest health data from device
    if (user.deviceId) {
      const deviceSocket = connectedDevices.get(user.deviceId);
      if (deviceSocket) {
        deviceSocket.emit('requestData');
      }
    }
  });

  socket.on('medicineTaken', (data) => {
    const io = socket.server;
    
    // Notify doctor
    if (user.assignedDoctor) {
      io.to(`doctor-${user.assignedDoctor}`).emit('patientMedicineTaken', {
        patientId: user._id,
        patientName: user.name,
        ...data,
        timestamp: new Date()
      });
    }
  });
};

const handleDoctorEvents = (socket, user) => {
  // Doctor-specific event handlers
  socket.on('subscribeToPatient', (patientId) => {
    socket.join(`patient-${patientId}-updates`);
  });

  socket.on('unsubscribeFromPatient', (patientId) => {
    socket.leave(`patient-${patientId}-updates`);
  });

  socket.on('sendMessageToPatient', (data) => {
    const io = socket.server;
    io.to(`patient-${data.patientId}`).emit('doctorMessage', {
      doctorId: user._id,
      doctorName: user.name,
      ...data,
      timestamp: new Date()
    });
  });
};

const handleDisconnect = (socket) => {
  if (socket.isDevice) {
    // Handle device disconnect
    const device = socket.device;
    connectedDevices.delete(device.deviceId);
    
    device.status = 'offline';
    device.save();

    console.log(`Device disconnected: ${device.deviceId}`);

    // Notify patient
    if (device.owner) {
      const io = socket.server;
      io.to(`patient-${device.owner}`).emit('deviceOffline', {
        deviceId: device.deviceId,
        timestamp: new Date()
      });
    }
  } else {
    // Handle user disconnect
    const user = socket.user;
    if (user) {
      connectedUsers.delete(user._id.toString());
      console.log(`User disconnected: ${user.name}`);
    }
  }
};

// Utility functions
const sendToUser = (userId, event, data) => {
  const socket = connectedUsers.get(userId.toString());
  if (socket) {
    socket.emit(event, data);
  }
};

const sendToDevice = (deviceId, event, data) => {
  const socket = connectedDevices.get(deviceId);
  if (socket) {
    socket.emit(event, data);
  }
};

const broadcastToRole = (io, role, event, data) => {
  io.to(role).emit(event, data);
};

module.exports = {
  initializeSocket,
  sendToUser,
  sendToDevice,
  broadcastToRole,
  connectedUsers,
  connectedDevices
};