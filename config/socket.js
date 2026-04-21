const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Device = require('../models/Device');

class SocketManager {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.connectedUsers = new Map();
    this.connectedDevices = new Map();
    this.userSockets = new Map();
    this.deviceSockets = new Map();

    this.initializeMiddleware();
    this.initializeHandlers();
  }

  initializeMiddleware() {
    this.io.use(async (socket, next) => {
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
        console.error('Socket auth error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  initializeHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`New connection: ${socket.id}`);

      if (socket.isDevice) {
        this.handleDeviceConnection(socket);
      } else {
        this.handleUserConnection(socket);
      }

      // Common handlers
      socket.on('disconnect', () => this.handleDisconnect(socket));
      socket.on('error', (error) => this.handleError(socket, error));
      socket.on('ping', (cb) => this.handlePing(socket, cb));
    });
  }

  handleDeviceConnection(socket) {
    const device = socket.device;
    
    // Store device connection
    this.connectedDevices.set(device.deviceId, socket);
    this.deviceSockets.set(socket.id, device.deviceId);
    
    // Update device status
    device.status = 'online';
    device.lastSeen = new Date();
    device.save().catch(console.error);

    console.log(`Device connected: ${device.deviceId}`);

    // Join rooms
    socket.join(`device-${device.deviceId}`);
    if (device.owner) {
      socket.join(`patient-${device.owner}`);
    }

    // Send initial data
    socket.emit('connected', {
      type: 'device',
      deviceId: device.deviceId,
      timestamp: new Date()
    });

    // Device event handlers
    socket.on('sensorData', (data) => this.handleSensorData(socket, data));
    socket.on('battery', (data) => this.handleBatteryUpdate(socket, data));
    socket.on('medicineTaken', (data) => this.handleMedicineTaken(socket, data));
    socket.on('alarm', (data) => this.handleAlarm(socket, data));
    socket.on('errorLog', (data) => this.handleErrorLog(socket, data));
  }

  handleUserConnection(socket) {
    const user = socket.user;
    
    // Store user connection
    this.connectedUsers.set(user._id.toString(), socket);
    this.userSockets.set(socket.id, user._id.toString());
    
    // Update last active
    user.lastActive = new Date();
    user.save().catch(console.error);

    console.log(`User connected: ${user.name} (${user.role})`);

    // Join rooms
    socket.join(`user-${user._id}`);
    socket.join(user.role === 'patient' ? `patient-${user._id}` : `doctor-${user._id}`);

    // If patient has device, join device room
    if (user.role === 'patient' && user.deviceId) {
      socket.join(`device-${user.deviceId}`);
    }

    // Send initial data
    socket.emit('connected', {
      type: 'user',
      userId: user._id,
      role: user.role,
      timestamp: new Date()
    });

    // User event handlers based on role
    if (user.role === 'patient') {
      this.handlePatientEvents(socket, user);
    } else if (user.role === 'doctor') {
      this.handleDoctorEvents(socket, user);
    }

    // Common user handlers
    socket.on('typing', (data) => this.handleTyping(socket, data));
    socket.on('markRead', (data) => this.handleMarkRead(socket, data));
    socket.on('requestData', (data) => this.handleDataRequest(socket, data));
  }

  handlePatientEvents(socket, user) {
    socket.on('requestHealthUpdate', () => {
      if (user.deviceId) {
        const deviceSocket = this.connectedDevices.get(user.deviceId.toString());
        if (deviceSocket) {
          deviceSocket.emit('requestData');
        }
      }
    });

    socket.on('medicineConfirmed', (data) => {
      this.io.to(`doctor-${user.assignedDoctor}`).emit('patientMedicineTaken', {
        patientId: user._id,
        patientName: user.name,
        ...data,
        timestamp: new Date()
      });
    });
  }

  handleDoctorEvents(socket, user) {
    socket.on('subscribeToPatient', (patientId) => {
      socket.join(`patient-${patientId}-updates`);
      console.log(`Doctor ${user.name} subscribed to patient ${patientId}`);
    });

    socket.on('unsubscribeFromPatient', (patientId) => {
      socket.leave(`patient-${patientId}-updates`);
    });

    socket.on('sendMessageToPatient', (data) => {
      this.io.to(`patient-${data.patientId}`).emit('doctorMessage', {
        doctorId: user._id,
        doctorName: user.name,
        ...data,
        timestamp: new Date()
      });
    });

    socket.on('acknowledgeAlert', async (data) => {
      try {
        const Alert = require('../models/Alert');
        const alert = await Alert.findById(data.alertId);
        if (alert) {
          alert.status = 'acknowledged';
          alert.acknowledgedBy = user._id;
          alert.acknowledgedAt = new Date();
          await alert.save();

          this.io.to(`patient-${alert.patientId}`).emit('alertUpdated', {
            alertId: alert._id,
            status: 'acknowledged'
          });
        }
      } catch (error) {
        console.error('Error acknowledging alert:', error);
      }
    });
  }

  handleSensorData(socket, data) {
    const device = socket.device;
    
    // Broadcast to patient and doctor
    if (device.owner) {
      this.io.to(`patient-${device.owner}`).emit('healthUpdate', {
        deviceId: device.deviceId,
        data,
        timestamp: new Date()
      });

      // Also send to doctor if patient has one
      User.findById(device.owner).then(patient => {
        if (patient && patient.assignedDoctor) {
          this.io.to(`doctor-${patient.assignedDoctor}`).emit('patientHealthUpdate', {
            patientId: device.owner,
            deviceId: device.deviceId,
            data,
            timestamp: new Date()
          });
        }
      }).catch(console.error);
    }

    // Acknowledge receipt
    socket.emit('dataReceived', { timestamp: new Date() });
  }

  handleBatteryUpdate(socket, data) {
    const device = socket.device;
    
    device.batteryLevel = data.level;
    device.save().catch(console.error);

    if (data.level < 20) {
      this.io.to(`patient-${device.owner}`).emit('lowBattery', {
        deviceId: device.deviceId,
        level: data.level,
        timestamp: new Date()
      });
    }
  }

  handleMedicineTaken(socket, data) {
    const device = socket.device;
    
    this.io.to(`patient-${device.owner}`).emit('medicineTaken', {
      deviceId: device.deviceId,
      ...data,
      timestamp: new Date()
    });
  }

  handleAlarm(socket, data) {
    const device = socket.device;
    
    // Emergency broadcast to all relevant parties
    this.io.to(`patient-${device.owner}`).emit('alarmTriggered', {
      deviceId: device.deviceId,
      ...data,
      timestamp: new Date()
    });

    // Get patient's emergency contacts and notify them
    User.findById(device.owner).then(patient => {
      if (patient && patient.assignedDoctor) {
        this.io.to(`doctor-${patient.assignedDoctor}`).emit('emergencyAlert', {
          patientId: device.owner,
          patientName: patient.name,
          deviceId: device.deviceId,
          ...data,
          timestamp: new Date()
        });
      }
    }).catch(console.error);
  }

  handleErrorLog(socket, data) {
    const device = socket.device;
    
    device.errorLogs.push({
      code: data.code,
      message: data.message,
      timestamp: new Date()
    });
    
    // Keep only last 50 errors
    if (device.errorLogs.length > 50) {
      device.errorLogs = device.errorLogs.slice(-50);
    }
    
    device.save().catch(console.error);

    // Notify patient if critical error
    if (data.critical) {
      this.io.to(`patient-${device.owner}`).emit('deviceError', {
        deviceId: device.deviceId,
        ...data,
        timestamp: new Date()
      });
    }
  }

  handleTyping(socket, data) {
    const user = socket.user;
    
    if (data.doctorId) {
      socket.to(`doctor-${data.doctorId}`).emit('userTyping', {
        userId: user._id,
        userName: user.name,
        ...data
      });
    } else if (data.patientId) {
      socket.to(`patient-${data.patientId}`).emit('doctorTyping', {
        doctorId: user._id,
        doctorName: user.name,
        ...data
      });
    }
  }

  handleMarkRead(socket, data) {
    // Handle read receipts
    if (data.messageIds) {
      // Mark messages as read in database
    }
  }

  handleDataRequest(socket, data) {
    const user = socket.user;
    
    if (data.type === 'health' && user.role === 'patient') {
      // Request latest health data from device
      if (user.deviceId) {
        const deviceSocket = this.connectedDevices.get(user.deviceId.toString());
        if (deviceSocket) {
          deviceSocket.emit('requestData');
        }
      }
    }
  }

  handlePing(socket, cb) {
    if (typeof cb === 'function') {
      cb();
    }
  }

  handleDisconnect(socket) {
    if (socket.isDevice) {
      // Handle device disconnect
      const device = socket.device;
      this.connectedDevices.delete(device.deviceId);
      this.deviceSockets.delete(socket.id);
      
      device.status = 'offline';
      device.save().catch(console.error);

      console.log(`Device disconnected: ${device.deviceId}`);

      // Notify patient
      if (device.owner) {
        this.io.to(`patient-${device.owner}`).emit('deviceOffline', {
          deviceId: device.deviceId,
          timestamp: new Date()
        });
      }
    } else {
      // Handle user disconnect
      const user = socket.user;
      if (user) {
        this.connectedUsers.delete(user._id.toString());
        this.userSockets.delete(socket.id);
        console.log(`User disconnected: ${user.name}`);
      }
    }
  }

  handleError(socket, error) {
    console.error(`Socket error for ${socket.id}:`, error);
  }

  // Public methods for emitting events
  emitToUser(userId, event, data) {
    const socket = this.connectedUsers.get(userId.toString());
    if (socket) {
      socket.emit(event, data);
    }
  }

  emitToDevice(deviceId, event, data) {
    const socket = this.connectedDevices.get(deviceId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  emitToRole(role, event, data) {
    this.io.to(role).emit(event, data);
  }

  emitToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  broadcast(event, data) {
    this.io.emit(event, data);
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  getConnectedDevicesCount() {
    return this.connectedDevices.size;
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId.toString());
  }

  isDeviceOnline(deviceId) {
    return this.connectedDevices.has(deviceId);
  }
}

module.exports = SocketManager;