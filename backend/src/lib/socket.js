import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReveiverSocketId(userId) {
  return userSocketsMap.get(userId);
}

const userSocketsMap = new Map();

io.on("connection", (socket) => {
  console.log("New user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketsMap.set(userId, socket.id);
  }

  io.emit("getOnlineUsers", Array.from(userSocketsMap.keys())); // send event to all connected clients

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
    if (userId) {
      userSocketsMap.delete(userId);
      io.emit("getOnlineUsers", Array.from(userSocketsMap.keys())); // send event to all connected clients
    }
  });
});

export { io, app, server };
