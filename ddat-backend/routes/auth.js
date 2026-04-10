const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const { ethers } = require("ethers");
const User = require("../models/User");
const AuthNonce = require("../models/AuthNonce");
const { APP_ORGANIZATION } = require("../config/app");
const { requireAuth, signAuthToken } = require("../middleware/auth");

const router = express.Router();

const nonceStore = new Map();
const NONCE_TTL_MS = Number(process.env.AUTH_NONCE_TTL_MS || 5 * 60 * 1000);

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

function cleanupNonce(walletAddress) {
  nonceStore.delete(walletAddress);
}

function sweepExpiredInMemoryNonces(now = Date.now()) {
  for (const [walletAddress, entry] of nonceStore.entries()) {
    if (!entry || Number(entry.expiresAt || 0) <= now) {
      nonceStore.delete(walletAddress);
    }
  }
}

async function storeNonce(walletAddress, nonce, expiresAtMs) {
  if (isMongoReady()) {
    await AuthNonce.findOneAndUpdate(
      { walletAddress },
      {
        walletAddress,
        nonce,
        expiresAt: new Date(expiresAtMs),
      },
      {
        upsert: true,
      },
    );
    return;
  }

  sweepExpiredInMemoryNonces();
  nonceStore.set(walletAddress, { nonce, expiresAt: expiresAtMs });
}

async function getNonceEntry(walletAddress) {
  if (isMongoReady()) {
    const entry = await AuthNonce.findOne({ walletAddress }).lean();
    if (!entry) return null;
    return {
      nonce: entry.nonce,
      expiresAt: new Date(entry.expiresAt).getTime(),
    };
  }

  sweepExpiredInMemoryNonces();
  return nonceStore.get(walletAddress) || null;
}

async function deleteNonce(walletAddress) {
  if (isMongoReady()) {
    await AuthNonce.deleteOne({ walletAddress });
    return;
  }

  cleanupNonce(walletAddress);
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
  try {
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

    await storeNonce(walletAddress, nonce, expiresAt);

    return res.json({
      success: true,
      data: {
        walletAddress,
        nonce,
        message: buildAuthMessage(walletAddress, nonce),
        expiresAt,
      },
    });
  } catch (error) {
    console.error("Nonce generation failed:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to generate auth challenge",
    });
  }
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

  const nonceEntry = await getNonceEntry(walletAddress);
  if (!nonceEntry || nonceEntry.expiresAt < Date.now()) {
    await deleteNonce(walletAddress);
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

    await deleteNonce(walletAddress);

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
