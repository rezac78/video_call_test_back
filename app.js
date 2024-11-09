const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotEnv = require("dotenv");
const { roomHandler } = require("./src/room");
const connectDB = require("./config/db");
const callRequestRoutes = require("./routes/callRequests");
dotEnv.config({ path: "./config/config.env" });
connectDB();

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  roomHandler(socket);
  socket.on("disconnect", () => {
    console.log("user is disconnected");
  });
});
// Select a port
app.use("/api", callRequestRoutes);
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running in mode on port ${PORT}`);
});
