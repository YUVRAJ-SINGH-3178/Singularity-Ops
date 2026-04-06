const crypto = require("crypto");
const express = require("express");
const { ethers } = require("ethers");
const User = require("../models/User");
const { APP_ORGANIZATION } = require("../config/app");
const { requireAuth, signAuthToken } = require("../middleware/auth");

const router = express.Router();

const nonceStore = new Map();
const NONCE_TTL_MS = Number(process.env.AUTH_NONCE_TTL_MS || 5 * 60 * 1000);

function cleanupNonce(walletAddress) {
  nonceStore.delete(walletAddress);
}

function buildAuthMessage(walletAddress, nonce) {
  return [
    "DDAT Authentication",
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    `Organization: ${APP_ORGANIZATION}`,
  ].join("\n");
}

router.post("/nonce", async (req, res) => {
  const walletAddress = String(req.body?.walletAddress || "")
    .toLowerCase()
    .trim();

  if (!ethers.isAddress(walletAddress)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid wallet address" });
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const expiresAt = Date.now() + NONCE_TTL_MS;

  nonceStore.set(walletAddress, { nonce, expiresAt });

  return res.json({
    success: true,
    data: {
      walletAddress,
      nonce,
      message: buildAuthMessage(walletAddress, nonce),
      expiresAt,
    },
  });
});

router.post("/verify", async (req, res) => {
  const walletAddress = String(req.body?.walletAddress || "")
    .toLowerCase()
    .trim();
  const signature = String(req.body?.signature || "").trim();

  if (!ethers.isAddress(walletAddress)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid wallet address" });
  }

  if (!signature) {
    return res
      .status(400)
      .json({ success: false, error: "Signature is required" });
  }

  const nonceEntry = nonceStore.get(walletAddress);
  if (!nonceEntry || nonceEntry.expiresAt < Date.now()) {
    cleanupNonce(walletAddress);
    return res
      .status(401)
      .json({ success: false, error: "Nonce expired or not found" });
  }

  const message = buildAuthMessage(walletAddress, nonceEntry.nonce);

  try {
    const recoveredAddress = ethers
      .verifyMessage(message, signature)
      .toLowerCase();
    if (recoveredAddress !== walletAddress) {
      return res
        .status(401)
        .json({ success: false, error: "Signature verification failed" });
    }

    cleanupNonce(walletAddress);

    await User.findOneAndUpdate(
      { walletAddress },
      { $setOnInsert: { walletAddress, organization: APP_ORGANIZATION } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const token = signAuthToken(walletAddress);

    return res.json({
      success: true,
      data: {
        token,
        walletAddress,
        expiresIn: process.env.AUTH_JWT_EXPIRES_IN || "12h",
      },
    });
  } catch {
    return res
      .status(401)
      .json({ success: false, error: "Signature verification failed" });
  }
});

router.get("/session", requireAuth, (req, res) => {
  return res.json({
    success: true,
    data: {
      walletAddress: req.auth.walletAddress,
    },
  });
});

module.exports = router;
