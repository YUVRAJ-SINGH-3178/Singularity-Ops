const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { ethers } = require("ethers");
const Proof = require("../models/Proof");
const Commitment = require("../models/Commitment");
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

function getBase64ImageBytes(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return 0;
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) return 0;
  const base64Part = dataUrl.slice(commaIdx + 1);
  return Buffer.byteLength(base64Part, "base64");
}

// ─── POST /api/proof/:commitmentId — Submit proof for a commitment ──────────
router.post("/:commitmentId", async (req, res) => {
  try {
    const { commitmentId } = req.params;
    const { description, imageUrl } = req.body;
    const walletAddress = req.auth.walletAddress;

    if (!mongoose.Types.ObjectId.isValid(commitmentId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid commitment id",
      });
    }

    // Validate required fields
    if (!walletAddress || !description) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: description",
      });
    }

    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: "Invalid wallet address",
      });
    }

    if (typeof description !== "string" || description.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: "Description must be at least 5 characters",
      });
    }

    if (
      imageUrl &&
      typeof imageUrl === "string" &&
      imageUrl.startsWith("data:image/")
    ) {
      const imageBytes = getBase64ImageBytes(imageUrl);
      if (imageBytes > 2 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          error: "Image is too large (max 2MB)",
        });
      }
    }

    // Check commitment exists
    const commitment = await Commitment.findById(commitmentId);
    if (!commitment) {
      return res.status(404).json({
        success: false,
        error: "Commitment not found",
      });
    }

    // Verify the caller owns this commitment
    if (commitment.walletAddress !== walletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: "Only the commitment owner can submit proof",
      });
    }

    // Check commitment is in a valid state for proof submission
    if (
      commitment.status === "settled_success" ||
      commitment.status === "settled_failed" ||
      commitment.status === "completed" ||
      commitment.status === "failed"
    ) {
      return res.status(400).json({
        success: false,
        error: `Commitment is already ${commitment.status}`,
      });
    }

    if (commitment.acceptedProofCount >= commitment.durationDays) {
      return res.status(400).json({
        success: false,
        error: "Commitment already has all required accepted proofs",
      });
    }

    // Allow only one proof under vote at a time.
    const pendingProof = await Proof.findOne({
      commitmentId,
      status: "pending",
    });
    if (pendingProof) {
      return res.status(400).json({
        success: false,
        error:
          "A proof is already in voting. Wait for it to be resolved before submitting the next day.",
      });
    }

    const nextDayNumber = (commitment.acceptedProofCount || 0) + 1;

    // Create proof
    const proof = await Proof.create({
      commitmentId,
      walletAddress: walletAddress.toLowerCase(),
      description,
      dayNumber: nextDayNumber,
      status: "pending",
      imageUrl: imageUrl || "",
    });

    // Move commitment into voting phase after proof submission.
    commitment.status = "proving";
    await commitment.save();

    res.status(201).json({
      success: true,
      data: proof,
    });
  } catch (error) {
    console.error("Error submitting proof:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to submit proof",
    });
  }
});

// ─── GET /api/proofs/feed — Get all proofs needing votes ────────────────────
router.get("/feed", async (req, res) => {
  try {
    const { page, pageSize, skip } = parsePagination(req.query);
    // Find proofs whose parent commitment is still in voting phase.
    const activeCommitmentIds = await Commitment.find({
      status: { $in: ["proving", "active"] },
    }).distinct("_id");

    const query = {
      commitmentId: { $in: activeCommitmentIds },
      $or: [
        { status: "pending" },
        { status: { $exists: false } },
        { status: null },
      ],
    };

    const total = await Proof.countDocuments(query);

    const proofs = await Proof.find(query)
      .populate(
        "commitmentId",
        "walletAddress goalText durationDays stakeAmount status contractCommitmentId",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    res.json({
      success: true,
      count: proofs.length,
      data: proofs,
      pagination: {
        page,
        pageSize,
        total,
        hasMore: skip + proofs.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching proof feed:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch proof feed",
    });
  }
});

module.exports = router;
