module.exports = {
  // User roles
  ROLES: {
    PATIENT: 'patient',
    DOCTOR: 'doctor',
    ADMIN: 'admin'
  },

  // Alert types
  ALERT_TYPES: {
    HEART_RATE_HIGH: 'heart_rate_high',
    HEART_RATE_LOW: 'heart_rate_low',
    BLOOD_PRESSURE_HIGH: 'blood_pressure_high',
    BLOOD_PRESSURE_LOW: 'blood_pressure_low',
    OXYGEN_LOW: 'oxygen_low',
    TEMPERATURE_HIGH: 'temperature_high',
    MISSED_MEDICINE: 'missed_medicine',
    DEVICE_OFFLINE: 'device_offline',
    LOW_BATTERY: 'low_battery',
    FALL_DETECTED: 'fall_detected',
    EMERGENCY: 'emergency'
  },

  // Alert severity levels
  ALERT_SEVERITY: {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical',
    EMERGENCY: 'emergency'
  },

  // Alert status
  ALERT_STATUS: {
    UNREAD: 'unread',
    READ: 'read',
    ACKNOWLEDGED: 'acknowledged',
    RESOLVED: 'resolved'
  },

  // Device status
  DEVICE_STATUS: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    MAINTENANCE: 'maintenance'
  },

  // Medicine forms
  MEDICINE_FORMS: {
    TABLET: 'tablet',
    CAPSULE: 'capsule',
    LIQUID: 'liquid',
    INJECTION: 'injection',
    TOPICAL: 'topical',
    INHALER: 'inhaler',
    DROPS: 'drops'
  },

  // Medicine categories
  MEDICINE_CATEGORIES: {
    ANTIBIOTIC: 'antibiotic',
    PAINKILLER: 'painkiller',
    ANTIHYPERTENSIVE: 'antihypertensive',
    ANTIDIABETIC: 'antidiabetic',
    ANTIDEPRESSANT: 'antidepressant',
    ANTIHISTAMINE: 'antihistamine',
    VITAMIN: 'vitamin',
    SUPPLEMENT: 'supplement',
    OTHER: 'other'
  },

  // Blood groups
  BLOOD_GROUPS: [
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
  ],

  // Gender options
  GENDERS: ['male', 'female', 'other'],

  // Health thresholds
  HEALTH_THRESHOLDS: {
    HEART_RATE: {
      NORMAL_MIN: 60,
      NORMAL_MAX: 100,
      WARNING_MIN: 50,
      WARNING_MAX: 110,
      CRITICAL_MIN: 40,
      CRITICAL_MAX: 120
    },
    BLOOD_PRESSURE: {
      SYSTOLIC: {
        NORMAL_MIN: 90,
        NORMAL_MAX: 120,
        ELEVATED_MIN: 120,
        ELEVATED_MAX: 130,
        HIGH_MIN: 130,
        HIGH_MAX: 140,
        CRITICAL_MIN: 140,
        CRITICAL_MAX: 180
      },
      DIASTOLIC: {
        NORMAL_MIN: 60,
        NORMAL_MAX: 80,
        ELEVATED_MIN: 80,
        ELEVATED_MAX: 85,
        HIGH_MIN: 85,
        HIGH_MAX: 90,
        CRITICAL_MIN: 90,
        CRITICAL_MAX: 120
      }
    },
    OXYGEN_LEVEL: {
      NORMAL_MIN: 95,
      NORMAL_MAX: 100,
      WARNING_MIN: 90,
      WARNING_MAX: 94,
      CRITICAL_MIN: 85,
      CRITICAL_MAX: 89
    },
    TEMPERATURE: {
      NORMAL_MIN: 36.1,
      NORMAL_MAX: 37.2,
      WARNING_MIN: 35.5,
      WARNING_MAX: 37.8,
      CRITICAL_MIN: 35,
      CRITICAL_MAX: 38.5
    }
  },

  // HTTP status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    SERVER_ERROR: 500
  },

  // Time constants (in milliseconds)
  TIME: {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000
  },

  // Notification channels
  NOTIFICATION_CHANNELS: {
    PUSH: 'push',
    EMAIL: 'email',
    SMS: 'sms'
  },

  // Notification priorities
  NOTIFICATION_PRIORITIES: {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high'
  },

  // Prescription status
  PRESCRIPTION_STATUS: {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },

  // Medicine frequency
  MEDICINE_FREQUENCY: {
    ONCE_DAILY: 'once-daily',
    TWICE_DAILY: 'twice-daily',
    THRICE_DAILY: 'thrice-daily',
    AS_NEEDED: 'as-needed'
  },

  // API endpoints
  API_ENDPOINTS: {
    AUTH: {
      REGISTER: '/api/auth/register',
      LOGIN: '/api/auth/login',
      LOGOUT: '/api/auth/logout',
      ME: '/api/auth/me',
      FORGOT_PASSWORD: '/api/auth/forgot-password',
      RESET_PASSWORD: '/api/auth/reset-password'
    },
    PATIENT: {
      DASHBOARD: '/api/patient/dashboard',
      HEALTH_RECORDS: '/api/patient/health-records',
      PRESCRIPTIONS: '/api/patient/prescriptions',
      ALERTS: '/api/patient/alerts',
      PROFILE: '/api/patient/profile'
    },
    DOCTOR: {
      PATIENTS: '/api/doctor/patients',
      PRESCRIPTIONS: '/api/doctor/prescriptions',
      ALERTS: '/api/doctor/alerts'
    },
    DEVICE: {
      REGISTER: '/api/device/register',
      STATUS: '/api/device/status',
      SENSOR_DATA: '/api/device/sensor-data',
      SCHEDULE: '/api/device/schedule'
    }
  },

  // WebSocket events
  SOCKET_EVENTS: {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    HEALTH_UPDATE: 'healthUpdate',
    NEW_ALERT: 'newAlert',
    ALERT_UPDATED: 'alertUpdated',
    DEVICE_STATUS: 'deviceStatus',
    MEDICINE_TAKEN: 'medicineTaken',
    DOCTOR_MESSAGE: 'doctorMessage',
    PATIENT_MESSAGE: 'patientMessage',
    TYPING: 'typing',
    USER_ONLINE: 'userOnline',
    USER_OFFLINE: 'userOffline'
  }
};