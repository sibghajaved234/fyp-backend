const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  ipAddress: String,
  macAddress: String,

  status: {
    type: String,
    enum: ["online", "offline"],
    default: "offline"
  },

  lastSeen: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model("Device", deviceSchema);