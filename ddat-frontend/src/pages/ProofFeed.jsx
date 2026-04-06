import { useEffect, useMemo, useState } from "react";
import { canVote, normalizeRole } from "../lib/roleUtils";
import {
  finalizeInReview,
  listInReviewTasksByOrganization,
  listLabs,
  voteTask,
} from "../lib/taskApi";
import { getUserProfile } from "../lib/userApi";

export default function ProofFeed({ wallet }) {
  const [profile, setProfile] = useState(null);
  const [labs, setLabs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingVoteFor, setSubmittingVoteFor] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadQueue = async (walletAddress) => {
    try {
      await finalizeInReview().catch(() => {});

      const [profilePayload, labsPayload] = await Promise.all([
        getUserProfile(walletAddress),
        listLabs(),
      ]);

      if (profilePayload.success) setProfile(profilePayload.data);
      if (labsPayload.success) setLabs(labsPayload.data || []);

      const organization = profilePayload?.data?.organization;
      const queuePayload = await listInReviewTasksByOrganization(organization);
      if (queuePayload.success) setTasks(queuePayload.data || []);
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: err.message || "Could not load vote queue.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!wallet) return;
    loadQueue(wallet);

    const poll = setInterval(() => {
      loadQueue(wallet);
    }, 5000);

    return () => clearInterval(poll);
  }, [wallet]);

  const voteable = useMemo(() => {
    return tasks.filter((task) => task.status === "in_review");
  }, [tasks]);

  const castVote = async (taskId, vote) => {
    if (!wallet) {
      setMessage({ type: "error", text: "Connect wallet to vote." });
      return;
    }

    const normalizedRole = normalizeRole(profile?.role);
    if (!canVote(normalizedRole)) {
      setMessage({
        type: "error",
        text: "Only affiliates and executives can cast votes.",
      });
      return;
    }

    if (submittingVoteFor) return;

    setSubmittingVoteFor(taskId);
    setMessage({ type: "", text: "" });

    try {
      const payload = await voteTask(taskId, {
        vote,
      });

      const verdict = payload.data.thresholdReached
        ? payload.data.approved
          ? "Task done"
          : "Task rejected"
        : "Vote recorded";

      setMessage({
        type: "success",
        text: `${verdict}. ${payload.data.voteYes} yes / ${payload.data.voteNo} no. Weighted ${payload.data.weightedVoteYes?.toFixed?.(2) ?? payload.data.weightedVoteYes} / ${payload.data.weightedVoteNo?.toFixed?.(2) ?? payload.data.weightedVoteNo}.`,
      });
      await loadQueue(wallet);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Vote failed." });
    } finally {
      setSubmittingVoteFor("");
    }
  };

  return (
    <div className="max-w-5xl mx-auto anim-in pt-8 px-4 pb-20">
      <div className="mb-10 border-l-8 border-[var(--color-yellow)] pl-6">
        <h1 className="text-5xl md:text-7xl font-heading font-black tracking-tighter text-white uppercase leading-[0.9]">
          Daily Vote
          <br />
          Queue
        </h1>
        <p className="mt-4 text-xl font-bold text-white/60">
          Enterprise validation for submitted work across Singularity Labs.
        </p>
      </div>

      {message.text && (
        <div
          className={`mb-6 border-2 border-black rounded-xl p-4 font-bold uppercase text-sm shadow-hard ${message.type === "error" ? "bg-[#ff5f57] text-white" : "bg-[var(--color-sage)] text-black"}`}
        >
          {message.text}
        </div>
      )}

      <div className="mb-6 bg-white border-2 border-black rounded-xl p-4 shadow-hard">
        <p className="text-xs font-bold uppercase text-black/60">
          Reviewer Role: {normalizeRole(profile?.role)} • Organization:{" "}
          {profile?.organization || "Not set"}
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 justify-center py-20 bg-[var(--color-charcoal)] border-2 border-[var(--color-yellow)] rounded-2xl shadow-[8px_8px_0_0_var(--color-yellow)]">
          <div className="spinner border-[var(--color-yellow)] border-t-[var(--color-yellow)]" />
          <span className="text-[var(--color-yellow)] font-bold uppercase text-lg">
            Loading Queue...
          </span>
        </div>
      )}

      {!loading && voteable.length === 0 && (
        <div className="bg-[#f4f4f5] border-2 border-dashed border-black rounded-2xl p-16 text-center">
          <p className="text-black font-black uppercase text-2xl">
            No tasks in review
          </p>
          <p className="text-black/60 font-bold mt-2">
            The queue is currently empty.
          </p>
        </div>
      )}

      <div className="space-y-8 stagger">
        {voteable.map((task) => {
          const total = (task.voteYes || 0) + (task.voteNo || 0);
          const ratio = total > 0 ? (task.voteYes / total) * 100 : 0;
          const lab = labs.find((entry) => entry.key === task.labKey);
          const isSubmitting = submittingVoteFor === task._id;

          return (
            <div
              key={task._id}
              className="bg-white border-2 border-black rounded-2xl shadow-hard-lg overflow-hidden anim-in"
            >
              <div className="p-7 grid md:grid-cols-2 gap-7">
                <div>
                  <div className="inline-flex mb-3 bg-[var(--color-yellow)] border-2 border-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-black">
                    {lab?.name || task.labKey}
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-black mb-3">
                    {task.title}
                  </h3>
                  <p className="text-sm font-medium text-black/75 whitespace-pre-wrap">
                    {task.submissionNote || "No submission note provided."}
                  </p>
                  <div className="mt-4 text-xs font-bold uppercase text-black/55">
                    Work Date: {new Date(task.workDate).toLocaleDateString()}
                  </div>
                  <div className="mt-1 text-xs font-bold uppercase text-black/55 break-all">
                    Assignee: {task.assignedToWallet || "Self-owned"}
                  </div>
                  {task.evidenceUrl && (
                    <a
                      href={task.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-block neo-btn neo-btn-white translate-push"
                    >
                      Open Evidence
                    </a>
                  )}
                </div>

                <div>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-black mb-2">
                      <span>Current Consensus</span>
                      <span>
                        {total > 0 ? `${ratio.toFixed(0)}% Yes` : "No votes"}
                      </span>
                    </div>
                    <div className="h-4 w-full bg-[#f4f4f5] border-2 border-black rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-[var(--color-yellow)] transition-all duration-500 border-r-2 border-black"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-bold uppercase text-black/60">
                      {task.voteYes || 0} yes • {task.voteNo || 0} no
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase text-black/50">
                      Weighted: {(task.weightedVoteYes || 0).toFixed(2)} yes •{" "}
                      {(task.weightedVoteNo || 0).toFixed(2)} no
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase text-black/50">
                      Needed: {task.requiredVotes || 1} of{" "}
                      {task.eligibleVoterCount || "?"} eligible voters
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <button
                      onClick={() => castVote(task._id, "yes")}
                      disabled={isSubmitting}
                      className="neo-btn justify-center bg-[var(--color-sage)] text-black py-4 translate-push"
                    >
                      {isSubmitting ? "Voting..." : "Counts Today"}
                    </button>
                    <button
                      onClick={() => castVote(task._id, "no")}
                      disabled={isSubmitting}
                      className="neo-btn justify-center bg-[#ff5f57] text-white py-4 translate-push"
                    >
                      {isSubmitting ? "Voting..." : "Not Enough"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
