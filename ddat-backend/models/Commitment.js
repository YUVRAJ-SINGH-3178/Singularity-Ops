const mongoose = require("mongoose");

const commitmentSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: [true, "Wallet address is required"],
    lowercase: true,
    trim: true,
    index: true,
  },
  goalText: {
    type: String,
    required: [true, "Goal text is required"],
    trim: true,
    maxlength: [500, "Goal text cannot exceed 500 characters"],
  },
  durationDays: {
    type: Number,
    required: [true, "Duration in days is required"],
    min: [1, "Duration must be at least 1 day"],
  },
  acceptedProofCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  stakeAmount: {
    type: String, // stored as string to preserve BigNumber precision
    required: [true, "Stake amount is required"],
  },
  contractCommitmentId: {
    type: Number,
    default: null, // set after on-chain tx confirms
  },
  status: {
    type: String,
    enum: {
      values: ["created", "proving", "settled_success", "settled_failed"],
      message: "{VALUE} is not a valid status",
    },
    default: "created",
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

commitmentSchema.index({ walletAddress: 1, createdAt: -1 });

module.exports = mongoose.model("Commitment", commitmentSchema);
