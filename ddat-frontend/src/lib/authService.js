import { apiRequest } from "./apiClient";

export const AUTH_TOKEN_KEY = "ddatAuthToken";

export function getStoredAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

export function setStoredAuthToken(token) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
}

export function clearStoredAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function requestNonce(walletAddress) {
  return apiRequest("/auth/nonce", {
    method: "POST",
    body: JSON.stringify({ walletAddress }),
  });
}

export async function verifySignature(walletAddress, signature) {
  return apiRequest("/auth/verify", {
    method: "POST",
    body: JSON.stringify({ walletAddress, signature }),
  });
}

export async function establishWalletSession(walletAddress) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  let noncePayload;
  try {
    noncePayload = await requestNonce(walletAddress);
  } catch (err) {
    throw new Error(
      `Failed to request auth challenge: ${err.message || "Unknown error"}`,
    );
  }

  const message = noncePayload?.data?.message;
  if (!message) {
    throw new Error(
      `Auth challenge failed. Server response: ${JSON.stringify(noncePayload)}`,
    );
  }

  let signature;
  try {
    signature = await window.ethereum.request({
      method: "personal_sign",
      params: [message, walletAddress],
    });
  } catch (err) {
    throw new Error(
      `Message signature rejected or failed: ${err.message || "User denied request"}`,
    );
  }

  let verifyPayload;
  try {
    verifyPayload = await verifySignature(walletAddress, signature);
  } catch (err) {
    throw new Error(
      `Signature verification failed: ${err.message || "Unknown error"}`,
    );
  }

  const token = verifyPayload?.data?.token;
  if (!token) {
    throw new Error(
      `Authentication failed. Server response: ${JSON.stringify(verifyPayload)}`,
    );
  }

  setStoredAuthToken(token);
  return token;
}

export async function checkSession() {
  return apiRequest("/auth/session");
}
