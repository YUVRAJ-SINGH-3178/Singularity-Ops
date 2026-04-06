import { apiRequest } from "./apiClient";

export async function getUserProfile(wallet) {
  return apiRequest(`/user/${wallet}/profile`);
}

export async function upsertUserProfile(wallet, payload) {
  return apiRequest(`/user/${wallet}/profile`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listPendingRoleRequests() {
  return apiRequest("/user/role-requests/pending");
}

export async function approveRoleRequest(userWallet, payload) {
  return apiRequest(`/user/${userWallet}/approve-role`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
