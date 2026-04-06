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

  const noncePayload = await requestNonce(walletAddress);
  const message = noncePayload?.data?.message;
  if (!message) {
    throw new Error("Failed to create auth challenge");
  }

  const signature = await window.ethereum.request({
    method: "personal_sign",
    params: [message, walletAddress],
  });

  const verifyPayload = await verifySignature(walletAddress, signature);
  const token = verifyPayload?.data?.token;

  if (!token) {
    throw new Error("Authentication failed");
  }

  setStoredAuthToken(token);
  return token;
}

export async function checkSession() {
  return apiRequest("/auth/session");
}
