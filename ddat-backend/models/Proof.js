const mongoose = require("mongoose");

const proofSchema = new mongoose.Schema({
  commitmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Commitment",
    required: [true, "Commitment ID is required"],
    index: true,
  },
  walletAddress: {
    type: String,
    required: [true, "Wallet address is required"],
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true,
    maxlength: [1000, "Description cannot exceed 1000 characters"],
  },
  dayNumber: {
    type: Number,
    required: true,
    min: 1,
  },
  status: {
    type: String,
    enum: {
      values: ["pending", "accepted", "rejected"],
      message: "{VALUE} is not a valid proof status",
    },
    default: "pending",
    index: true,
  },
  imageUrl: {
    type: String,
    default: "",
    trim: true,
  },
  voteYes: {
    type: Number,
    default: 0,
    min: 0,
  },
  voteNo: {
    type: Number,
    default: 0,
    min: 0,
  },
  votedBy: {
    type: [String], // array of wallet addresses that have voted
    default: [],
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

proofSchema.index({ commitmentId: 1, status: 1, createdAt: -1 });
proofSchema.index({ walletAddress: 1, createdAt: -1 });

module.exports = mongoose.model("Proof", proofSchema);
