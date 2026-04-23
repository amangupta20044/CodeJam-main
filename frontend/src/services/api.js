import axios from "axios";

const APIN = import.meta.env.VITE_API_URL;
const baseURL = APIN?.replace(/\/$/, "") || "http://localhost:5000";

const API = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

export function getApiErrorMessage(error, fallback = "Request failed") {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.code === "ERR_NETWORK") {
    return `Network error: cannot reach ${baseURL}. Check backend server and CORS config.`;
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
}

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
