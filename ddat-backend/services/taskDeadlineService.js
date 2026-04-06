const Task = require("../models/Task");

const DEFAULT_DEADLINE_SWEEP_MS = Number(
  process.env.TASK_DEADLINE_SWEEP_MS || 60_000,
);
const SYSTEM_DECISION_WALLET = "system_deadline";
const TASK_AUTO_REJECT_HOURS = Math.max(
  1,
  parseInt(process.env.TASK_AUTO_REJECT_HOURS, 10) || 24,
);

function getAutoRejectCutoff(now = new Date()) {
  return new Date(now.getTime() - TASK_AUTO_REJECT_HOURS * 60 * 60 * 1000);
}

function buildExpiredOpenTasksQuery(now = new Date()) {
  const cutoff = getAutoRejectCutoff(now);

  return {
    status: "open",
    createdAt: { $lt: cutoff },
  };
}

function buildExpiredInReviewTasksQuery(now = new Date()) {
  const cutoff = getAutoRejectCutoff(now);

  return {
    status: "in_review",
    $or: [
      { reviewStartedAt: { $lt: cutoff } },
      {
        reviewStartedAt: { $in: [null, undefined] },
        createdAt: { $lt: cutoff },
      },
    ],
  };
}

async function rejectExpiredOpenTasks(now = new Date()) {
  const openResult = await Task.updateMany(buildExpiredOpenTasksQuery(now), {
    $set: {
      status: "rejected",
      decidedByWallet: SYSTEM_DECISION_WALLET,
      resolvedAt: now,
    },
  });

  const inReviewResult = await Task.updateMany(
    buildExpiredInReviewTasksQuery(now),
    {
      $set: {
        status: "rejected",
        decidedByWallet: SYSTEM_DECISION_WALLET,
        resolvedAt: now,
      },
    },
  );

  return (openResult.modifiedCount || 0) + (inReviewResult.modifiedCount || 0);
}

function startTaskDeadlineWatcher(options = {}) {
  const intervalMs = Number(options.intervalMs || DEFAULT_DEADLINE_SWEEP_MS);
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error("TASK_DEADLINE_SWEEP_MS must be a positive number");
  }

  const runSweep = async () => {
    try {
      const rejectedCount = await rejectExpiredOpenTasks();
      if (rejectedCount > 0) {
        console.log(
          `[task-deadline] Auto-rejected ${rejectedCount} overdue task(s)`,
        );
      }
    } catch (error) {
      console.error("[task-deadline] Sweep failed:", error.message);
    }
  };

  void runSweep();
  const timer = setInterval(() => {
    void runSweep();
  }, intervalMs);
  timer.unref();

  return timer;
}

module.exports = {
  SYSTEM_DECISION_WALLET,
  rejectExpiredOpenTasks,
  startTaskDeadlineWatcher,
};
