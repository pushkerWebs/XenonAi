import { io } from "socket.io-client";

let socket = null;

export const initializeSocketConnection = () => {
  if (socket) {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  socket = io("http://localhost:3000", {
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
