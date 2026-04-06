import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { normalizeRole } from "../lib/roleUtils";
import { finalizeInReview, listLabs, listTasksByWallet } from "../lib/taskApi";
import { getUserProfile } from "../lib/userApi";
import { APP_ORGANIZATION } from "../config";

function statusBadge(status) {
  if (status === "done") return "tag-settled";
  if (status === "approved") return "tag-settled";
  if (status === "in_review") return "tag-active";
  if (status === "rejected") return "tag-failed";
  return "tag-pending";
}

export default function Dashboard({ wallet }) {
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (!wallet) return;

    let mounted = true;

    const loadWorkspace = async () => {
      setLoading(true);
      try {
        if (wallet) {
          await finalizeInReview().catch(() => {});
        }

        const [labsPayload, profilePayload] = await Promise.all([
          listLabs(),
          getUserProfile(wallet),
        ]);

        if (!mounted) return;

        if (labsPayload?.success) setLabs(labsPayload.data || []);
        if (profilePayload?.success) {
          setProfile(profilePayload.data || null);
          setProfileLoaded(true);
        }

        const taskPayload = await listTasksByWallet(wallet);

        if (!mounted) return;

        if (taskPayload?.success) {
          setTasks(taskPayload.data || []);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setNotice(
            err.message ||
              "Could not load workspace data. Please refresh after backend is up.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadWorkspace();
    const t = setInterval(loadWorkspace, 5000);

    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [wallet]);

  const stats = useMemo(() => {
    const inReview = tasks.filter((t) => t.status === "in_review").length;
    const done = tasks.filter((t) =>
      ["done", "approved"].includes(t.status),
    ).length;
    const rejected = tasks.filter((t) => t.status === "rejected").length;
    return {
      total: tasks.length,
      inReview,
      done,
      rejected,
    };
  }, [tasks]);

  if (!wallet) {
    return (
      <div className="w-full flex-1 -mt-20">
        <div className="w-full min-h-[90vh] bg-yellow-dots border-b-4 border-black pt-32 pb-20 px-6 flex items-center">
          <div className="max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 relative z-10">
              <div className="inline-flex items-center gap-2 bg-white px-4 py-2 border-2 border-black rounded-full shadow-hard text-sm font-bold text-black uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-[#ff5f57] animate-pulse"></span>
                Enterprise Work Validation
              </div>

              <h1 className="text-6xl sm:text-7xl lg:text-[5.2rem] font-black leading-[1.03] tracking-tighter text-black uppercase">
                Build Teams.
                <br />
                Ship Daily.
                <br />
                Validate Work.
              </h1>

              <p className="text-xl font-medium text-black/80 max-w-xl leading-relaxed">
                Singularity Ops is focused on enterprise delivery: create tasks
                by lab, let employees submit work, and run daily votes to decide
                if work counts.
              </p>
            </div>

            <div className="bg-white border-2 border-black rounded-2xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden hidden md:block -rotate-1">
              <div className="bg-black px-4 py-3 border-b-2 border-black text-[var(--color-yellow)] font-black uppercase tracking-wider">
                Singularity Labs
              </div>
              <div className="p-6 bg-[#f4f4f5] space-y-3">
                <div className="neo-card p-4">
                  Bhaskarcharya Lab • Web3 and Blockchain
                </div>
                <div className="neo-card p-4">
                  Prajna Kritrima Lab • AI and Generative AI
                </div>
                <div className="neo-card p-4">
                  Varahamihira Lab • Cloud and Cybersecurity
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const profileReady = Boolean(
    profile?.organization &&
    profile?.displayName &&
    normalizeRole(profile?.role),
  );
  const userLab = labs.find((lab) => lab.key === profile?.labKey);

  return (
    <div className="anim-in mx-auto w-full pt-8 px-4 pb-20">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl sm:text-5xl font-heading font-black uppercase tracking-tight text-white">
            Workspace Overview
          </h1>
          <p className="text-white/70 font-bold mt-2">
            {profile?.organization || APP_ORGANIZATION}
            {userLab ? ` • ${userLab.name}` : ""}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/create" className="neo-btn neo-btn-yellow translate-push">
            Create Task
          </Link>
          <Link to="/feed" className="neo-btn neo-btn-sage translate-push">
            Vote Queue
          </Link>
        </div>
      </div>

      {profileLoaded && !profileReady && (
        <div className="mb-6 bg-[#ff5f57] border-2 border-black rounded-xl p-4 shadow-hard">
          <p className="font-bold uppercase text-sm tracking-wide text-white">
            Complete your profile in Settings before creating enterprise tasks.
          </p>
        </div>
      )}

      {notice && (
        <div className="mb-6 bg-[#ff5f57] border-2 border-black rounded-xl p-4 shadow-hard">
          <p className="font-bold uppercase text-xs tracking-wide text-white">
            {notice}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="neo-card p-5">
          <p className="text-xs font-bold uppercase text-black/60">
            Total Tasks
          </p>
          <p className="text-4xl font-heading font-black">{stats.total}</p>
        </div>
        <div className="neo-card p-5 bg-[var(--color-yellow)]">
          <p className="text-xs font-bold uppercase text-black/60">In Review</p>
          <p className="text-4xl font-heading font-black">{stats.inReview}</p>
        </div>
        <div className="neo-card p-5 bg-[var(--color-sage)]">
          <p className="text-xs font-bold uppercase text-black/60">Done</p>
          <p className="text-4xl font-heading font-black">{stats.done}</p>
        </div>
        <div className="neo-card p-5 bg-[#ffddd9]">
          <p className="text-xs font-bold uppercase text-black/60">Rejected</p>
          <p className="text-4xl font-heading font-black">{stats.rejected}</p>
        </div>
      </div>

      <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-hard">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black uppercase">Recent Tasks</h2>
          {loading && <div className="spinner" />}
        </div>

        {tasks.length === 0 ? (
          <div className="bg-[#f4f4f5] border-2 border-dashed border-black/30 rounded-xl p-12 text-center">
            <p className="font-bold uppercase text-black/60 mb-4">
              No tasks yet
            </p>
            <Link to="/create" className="neo-btn translate-push">
              Create First Task
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.slice(0, 8).map((task) => (
              <div
                key={task._id}
                className="border-2 border-black/20 rounded-xl p-4 grid sm:grid-cols-5 gap-3 items-center"
              >
                <div className="sm:col-span-2">
                  <p className="font-black text-black uppercase leading-tight">
                    {task.title}
                  </p>
                  <p className="text-xs font-bold text-black/60 mt-1 uppercase">
                    {new Date(task.workDate).toLocaleDateString()}
                    {task.endDate
                      ? ` - ${new Date(task.endDate).toLocaleDateString()}`
                      : ""}
                    {` • ${task.source}`}
                  </p>
                </div>
                <div className="text-xs font-bold uppercase text-black/70">
                  {labs.find((lab) => lab.key === task.labKey)?.name ||
                    task.labKey}
                </div>
                <div className="text-xs font-bold uppercase text-black/70 break-all">
                  {task.assignedToWallet || "Self-owned"}
                </div>
                <div>
                  <span className={`tag ${statusBadge(task.status)}`}>
                    {task.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
