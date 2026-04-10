const express = require("express");
const Commitment = require("../models/Commitment");
const User = require("../models/User");
const { APP_ORGANIZATION } = require("../config/app");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function normalizeRole(inputRole) {
  const value = String(inputRole || "")
    .trim()
    .toLowerCase();

  if (value === "enterprise_admin") return "executive";
  if (value === "employee") return "member";
  if (["member", "affiliate", "executive"].includes(value)) return value;

  return "member";
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePagination(query) {
  const page = Math.max(DEFAULT_PAGE, Number(query?.page) || DEFAULT_PAGE);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(query?.pageSize) || DEFAULT_PAGE_SIZE),
  );
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}

/**
 * GET /api/user/:wallet/profile
 * Fetch or bootstrap a user profile
 */
router.get("/:wallet/profile", async (req, res) => {
  try {
    const { wallet } = req.params;

    if (!wallet || typeof wallet !== "string" || wallet.length < 5) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid wallet address" });
    }

    const normalizedWallet = wallet.toLowerCase().trim();
    if (normalizedWallet !== req.auth.walletAddress) {
      return res
        .status(403)
        .json({ success: false, message: "Wallet mismatch" });
    }
    let user = await User.findOne({ walletAddress: normalizedWallet });

    if (!user) {
      user = await User.create({
        walletAddress: normalizedWallet,
        organization: APP_ORGANIZATION,
      });
    } else if (String(user.organization || "").trim() !== APP_ORGANIZATION) {
      user.organization = APP_ORGANIZATION;
      await user.save();
    }

    res.json({
      success: true,
      data: {
        walletAddress: user.walletAddress,
        displayName: user.displayName || "",
        email: user.email || "",
        role: normalizeRole(user.role),
        organization: user.organization || "",
        labKey: user.labKey || "",
        requestedRole: user.requestedRole,
        requestedRoleAt: user.requestedRoleAt,
      },
    });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch profile" });
  }
});

/**
 * POST /api/user/:wallet/profile
 * Create or update a user profile
 */
router.post("/:wallet/profile", async (req, res) => {
  try {
    const { wallet } = req.params;
    const {
      displayName = "",
      email = "",
      role = "member",
      organization = "",
      labKey = "",
    } = req.body || {};

    if (!wallet || typeof wallet !== "string" || wallet.length < 5) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid wallet address" });
    }

    // Validate email domain
    if (email && !String(email).toLowerCase().endsWith("@srmap.edu.in")) {
      return res.status(400).json({
        success: false,
        message: "Email must be from @srmap.edu.in domain",
      });
    }

    const normalizedWallet = wallet.toLowerCase().trim();
    if (normalizedWallet !== req.auth.walletAddress) {
      return res
        .status(403)
        .json({ success: false, message: "Wallet mismatch" });
    }
    const currentUser = await User.findOne({ walletAddress: normalizedWallet });

    const currentRole = currentUser
      ? normalizeRole(currentUser.role)
      : "member";
    const newRole = normalizeRole(role);

    // Members/Affiliates can only request role changes, not apply them directly
    const isRoleChangeRequest =
      newRole !== currentRole && !["executive"].includes(currentRole);

    if (!["member", "affiliate", "executive"].includes(newRole)) {
      return res.status(400).json({
        success: false,
        message: "Role must be member, affiliate, or executive",
      });
    }

    const updateData = {
      walletAddress: normalizedWallet,
      displayName: String(displayName || "").trim(),
      email: String(email || "")
        .trim()
        .toLowerCase(),
      organization: APP_ORGANIZATION,
      labKey: String(labKey || "").trim(),
    };

    // If role change is requested by non-executive, store as pending
    if (isRoleChangeRequest) {
      updateData.requestedRole = newRole;
      updateData.requestedRoleAt = new Date();
    } else {
      // Executives can change their own role or approve role changes
      updateData.role = newRole;
      updateData.requestedRole = null;
      updateData.requestedRoleAt = null;
    }

    const user = await User.findOneAndUpdate(
      { walletAddress: normalizedWallet },
      updateData,
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    res.json({
      success: true,
      message: isRoleChangeRequest
        ? "Role change request submitted. Awaiting executive approval."
        : "Profile updated.",
      data: {
        walletAddress: user.walletAddress,
        displayName: user.displayName || "",
        email: user.email || "",
        role: normalizeRole(user.role),
        organization: user.organization || "",
        labKey: user.labKey || "",
        requestedRole: user.requestedRole,
        requestedRoleAt: user.requestedRoleAt,
      },
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update profile" });
  }
});

/**
 * GET /api/user/:wallet/activity
 * Fetch transaction history for a user
 */
router.get("/:wallet/activity", async (req, res) => {
  try {
    const { wallet } = req.params;

    // Validate wallet address
    if (!wallet || typeof wallet !== "string" || wallet.length < 5) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid wallet address" });
    }

    const normalizedWallet = wallet.toLowerCase();
    if (normalizedWallet !== req.auth.walletAddress) {
      return res
        .status(403)
        .json({ success: false, message: "Wallet mismatch" });
    }

    // Find all commitments by this wallet
    const commitments = await Commitment.find({
      walletAddress: normalizedWallet,
    }).sort({ createdAt: -1 });
    // Build activity array
    const activity = [];

    // Add commitment events
    commitments.forEach((commitment) => {
      activity.push({
        type: "commitment_created",
        timestamp: commitment.createdAt,
        details: `"${commitment.goalText}" • ${commitment.durationDays} days • ${commitment.stakeAmount} ETH`,
      });

      // Add settlement event if applicable
      if (commitment.status === "settled_success") {
        activity.push({
          type: "commitment_settled_success",
          timestamp: commitment.updatedAt,
          details: `Goal completed and settled successfully`,
        });
      } else if (commitment.status === "settled_failed") {
        activity.push({
          type: "commitment_settled_failed",
          timestamp: commitment.updatedAt,
          details: `Goal failed and commitment forfeited`,
        });
      }
    });

    // Note: We only show commitment-related activity (ETH staking/return/forfeit)
    // Proof activities are not included in regular transaction history

    // Sort by timestamp descending
    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ success: true, data: activity });
  } catch (err) {
    console.error("Error fetching activity:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch activity" });
  }
});

