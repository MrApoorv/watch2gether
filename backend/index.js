import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000; // Use environment port or 3000

const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  // ... (rest of your socket logic)
  console.log("user connected");

  socket.on("play", (time) => {
    socket.broadcast.emit("play", time);
  });
  // ... other socket listeners
  socket.on("pause", (time) => {
    socket.broadcast.emit("pause", time);
  });

  socket.on("seek", (time) => {
    socket.broadcast.emit("seek", time);
  });

  socket.on("sync", (time) => { // You had this in the frontend, add to backend too
    socket.broadcast.emit("sync", time);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});