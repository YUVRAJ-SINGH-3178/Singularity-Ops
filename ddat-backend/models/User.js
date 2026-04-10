const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: [true, "Wallet address is required"],
    unique: true,
    lowercase: true,
    trim: true,
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: [120, "Display name cannot exceed 120 characters"],
    default: "",
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [180, "Email cannot exceed 180 characters"],
    default: "",
  },
  role: {
    type: String,
    enum: ["member", "affiliate", "executive"],
    default: "member",
    index: true,
  },
  organization: {
    type: String,
    trim: true,
    maxlength: [180, "Organization cannot exceed 180 characters"],
    default: "",
    index: true,
  },
  labKey: {
    type: String,
    trim: true,
    maxlength: [60, "Lab key cannot exceed 60 characters"],
    default: "",
  },
  requestedRole: {
    type: String,
    enum: ["member", "affiliate", "executive"],
    default: null,
  },
  requestedRoleAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.index({ organization: 1, role: 1, displayName: 1 });
userSchema.index({ labKey: 1, requestedRole: 1, requestedRoleAt: -1 });
userSchema.index({ organization: 1, labKey: 1, displayName: 1 });

module.exports = mongoose.model("User", userSchema);
