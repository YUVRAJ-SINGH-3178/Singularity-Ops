const mongoose = require("mongoose");

const authNonceSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    nonce: {
      type: String,
      required: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: {
        expires: 0,
      },
    },
  },
  {
    timestamps: true,
  },
);

authNonceSchema.index({ walletAddress: 1, expiresAt: 1 });

module.exports = mongoose.model("AuthNonce", authNonceSchema);
