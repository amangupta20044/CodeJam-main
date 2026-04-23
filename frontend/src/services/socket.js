import { io } from "socket.io-client";

const API = import.meta.env.VITE_SOCKET_URL;

const URL = API?.replace(/\/$/, "") || "http://localhost:5000";

export const socket = io(URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});
