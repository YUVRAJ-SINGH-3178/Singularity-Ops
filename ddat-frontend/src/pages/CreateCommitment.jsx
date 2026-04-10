import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import MemberSelector from "../components/MemberSelector";
import { Calendar } from "../components/ui/calendar";
import { FALLBACK_LABS } from "../lib/labCatalog";
import {
  canCreateEnterpriseTask as canCreateEnterpriseTaskByRole,
  isMember,
  normalizeRole,
} from "../lib/roleUtils";
import { createTask, listLabs } from "../lib/taskApi";
import { getUserProfile } from "../lib/userApi";
import { APP_ORGANIZATION } from "../config";

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateInputValue(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function getDateDisplayValue(value) {
  const parsed = parseLocalDateInputValue(value);
  if (!parsed) return "Select date";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CreateCommitment({ wallet }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [labs, setLabs] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [labKey, setLabKey] = useState("");
  const [source, setSource] = useState("employee");
  const [assignedToWallet, setAssignedToWallet] = useState("");
  const [workDate, setWorkDate] = useState(() => getLocalDateInputValue());
  const [endDate, setEndDate] = useState(() => getLocalDateInputValue());
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [openPicker, setOpenPicker] = useState(null);
  const pickerAreaRef = useRef(null);

  useEffect(() => {
    if (!wallet) return;
    const loadMeta = async () => {
      try {
        const [labsPayload, profilePayload] = await Promise.all([
          listLabs(),
          getUserProfile(wallet),
        ]);

        if (labsPayload?.success) {
          const nextLabs = labsPayload.data || [];
          setLabs(nextLabs);
          if (!labKey && nextLabs?.[0]?.key) {
            setLabKey(nextLabs[0].key);
          }
        } else {
          setLabs(FALLBACK_LABS);
          if (!labKey && FALLBACK_LABS[0]?.key) {
            setLabKey(FALLBACK_LABS[0].key);
          }
        }

        if (profilePayload?.success) {
          setProfile(profilePayload.data);
          if (profilePayload.data?.labKey && !labKey) {
            setLabKey(profilePayload.data.labKey);
          }
          if (
            ["affiliate", "executive"].includes(
              normalizeRole(profilePayload.data?.role),
            )
          ) {
            setSource("enterprise");
          }
        }
      } catch (err) {
        setStatus({
          type: "error",
          message: err.message || "Failed to load labs/profile metadata.",
        });
      }
    };

    loadMeta();
  }, [wallet, labKey]);

  const canCreateEnterpriseTask = useMemo(
    () => canCreateEnterpriseTaskByRole(profile?.role),
    [profile],
  );
  const userIsMember = useMemo(() => isMember(profile?.role), [profile]);
  const workDateObject = useMemo(
    () => parseLocalDateInputValue(workDate),
    [workDate],
  );
  const endDateObject = useMemo(
    () => parseLocalDateInputValue(endDate),
    [endDate],
  );

  useEffect(() => {
    if (!wallet || !userIsMember) return;
    setAssignedToWallet(wallet.toLowerCase());
    setSource("employee");
  }, [wallet, userIsMember]);

  useEffect(() => {
    if (!workDate) return;
    if (!endDate || endDate < workDate) {
      setEndDate(workDate);
    }
  }, [workDate, endDate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        pickerAreaRef.current &&
        !pickerAreaRef.current.contains(event.target)
      ) {
        setOpenPicker(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabName = useMemo(() => {
    return labs.find((lab) => lab.key === labKey)?.name || "Select lab";
  }, [labs, labKey]);

  const selectedSourceLabel = useMemo(() => {
    return source === "enterprise"
      ? "Enterprise Assigned"
      : "Employee Self Created";
  }, [source]);

  const submitTask = async (e) => {
    e.preventDefault();
    if (!wallet) return;

    if (!title || !labKey || !workDate || !endDate) {
      setStatus({
        type: "error",
        message: "Title, lab, start date and end date are required.",
      });
      return;
    }

    if (endDate < workDate) {
      setStatus({
        type: "error",
        message: "End date cannot be earlier than start date.",
      });
      return;
    }

    if (source === "enterprise" && !canCreateEnterpriseTask) {
      setStatus({
        type: "error",
        message: "Only affiliates and executives can create enterprise tasks.",
      });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      await createTask({
        title,
        description,
        organization: APP_ORGANIZATION,
        labKey,
        source,
        createdByWallet: wallet,
        assignedToWallet: (userIsMember ? wallet : assignedToWallet)
          .trim()
          .toLowerCase(),
        workDate,
        endDate,
      });

      setStatus({ type: "success", message: "Task created successfully." });
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setStatus({
        type: "error",
        message: err.message || "Task creation failed.",
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
            Connect your wallet to create a task.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto anim-in pt-8 px-4 pb-20">
      <div className="bg-[var(--color-yellow)] border-2 border-black rounded-t-2xl p-8 shadow-hard relative z-10">
        <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tighter mb-4 text-black uppercase leading-[0.9]">
          Create Daily
          <br />
          Task
        </h1>
        <p className="font-bold text-black/70">
          Assign work by lab and route it into enterprise voting.
        </p>
      </div>

      <div className="bg-white border-x-2 border-b-2 border-black rounded-b-2xl p-8 shadow-hard relative z-0 -mt-2">
        <form onSubmit={submitTask} className="space-y-5">
          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">
              Task Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Design token-gated dashboard for Bhaskarcharya Lab"
              className="neo-input"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">
              Task Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Context, expected output, and acceptance criteria"
              className="neo-input resize-y"
              disabled={loading}
            />
          </div>

          <div ref={pickerAreaRef} className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">
                Lab
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenPicker(openPicker === "lab" ? null : "lab")
                  }
                  disabled={loading}
                  className="neo-input w-full !px-3 !py-2.5 text-sm text-black text-left flex items-center justify-between"
                >
                  <span className="font-semibold truncate pr-3">
                    {selectedLabName}
                  </span>
                  <span className="text-xs font-black uppercase tracking-wide text-black/60">
                    Pick
                  </span>
                </button>
                {openPicker === "lab" && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-white border-2 border-black rounded-lg shadow-hard overflow-hidden">
                    {labs.map((lab) => (
                      <button
                        key={lab.key}
                        type="button"
                        onClick={() => {
                          setLabKey(lab.key);
                          setOpenPicker(null);
                        }}
                        className={`w-full text-left px-3 py-2.5 text-sm text-black border-b border-black/10 font-semibold transition-colors ${
                          lab.key === labKey
                            ? "bg-[var(--color-yellow)]"
                            : "bg-white hover:bg-[#f4f4f5]"
                        }`}
                      >
                        {lab.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">
                Task Source
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenPicker(openPicker === "source" ? null : "source")
                  }
                  disabled={loading || !canCreateEnterpriseTask}
                  className="neo-input w-full !px-3 !py-2.5 text-sm text-black text-left flex items-center justify-between"
                >
                  <span className="font-semibold truncate pr-3">
                    {selectedSourceLabel}
                  </span>
                  <span className="text-xs font-black uppercase tracking-wide text-black/60">
                    Pick
                  </span>
                </button>
                {openPicker === "source" && canCreateEnterpriseTask && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-white border-2 border-black rounded-lg shadow-hard overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setSource("enterprise");
                        setOpenPicker(null);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm text-black border-b border-black/10 font-semibold transition-colors ${
                        source === "enterprise"
                          ? "bg-[var(--color-yellow)]"
                          : "bg-white hover:bg-[#f4f4f5]"
                      }`}
                    >
                      Enterprise Assigned
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSource("employee");
                        setOpenPicker(null);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm text-black font-semibold transition-colors ${
                        source === "employee"
                          ? "bg-[var(--color-yellow)]"
                          : "bg-white hover:bg-[#f4f4f5]"
                      }`}
                    >
                      Employee Self Created
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">
                Start Date
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenPicker(openPicker === "start" ? null : "start")
                  }
                  disabled={loading}
                  className="neo-input w-full !px-3 !py-2.5 text-sm text-black text-left flex items-center justify-between"
                >
                  <span className="font-semibold">
                    {getDateDisplayValue(workDate)}
                  </span>
                  <span className="text-xs font-black uppercase tracking-wide text-black/60">
                    Pick
                  </span>
                </button>
                {openPicker === "start" && (
                  <div className="absolute top-full left-0 mt-2 z-40 w-full sm:w-[18rem]">
                    <Calendar
                      selected={workDateObject}
                      onSelect={(date) => {
                        if (!date) return;
                        setWorkDate(getLocalDateInputValue(date));
                        setOpenPicker(null);
                      }}
                      disabled={loading}
                    />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">
                End Date
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenPicker(openPicker === "end" ? null : "end")
                  }
                  disabled={loading}
                  className="neo-input w-full !px-3 !py-2.5 text-sm text-black text-left flex items-center justify-between"
                >
                  <span className="font-semibold">
                    {getDateDisplayValue(endDate)}
                  </span>
                  <span className="text-xs font-black uppercase tracking-wide text-black/60">
                    Pick
                  </span>
                </button>
                {openPicker === "end" && (
                  <div className="absolute top-full left-0 mt-2 z-40 w-full sm:w-[18rem]">
                    <Calendar
                      selected={endDateObject}
                      minDate={workDateObject}
                      onSelect={(date) => {
                        if (!date) return;
                        setEndDate(getLocalDateInputValue(date));
                        setOpenPicker(null);
                      }}
                      disabled={loading}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <MemberSelector
            labKey={labKey}
            selectedWallet={assignedToWallet}
            onWalletChange={(wallet) => setAssignedToWallet(wallet)}
            requesterWallet={wallet}
            includeAllMembers={canCreateEnterpriseTask}
            disabled={loading || userIsMember}
          />

          {userIsMember && (
            <p className="text-xs font-bold uppercase text-black/60">
              Member accounts can only assign tasks to themselves.
            </p>
          )}

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
            className="neo-btn w-full justify-center py-4 text-lg translate-push mt-2"
          >
            {loading ? "Creating Task..." : "Create Task"}
          </button>
        </form>
      </div>
    </div>
  );
}