/**
 * GET /api/user/members/by-lab/:labKey
 * Fetch all members in a specific lab
 */
router.get("/members/by-lab/:labKey", async (req, res) => {
  try {
    const { labKey } = req.params;
    const { includeAll } = req.query;
    const { page, pageSize, skip } = parsePagination(req.query);

    if (!labKey || typeof labKey !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid lab key" });
    }

    const normalizedLabKey = String(labKey).trim();
    const normalizedLabKeyLower = normalizedLabKey.toLowerCase();
    const membersByLab = await User.find({
      labKey: {
        $regex: new RegExp(`^${escapeRegex(normalizedLabKeyLower)}$`, "i"),
      },
    }).sort({ displayName: 1 });
    let members = [...membersByLab];

    // Expand with organization teammates for better discoverability from executive dashboards.
    const requester = await User.findOne({
      walletAddress: req.auth.walletAddress,
    });
    const requesterOrganization = String(requester?.organization || "").trim();
    const requesterRole = normalizeRole(requester?.role);

    // Executives/Affiliates can assign broadly, so include all known user profiles.
    if (
      ["executive", "affiliate"].includes(requesterRole) ||
      String(includeAll || "") === "1"
    ) {
      const allUsers = await User.find({
        walletAddress: { $exists: true, $ne: "" },
      }).sort({ displayName: 1 });
      const byWallet = new Map();
      [...membersByLab, ...allUsers].forEach((member) => {
        byWallet.set(member.walletAddress, member);
      });
      members = Array.from(byWallet.values()).sort((a, b) => {
        const left = String(a.displayName || a.walletAddress).toLowerCase();
        const right = String(b.displayName || b.walletAddress).toLowerCase();
        return left.localeCompare(right);
      });
    }

    if (requesterOrganization) {
      const membersByOrganization = await User.find({
        organization: {
          $regex: new RegExp(`^${escapeRegex(requesterOrganization)}$`, "i"),
        },
      }).sort({ displayName: 1 });
      const byWallet = new Map();

      [...members, ...membersByOrganization].forEach((member) => {
        byWallet.set(member.walletAddress, member);
      });

      members = Array.from(byWallet.values()).sort((a, b) => {
        const left = String(a.displayName || a.walletAddress).toLowerCase();
        const right = String(b.displayName || b.walletAddress).toLowerCase();
        return left.localeCompare(right);
      });
    }
    // Last-resort fallback: return all profiles that have at least a wallet and display hint.
    if (members.length === 0) {
      members = await User.find({
        walletAddress: { $exists: true, $ne: "" },
      }).sort({ displayName: 1 });
    }

    const total = members.length;
    const pagedMembers = members.slice(skip, skip + pageSize);

    const data = pagedMembers.map((user) => ({
      walletAddress: user.walletAddress,
      displayName: user.displayName || user.walletAddress,
      email: user.email || "",
      role: normalizeRole(user.role),
      organization: user.organization || "",
      labKey: user.labKey,
    }));

    res.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        hasMore: skip + data.length < total,
      },
    });
  } catch (err) {
    console.error("Error fetching lab members:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch lab members" });
  }
});

