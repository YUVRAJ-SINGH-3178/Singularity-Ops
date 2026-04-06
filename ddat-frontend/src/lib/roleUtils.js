export function normalizeRole(role) {
  const value = String(role || "").toLowerCase();
  if (value === "employee") return "member";
  if (value === "enterprise_admin") return "executive";
  if (["member", "affiliate", "executive"].includes(value)) return value;
  return "member";
}

export function canCreateEnterpriseTask(role) {
  return ["affiliate", "executive"].includes(normalizeRole(role));
}

export function canVote(role) {
  return ["affiliate", "executive"].includes(normalizeRole(role));
}

export function isExecutive(role) {
  return normalizeRole(role) === "executive";
}

export function isMember(role) {
  return normalizeRole(role) === "member";
}
