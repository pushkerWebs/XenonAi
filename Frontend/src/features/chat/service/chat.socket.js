import { io } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

let socket = null;

export const initializeSocketConnection = () => {
  if (socket) {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  socket = io(BASE_URL, {
    withCredentials: true,
  });

  socket.on("connect", () => {
    console.log("Connected to Socket.Io server");
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from Socket.Io server");
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
};
