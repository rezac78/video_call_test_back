const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { roomHandler } = require("./src/room");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("user is connected");
  roomHandler(socket);
  socket.on("disconnect", () => {
    console.log("user is disconnected");
  });
});

server.listen(4000, () => console.log("Server is running on port 4000"));
