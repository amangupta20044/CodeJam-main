/** Backend base URL — set VITE_API_URL in .env to override */
const envUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

export const BACKEND_URL =
  envUrl ||
  (import.meta.env.PROD
    ? "https://codejam-main.onrender.com"
    : "http://localhost:5000");
