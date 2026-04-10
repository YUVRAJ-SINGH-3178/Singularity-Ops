import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/apiClient";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

function getInitials(name) {
  if (!name) return "??";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0])
    .join("")
    .toUpperCase();
}

function getMemberAvatarUrl(member) {
  const seed = member?.walletAddress || member?.displayName || "member";
  return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(seed)}`;
}

export default function MemberSelector({
  labKey,
  selectedWallet,
  onWalletChange,
  requesterWallet = "",
  includeAllMembers = false,
  disabled = false,
}) {
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dropdownRef = useRef(null);

  // Load members from the selected lab
  useEffect(() => {
    if (!labKey) {
      setMembers([]);
      return;
    }

    const loadMembers = async () => {
      setLoading(true);
      setError("");
      try {
        const queryParts = [];
        if (requesterWallet)
          queryParts.push(`wallet=${encodeURIComponent(requesterWallet)}`);
        if (includeAllMembers) queryParts.push("includeAll=1");
        const query = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
        const payload = await apiRequest(
          `/user/members/by-lab/${labKey}${query}`,
        );

        if (payload.success) {
          setMembers(payload.data || []);
          if (payload.data?.length === 0) {
            setError("No members found for this lab or organization");
          }
        } else {
          setMembers([]);
          setError(payload.message || "Failed to load members");
        }
      } catch (err) {
        console.error("Error loading members:", err);
        setMembers([]);
        setError(err.message || "Error loading members");
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [labKey, requesterWallet, includeAllMembers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter members based on search term
  const filteredMembers = members.filter(
    (member) =>
      member.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.email &&
        member.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      member.walletAddress.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleMemberSelect = (wallet) => {
    onWalletChange(wallet);
    setShowDropdown(false);
    setSearchTerm("");
    setUseManualEntry(false);
  };

  const handleManualInput = (e) => {
    onWalletChange(e.target.value);
  };

  const selectedMember = selectedWallet
    ? members.find((m) => m.walletAddress === selectedWallet)
    : null;

  const selectedMemberDisplay = selectedMember
    ? selectedMember.email
      ? `${selectedMember.displayName} • ${selectedMember.email}`
      : selectedMember.displayName
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-bold uppercase tracking-wider text-black">
          Assign To Member <span className="text-black/50">(Optional)</span>
        </label>
        {members.length > 0 && (
          <button
            type="button"
            onClick={() => setUseManualEntry(!useManualEntry)}
            className="text-xs font-bold uppercase tracking-wider text-black/60 hover:text-black transition-colors"
          >
            {useManualEntry ? "← Back to List" : "Manual Entry →"}
          </button>
        )}
      </div>

      {useManualEntry || members.length === 0 ? (
        // Manual wallet input (fallback)
        <input
          type="text"
          value={selectedWallet}
          onChange={handleManualInput}
          placeholder="0x... (wallet address)"
          className="neo-input"
          disabled={disabled}
        />
      ) : (
        // Member selector dropdown
        <div ref={dropdownRef} className="relative">
          <div
            onClick={() => !disabled && setShowDropdown(!showDropdown)}
            className={`neo-input cursor-pointer flex items-center justify-between ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex min-w-0 items-center gap-2">
              {selectedMember ? (
                <Avatar className="h-7 w-7">
                  <AvatarImage
                    src={getMemberAvatarUrl(selectedMember)}
                    alt={`${selectedMember.displayName} avatar`}
                  />
                  <AvatarFallback>
                    {getInitials(selectedMember.displayName)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-7 w-7 rounded-full border-2 border-black/30 bg-white" />
              )}
              <span
                className={`truncate ${selectedWallet ? "text-black" : "text-black/40"}`}
              >
                {selectedMemberDisplay || "Select a member..."}
              </span>
            </div>
            <span className="text-xs font-bold">▼</span>
          </div>

          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-black rounded-lg shadow-hard z-50 max-h-72 overflow-hidden flex flex-col">
              <input
                type="text"
                placeholder="Search by name, email or wallet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sticky top-0 border-b-2 border-black px-3 py-2 text-sm focus:outline-none bg-[var(--color-yellow)]"
                autoFocus
              />

              <div className="overflow-y-auto">
                {loading ? (
                  <div className="px-3 py-4 text-center text-sm text-black/50 font-medium">
                    Loading members...
                  </div>
                ) : error ? (
                  <div className="px-3 py-4 text-center text-sm text-black/50 font-medium">
                    {error}
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-black/50 font-medium">
                    {searchTerm
                      ? "No members matching search"
                      : "No members in this lab"}
                  </div>
                ) : (
                  filteredMembers.map((member) => (
                    <div
                      key={member.walletAddress}
                      onClick={() => handleMemberSelect(member.walletAddress)}
                      className={`px-3 py-3 border-b border-black/10 cursor-pointer transition-colors ${
                        selectedWallet === member.walletAddress
                          ? "bg-[var(--color-yellow)] font-bold"
                          : "hover:bg-[var(--color-cream)]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={getMemberAvatarUrl(member)}
                            alt={`${member.displayName} avatar`}
                          />
                          <AvatarFallback>
                            {getInitials(member.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="font-bold text-black truncate">
                              {member.displayName}
                            </div>
                            {member.role && (
                              <div className="text-xs font-semibold uppercase tracking-wider text-black/60 bg-black/5 px-2 py-0.5 rounded whitespace-nowrap">
                                {member.role}
                              </div>
                            )}
                          </div>
                          {member.email && (
                            <div className="text-xs text-black/60 font-medium mt-1 truncate">
                              {member.email}
                            </div>
                          )}
                          {member.organization && (
                            <div className="text-xs text-black/50 font-medium truncate">
                              {member.organization}
                            </div>
                          )}
                          <div className="text-xs text-black/40 font-mono mt-1 truncate">
                            {member.walletAddress}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-black/50 font-medium">
        {members.length > 0
          ? "Select from lab members or switch to manual wallet entry"
          : "Enter wallet address manually"}
      </p>
    </div>
  );
}
