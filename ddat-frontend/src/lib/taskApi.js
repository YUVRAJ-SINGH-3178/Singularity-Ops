import { apiRequest } from "./apiClient";

export async function finalizeInReview() {
  return apiRequest("/tasks/finalize-in-review", {
    method: "POST",
  });
}

export async function listLabs() {
  return apiRequest("/tasks/labs/list");
}

export async function listTasksByWallet(wallet) {
  return apiRequest(`/tasks?wallet=${encodeURIComponent(wallet)}`);
}

export async function listInReviewTasksByOrganization(organization) {
  const query = organization
    ? `?organization=${encodeURIComponent(organization)}&status=in_review`
    : "?status=in_review";
  return apiRequest(`/tasks${query}`);
}

export async function createTask(payload) {
  return apiRequest("/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitTask(taskId, payload) {
  return apiRequest(`/tasks/${taskId}/submit`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function voteTask(taskId, payload) {
  return apiRequest(`/tasks/${taskId}/vote`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