/**
 * GET /api/user/role-requests/pending
 * Get all pending role change requests (for executives)
 */
router.get("/role-requests/pending", async (req, res) => {
  try {
    const { page, pageSize, skip } = parsePagination(req.query);
    const executive = await User.findOne({
      walletAddress: req.auth.walletAddress,
    });
    if (!executive || normalizeRole(executive.role) !== "executive") {
      return res.status(403).json({
        success: false,
        message: "Only executives can view role requests",
      });
    }

    const executiveLabKey = String(executive.labKey || "").trim();
    if (!executiveLabKey) {
      return res.json({ success: true, data: [] });
    }

    const requestsQuery = {
      requestedRole: { $ne: null },
      labKey: executiveLabKey,
    };

    const total = await User.countDocuments(requestsQuery);
    const requests = await User.find(requestsQuery)
      .sort({ requestedRoleAt: -1 })
      .skip(skip)
      .limit(pageSize);

    const data = requests.map((user) => ({
      walletAddress: user.walletAddress,
      displayName: user.displayName || user.walletAddress,
      email: user.email || "",
      currentRole: normalizeRole(user.role),
      requestedRole: user.requestedRole,
      requestedRoleAt: user.requestedRoleAt,
      organization: user.organization || "",
      labKey: user.labKey || "",
    }));

    res.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        hasMore: skip + data.length < total,
      },
    });
  } catch (err) {
    console.error("Error fetching role requests:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch role requests" });
  }
});

/**
 * POST /api/user/:wallet/approve-role
 * Executive approves a pending role change request
 */
router.post("/:wallet/approve-role", async (req, res) => {
  try {
    const { wallet } = req.params;
    const { approve = true } = req.body || {};

    if (!wallet) {
      return res
        .status(400)
        .json({ success: false, message: "wallet is required" });
    }

    // Verify executive role
    const executive = await User.findOne({
      walletAddress: req.auth.walletAddress,
    });
    if (!executive || normalizeRole(executive.role) !== "executive") {
      return res.status(403).json({
        success: false,
        message: "Only executives can approve role changes",
      });
    }

    const normalizedWallet = wallet.toLowerCase().trim();
    const user = await User.findOne({ walletAddress: normalizedWallet });

    if (!user || !user.requestedRole) {
      return res
        .status(404)
        .json({ success: false, message: "No pending role request found" });
    }

    const executiveLabKey = String(executive.labKey || "")
      .trim()
      .toLowerCase();
    const targetLabKey = String(user.labKey || "")
      .trim()
      .toLowerCase();
    if (!executiveLabKey || !targetLabKey || executiveLabKey !== targetLabKey) {
      return res.status(403).json({
        success: false,
        message: "You can only manage role requests from your own lab",
      });
    }

    if (approve) {
      user.role = user.requestedRole;
      user.requestedRole = null;
      user.requestedRoleAt = null;
    } else {
      user.requestedRole = null;
      user.requestedRoleAt = null;
    }

    await user.save();

    res.json({
      success: true,
      message: approve ? "Role change approved" : "Role change request denied",
      data: {
        walletAddress: user.walletAddress,
        displayName: user.displayName || "",
        email: user.email || "",
        role: normalizeRole(user.role),
        organization: user.organization || "",
        labKey: user.labKey || "",
      },
    });
  } catch (err) {
    console.error("Error approving role change:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to approve role change" });
  }
});

/**
 * DELETE /api/user/:wallet
 * Delete user account and all associated data
 */
router.delete("/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;

    // Validate wallet address
    if (!wallet || typeof wallet !== "string" || wallet.length < 5) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid wallet address" });
    }

    const normalizedWallet = wallet.toLowerCase();
    if (normalizedWallet !== req.auth.walletAddress) {
      return res
        .status(403)
        .json({ success: false, message: "Wallet mismatch" });
    }

    // Find and delete all commitments by this user
    const commitments = await Commitment.find({
      walletAddress: normalizedWallet,
    });
    const commitmentIds = commitments.map((c) => c._id);

    // Delete all proofs for these commitments
    await Proof.deleteMany({ commitmentId: { $in: commitmentIds } });

    // Delete all commitments
    await Commitment.deleteMany({ walletAddress: normalizedWallet });

    // Delete user record if exists
    await User.deleteOne({ walletAddress: normalizedWallet });

    res.json({
      success: true,
      message: "Account and all data deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting account:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete account" });
  }
});

module.exports = router;
