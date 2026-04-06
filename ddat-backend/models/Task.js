const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [180, "Task title cannot exceed 180 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Task description cannot exceed 2000 characters"],
      default: "",
    },
    organization: {
      type: String,
      required: [true, "Organization is required"],
      trim: true,
      index: true,
    },
    labKey: {
      type: String,
      required: [true, "Lab key is required"],
      trim: true,
      index: true,
    },
    source: {
      type: String,
      enum: {
        values: ["enterprise", "employee"],
        message: "{VALUE} is not a valid task source",
      },
      required: true,
      index: true,
    },
    createdByWallet: {
      type: String,
      required: [true, "Creator wallet address is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    assignedToWallet: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
      index: true,
    },
    workDate: {
      type: Date,
      required: [true, "Work date is required"],
      index: true,
    },
    endDate: {
      type: Date,
      default: null,
      index: true,
    },
    durationDays: {
      type: Number,
      min: 1,
      default: 1,
    },
    status: {
      type: String,
      enum: {
        values: ["open", "in_review", "done", "rejected", "approved"],
        message: "{VALUE} is not a valid task status",
      },
      default: "open",
      index: true,
    },
    submissionNote: {
      type: String,
      trim: true,
      maxlength: [2500, "Submission note cannot exceed 2500 characters"],
      default: "",
    },
    evidenceUrl: {
      type: String,
      trim: true,
      default: "",
    },
    reviewStartedAt: {
      type: Date,
      default: null,
      index: true,
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
    weightedVoteYes: {
      type: Number,
      default: 0,
      min: 0,
    },
    weightedVoteNo: {
      type: Number,
      default: 0,
      min: 0,
    },
    eligibleVoterCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    requiredVotes: {
      type: Number,
      default: 1,
      min: 1,
    },
    votedBy: {
      type: [String],
      default: [],
    },
    decidedByWallet: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Task", taskSchema);
