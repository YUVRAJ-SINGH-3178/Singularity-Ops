export const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export const APP_ORGANIZATION =
  String(import.meta.env.VITE_APP_ORGANIZATION || "Singularity Lab").trim() ||
  "Singularity Lab";
