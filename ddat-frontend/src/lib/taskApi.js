import { apiRequest } from "./apiClient";

function toQueryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  const result = query.toString();
  return result ? `?${result}` : "";
}

export async function finalizeInReview() {
  return apiRequest("/tasks/finalize-in-review", {
    method: "POST",
  });
}

export async function listLabs() {
  return apiRequest("/tasks/labs/list");
}

export async function listTasksByWallet(wallet, options = {}) {
  const query = toQueryString({
    wallet,
    page: options.page,
    pageSize: options.pageSize,
  });
  return apiRequest(`/tasks${query}`);
}

export async function listInReviewTasksByOrganization(
  organization,
  options = {},
) {
  const query = toQueryString({
    organization,
    status: "in_review",
    page: options.page,
    pageSize: options.pageSize,
  });
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
