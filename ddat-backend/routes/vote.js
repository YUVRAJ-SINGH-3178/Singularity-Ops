const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Proof = require("../models/Proof");
const Commitment = require("../models/Commitment");
const { settleCommitment } = require("../services/contractService");
const { requireAuth } = require("../middleware/auth");

// Minimum total votes before the threshold check kicks in
const VOTE_THRESHOLD = parseInt(process.env.VOTE_THRESHOLD, 10) || 5;

router.use(requireAuth);

// ─── POST /api/vote/:proofId — Cast a vote on a proof ───────────────────────
router.post("/:proofId", async (req, res) => {
  try {
    const { proofId } = req.params;
    const { vote } = req.body;
    const walletAddress = req.auth.walletAddress;

    if (!mongoose.Types.ObjectId.isValid(proofId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid proof id",
      });
    }

    // ── Validate input ──────────────────────────────────────────────────
    if (!walletAddress || !vote) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: vote (yes/no)",
      });
    }

    const normalizedVote = vote.toLowerCase();
    if (normalizedVote !== "yes" && normalizedVote !== "no") {
      return res.status(400).json({
        success: false,
        error: "Vote must be 'yes' or 'no'",
      });
    }

    // ── Find the proof ──────────────────────────────────────────────────
    const proof = await Proof.findById(proofId);
    if (!proof) {
      return res.status(404).json({
        success: false,
        error: "Proof not found",
      });
    }

    if (proof.status && proof.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "This proof is already resolved",
      });
    }

    if (!proof.status) {
      proof.status = "pending";
    }

    // ── Check the parent commitment is still active ─────────────────────
    const commitment = await Commitment.findById(proof.commitmentId);
    if (!commitment || !["proving", "active"].includes(commitment.status)) {
      return res.status(400).json({
        success: false,
        error: "This commitment is no longer accepting votes",
      });
    }

    // Proof owner cannot vote on their own evidence.
    if (commitment.walletAddress === walletAddress.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: "You cannot vote on your own proof",
      });
    }

    // ── Prevent double voting ───────────────────────────────────────────
    if (proof.votedBy.includes(walletAddress.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: "You have already voted on this proof",
      });
    }

    // ── Record the vote ─────────────────────────────────────────────────
    if (normalizedVote === "yes") {
      proof.voteYes += 1;
    } else {
      proof.voteNo += 1;
    }
    proof.votedBy.push(walletAddress.toLowerCase());
    await proof.save();

    // ── Threshold check + on-chain settlement ───────────────────────────
    const totalVotes = proof.voteYes + proof.voteNo;
    let thresholdResult = null;
    let onChainTx = null;

    if (totalVotes >= VOTE_THRESHOLD) {
      const yesPercentage = (proof.voteYes / totalVotes) * 100;
      const proofAccepted = yesPercentage >= 60;

      proof.status = proofAccepted ? "accepted" : "rejected";
      proof.resolvedAt = new Date();
      await proof.save();

      if (proofAccepted) {
        commitment.acceptedProofCount =
          (commitment.acceptedProofCount || 0) + 1;

        if (commitment.acceptedProofCount >= commitment.durationDays) {
          commitment.status = "settled_success";
          thresholdResult = "settled_success";
        } else {
          commitment.status = "created";
          thresholdResult = "created";
        }
      } else {
        commitment.status = "settled_failed";
        thresholdResult = "settled_failed";
      }
      await commitment.save();

      // ── Auto-settle on-chain only when commitment is finally settled ─
      if (
        commitment.contractCommitmentId != null &&
        ["settled_success", "settled_failed"].includes(commitment.status)
      ) {
        try {
          console.log(
            `\n🗳️  Vote threshold reached for commitment ${commitment._id}`,
          );
          console.log(
            `   Votes: ${proof.voteYes} yes / ${proof.voteNo} no (${yesPercentage.toFixed(1)}% yes)`,
          );
          console.log(`   Result: ${thresholdResult} → settling on-chain...\n`);

          onChainTx = await settleCommitment(
            commitment.contractCommitmentId,
            commitment.status === "settled_success",
          );
        } catch (chainError) {
          // Log but don't fail the vote — the DB status is already updated
          console.error(
            "⚠️  On-chain settlement failed (vote was still recorded):",
            chainError.message,
          );
          onChainTx = { error: chainError.message };
        }
      } else {
        console.log(
          `⚠️  Threshold reached but no contractCommitmentId set — skipping on-chain settlement`,
        );
      }
    }

    res.json({
      success: true,
      data: {
        voteYes: proof.voteYes,
        voteNo: proof.voteNo,
        votedBy: proof.votedBy,
        proofStatus: proof.status,
        currentDay: proof.dayNumber,
        acceptedProofCount: commitment.acceptedProofCount || 0,
        requiredProofCount: commitment.durationDays,
        totalVotes,
        thresholdReached: totalVotes >= VOTE_THRESHOLD,
        commitmentStatus: thresholdResult || commitment.status,
        onChainSettlement: onChainTx,
      },
    });
  } catch (error) {
    console.error("Error casting vote:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to cast vote",
    });
  }
});

module.exports = router;
