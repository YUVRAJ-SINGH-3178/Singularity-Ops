const express = require("express");
const router = express.Router();
const { ethers } = require("ethers");
const Commitment = require("../models/Commitment");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

router.use(requireAuth);

function parsePagination(query) {
  const page = Math.max(DEFAULT_PAGE, Number(query?.page) || DEFAULT_PAGE);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(query?.pageSize) || DEFAULT_PAGE_SIZE),
  );
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}

// ─── POST /api/commitment — Create a new commitment ────────────────────────
router.post("/", async (req, res) => {
  try {
    const { goalText, durationDays, stakeAmount, contractCommitmentId } =
      req.body;
    const walletAddress = req.auth.walletAddress;

    // Validate required fields
    if (!goalText || !durationDays || !stakeAmount) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: goalText, durationDays, stakeAmount",
      });
    }

    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet address",
      });
    }

    if (!Number.isFinite(Number(durationDays)) || Number(durationDays) < 1) {
      return res.status(400).json({
        success: false,
        error: "durationDays must be a number >= 1",
      });
    }

    if (!Number.isFinite(Number(stakeAmount)) || Number(stakeAmount) <= 0) {
      return res.status(400).json({
        success: false,
        error: "stakeAmount must be a positive number",
      });
    }

    // Upsert user (create if doesn't exist)
    await User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { walletAddress: walletAddress.toLowerCase() },
      { upsert: true, new: true },
    );

    // Create commitment
    const commitment = await Commitment.create({
      walletAddress: walletAddress.toLowerCase(),
      goalText,
      durationDays,
      stakeAmount,
      contractCommitmentId: contractCommitmentId ?? null,
      status: "created",
    });

    res.status(201).json({
      success: true,
      data: commitment,
    });
  } catch (error) {
    console.error("Error creating commitment:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to create commitment",
    });
  }
});

// ─── GET /api/commitments/:walletAddress — Get user's commitments ───────────
router.get("/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { page, pageSize, skip } = parsePagination(req.query);

    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet address",
      });
    }

    const normalizedWallet = walletAddress.toLowerCase();
    if (normalizedWallet !== req.auth.walletAddress) {
      return res.status(403).json({
        success: false,
        error: "Wallet mismatch",
      });
    }

    const query = {
      walletAddress: normalizedWallet,
    };

    const total = await Commitment.countDocuments(query);

    const commitments = await Commitment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    // Build a stable per-user display index (starts at 0).
    // Index is based on oldest -> newest creation order.
    const oldestFirst = [...commitments].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );
    const localIndexById = new Map(
      oldestFirst.map((commitment, idx) => [String(commitment._id), idx]),
    );

    const commitmentsWithLocalId = commitments.map((commitment) => ({
      ...commitment.toObject(),
      localCommitmentId: localIndexById.get(String(commitment._id)),
    }));

    res.json({
      success: true,
      count: commitmentsWithLocalId.length,
      data: commitmentsWithLocalId,
      pagination: {
        page,
        pageSize,
        total,
        hasMore: skip + commitmentsWithLocalId.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching commitments:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch commitments",
    });
  }
});

module.exports = router;
