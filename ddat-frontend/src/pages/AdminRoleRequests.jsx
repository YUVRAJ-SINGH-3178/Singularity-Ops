import { useEffect, useState } from "react";
import { isExecutive } from "../lib/roleUtils";
import { approveRoleRequest, listPendingRoleRequests } from "../lib/userApi";

export default function AdminRoleRequests({ wallet, profile }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const canManageRoles = isExecutive(profile?.role);

  useEffect(() => {
    if (!canManageRoles || !wallet) return;

    const loadRequests = async () => {
      setLoading(true);
      try {
        const payload = await listPendingRoleRequests();
        setRequests(payload.data || []);
      } catch (err) {
        console.error("Error loading role requests:", err);
        setFeedback({
          type: "error",
          message: err.message || "Failed to load role requests",
        });
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, [canManageRoles, wallet]);

  const handleApprove = async (userWallet, approve) => {
    setApproving(userWallet);
    try {
      await approveRoleRequest(userWallet, {
        approve,
      });

      setRequests((prev) => prev.filter((r) => r.walletAddress !== userWallet));
      setFeedback({
        type: "success",
        message: approve
          ? "Role change approved"
          : "Role change request denied",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to process request",
      });
    } finally {
      setApproving(null);
    }
  };

  if (!canManageRoles) {
    return (
      <div className="anim-in mx-auto w-full pt-8 px-4">
        <div className="bg-[#ff5f57] border-2 border-black rounded-2xl p-8 text-center">
          <p className="text-white font-heading font-black uppercase tracking-tight text-2xl mb-2">
            Access Locked
          </p>
          <p className="text-white/90 font-bold uppercase tracking-wide text-xs">
            Only lab executives can run role-control actions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="anim-in mx-auto w-full max-w-3xl pt-8 px-4 pb-20">
      <div className="mb-10">
        <h1 className="text-4xl font-heading font-black uppercase tracking-tighter text-white mb-2">
          Lab Role Control Deck
        </h1>
        <p className="text-white/70 font-bold uppercase tracking-wide text-xs">
          Review access-change requests for your lab and decide final
          permissions.
        </p>
      </div>

      {feedback.message && (
        <div
          className={`border-2 border-black rounded-lg p-3 shadow-hard mb-8 ${feedback.type === "error" ? "bg-[#ff5f57] text-white" : "bg-[var(--color-sage)] text-black"}`}
        >
          <p className="font-bold uppercase text-xs tracking-wide">
            {feedback.message}
          </p>
        </div>
      )}

      {loading ? (
        <div className="neo-card p-8 flex items-center gap-3 justify-center">
          <div className="spinner border-black border-t-black" />
          <span className="text-black font-heading font-black uppercase tracking-wide text-sm">
            Syncing Lab Requests...
          </span>
        </div>
      ) : requests.length === 0 ? (
        <div className="neo-card p-8 text-center">
          <p className="text-black/70 font-heading font-black uppercase tracking-wide">
            No Access Changes Pending
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.walletAddress}
              className="neo-card p-6 border-2 border-black"
            >
              <div className="mb-4">
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <h3 className="text-xl font-heading font-black text-black uppercase tracking-tight">
                    {request.displayName}
                  </h3>
                  <div className="text-xs font-semibold uppercase tracking-wider text-white bg-black px-2 py-1 rounded">
                    {request.currentRole}
                  </div>
                </div>
                {request.email && (
                  <p className="text-sm font-medium text-black/60">
                    {request.email}
                  </p>
                )}
                <p className="text-xs text-black/50 font-mono mt-1">
                  {request.walletAddress}
                </p>
              </div>

              <div className="bg-[var(--color-cream)] border-2 border-black rounded-lg p-3 mb-4">
                <p className="text-xs font-bold uppercase tracking-wide text-black/70 mb-1">
                  Requested Permission Shift
                </p>
                <p className="font-black text-black text-lg">
                  {request.currentRole} → {request.requestedRole}
                </p>
                <p className="text-xs text-black/50 font-medium mt-2">
                  Requested:{" "}
                  {request.requestedRoleAt
                    ? new Date(request.requestedRoleAt).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>

              {request.organization && (
                <div className="text-xs font-bold uppercase text-black/60 mb-4">
                  Organization: {request.organization}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(request.walletAddress, true)}
                  disabled={approving === request.walletAddress}
                  className="flex-1 neo-btn neo-btn-sage justify-center translate-push uppercase font-bold text-sm"
                >
                  {approving === request.walletAddress
                    ? "Processing..."
                    : "✓ Grant Role"}
                </button>
                <button
                  onClick={() => handleApprove(request.walletAddress, false)}
                  disabled={approving === request.walletAddress}
                  className="flex-1 neo-btn bg-[#ff5f57] text-white justify-center translate-push uppercase font-bold text-sm"
                >
                  {approving === request.walletAddress
                    ? "Processing..."
                    : "✕ Keep Current Role"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
