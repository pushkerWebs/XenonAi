import { Server, Socket } from "socket.io";

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });

  console.log("Socket.io server is RUNNING")

  io.on("connection", (socket) => {
    console.log("A user connected:" + socket.id);
  });
}

export function getId() {
  if (!io) {
    throw new Error("Socket.io not initalized");
  }
  return io;
}
