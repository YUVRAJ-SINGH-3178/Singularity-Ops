import { useEffect, useMemo, useState } from "react";
import { normalizeRole } from "../lib/roleUtils";
import { listTasksByWallet, submitTask } from "../lib/taskApi";
import { getUserProfile } from "../lib/userApi";

function isValidHttpUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return true;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export default function SubmitProof({ wallet }) {
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState("");
  const [submissionNote, setSubmissionNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);

  useEffect(() => {
    if (!wallet) return;

    const loadData = async () => {
      setLoadingMeta(true);
      try {
        const profilePayload = await getUserProfile(wallet);
        if (profilePayload.success) {
          setProfile(profilePayload.data);
        }

        const taskPayload = await listTasksByWallet(wallet, {
          page: 1,
          pageSize: 50,
        });
        if (taskPayload.success) {
          setTasks(taskPayload.data || []);
        }
      } catch (err) {
        setStatus({
          type: "error",
          message: err.message || "Failed to load your profile or task list.",
        });
      } finally {
        setLoadingMeta(false);
      }
    };

    loadData();
  }, [wallet]);

  const submittable = useMemo(() => {
    return tasks.filter((task) => task.status === "open");
  }, [tasks]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTask) {
      setStatus({ type: "error", message: "Select a task first." });
      return;
    }

    if (!submissionNote.trim()) {
      setStatus({ type: "error", message: "Submission note is required." });
      return;
    }

    if (!isValidHttpUrl(evidenceUrl)) {
      setStatus({
        type: "error",
        message: "Evidence URL must be a valid http or https URL.",
      });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      await submitTask(selectedTask, {
        submissionNote,
        evidenceUrl,
      });

      setStatus({
        type: "success",
        message: "Work submitted for enterprise review.",
      });
      setSubmissionNote("");
      setEvidenceUrl("");

      const taskPayload = await listTasksByWallet(wallet, {
        page: 1,
        pageSize: 50,
      });
      if (taskPayload.success) setTasks(taskPayload.data || []);
    } catch (err) {
      setStatus({
        type: "error",
        message: err.message || "Submission failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="neo-card p-12 max-w-md w-full">
          <h1 className="text-4xl font-black tracking-tight mb-4 uppercase">
            Connect Wallet
          </h1>
          <p className="text-black/70 font-medium mb-8">
            Connect your wallet to submit completed work.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto anim-in pt-8 px-4 pb-20">
      <div className="bg-[var(--color-sage)] border-2 border-black rounded-t-2xl p-8 shadow-hard relative z-10">
        <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tighter mb-4 text-black uppercase leading-[0.9]">
          Submit Daily
          <br />
          Work
        </h1>
        <p className="font-bold text-black/70">
          Push today&apos;s output into the enterprise voting queue.
        </p>
      </div>

      <div className="bg-white border-x-2 border-b-2 border-black rounded-b-2xl p-8 shadow-hard relative z-0 -mt-2">
        <div className="mb-4 bg-[#f4f4f5] border-2 border-black rounded-lg p-3">
          <p className="font-bold text-sm uppercase text-black/70">
            Role: {normalizeRole(profile?.role)} • Org:{" "}
            {profile?.organization || "Not set"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">
              Task
            </label>
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              className="neo-input"
              disabled={loading || loadingMeta}
            >
              <option value="">Select a task</option>
              {submittable.map((task) => (
                <option key={task._id} value={task._id}>
                  {task.title} • {task.status}
                </option>
              ))}
            </select>
            {submittable.length === 0 && (
              <p className="text-xs font-bold uppercase text-[#ff5f57] mt-2">
                No open tasks available for submission.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">
              Submission Note
            </label>
            <textarea
              value={submissionNote}
              onChange={(e) => setSubmissionNote(e.target.value)}
              rows={4}
              className="neo-input resize-y"
              placeholder="Share what was completed today and how it was validated"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">
              Evidence URL (Optional)
            </label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              className="neo-input"
              placeholder="https://github.com/org/repo/pull/123"
              disabled={loading}
            />
          </div>

          {status.message && (
            <div
              className={`border-2 border-black rounded-lg p-3 shadow-hard ${status.type === "error" ? "bg-[#ff5f57] text-white" : "bg-[var(--color-sage)] text-black"}`}
            >
              <p className="font-bold uppercase text-xs tracking-wide">
                {status.message}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="neo-btn neo-btn-sage w-full justify-center py-4 text-lg translate-push mt-1"
          >
            {loading ? "Submitting..." : "Send For Voting"}
          </button>
        </form>
      </div>
    </div>
  );
}
