import { API_BASE } from "../config";

const DEFAULT_TIMEOUT_MS = 15000;
const AUTH_TOKEN_KEY = "ddatAuthToken";

function joinUrl(base, path) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedBase = String(base || "").replace(/\/$/, "");
  const normalizedPath = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function decodePayload(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function deriveErrorMessage(response, text, payload) {
  if (payload?.error) return payload.error;
  if (payload?.message) return payload.message;

  if (typeof text === "string" && /<html|<!doctype/i.test(text)) {
    return "API returned HTML instead of JSON. Check VITE_API_BASE and backend routing.";
  }

  return `Request failed with status ${response.status}`;
}

export async function apiRequest(path, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...rest } = options;
  const url = joinUrl(API_BASE, path);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  try {
    const response = await fetch(url, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
      signal: controller.signal,
    });

    const text = await response.text();
    const payload = decodePayload(text);

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem(AUTH_TOKEN_KEY);

        const authMessage = String(payload?.error || payload?.message || "");
        const isAuthTokenError =
          /missing auth token|invalid auth token|invalid or expired auth token/i.test(
            authMessage,
          );
        const isManualDisconnect =
          localStorage.getItem("walletDisconnected") === "true";

        // During user-initiated logout, ignore expected in-flight auth failures.
        if (isManualDisconnect && isAuthTokenError) {
          return {
            success: false,
            signedOut: true,
            message: "Wallet disconnected",
          };
        }
      }
      throw new Error(deriveErrorMessage(response, text, payload));
    }

    if (!payload) {
      if (!text) return { success: true };
      throw new Error("API returned a non-JSON response.");
    }

    if (payload.success === false) {
      throw new Error(payload.error || payload.message || "API request failed");
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        "Request timed out. Check backend availability and network latency.",
      );
    }

    if (error instanceof TypeError) {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        throw new Error("You appear to be offline. Reconnect to continue.");
      }
      throw new Error(
        "Cannot reach backend API. Verify server is running and VITE_API_BASE is correct.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
