const { v4: uuidV4 } = require("uuid");

const rooms = {};

const roomHandler = (socket) => {
  const createRoom = () => {
    const roomId = uuidV4();
    rooms[roomId] = [];
    socket.emit("room-created", { roomId });
    console.log("user created the room");
  };
  const joinRoom = ({ roomId, peerId }) => {
    if (rooms[roomId]) {
      console.log("user joined the room", roomId, peerId);
      rooms[roomId].push(peerId);
      socket.join(roomId);
      socket.to(roomId).emit("user-joined", { peerId });
      socket.emit("get-users", {
        roomId,
        participants: rooms[roomId],
      });
    }
    socket.on("disconnect", () => {
      console.log("user left room", peerId);
      leaveRoom({ roomId, peerId });
    });
  };

  const leaveRoom = ({ peerId, roomId }) => {
    rooms[roomId] = rooms[roomId].filter((id) => id !== peerId);
    socket.to(roomId).emit("user-disconnected", peerId);
  };
  socket.on("create-room", createRoom);
  socket.on("join-room", joinRoom);
};

module.exports = { roomHandler };
