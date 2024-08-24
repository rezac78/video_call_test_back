const { v4: uuidV4 } = require("uuid");

const rooms = {};
const callRequests = [];

const roomHandler = (socket) => {
  const createRoom = ({ name, phoneNumber }) => {
    const roomId = uuidV4().substring(0, 12);
    rooms[roomId] = [];
    const newCallRequest = {
      id: roomId,
      name,
      phoneNumber,
      timestamp: Date.now(),
    };
    callRequests.push(newCallRequest);
    socket.emit("room-created", { roomId });

    socket.broadcast.emit("new-call-request", newCallRequest);
    console.log("user created the room", name, phoneNumber);
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
  const deleteCall = (requestId) => {
    const index = callRequests.findIndex((request) => request.id === requestId);
    if (index !== -1) {
      callRequests.splice(index, 1);
      console.log(`Request with ID ${requestId} has been deleted.`);
    }
  };
  const startSharing = ({ peerId, roomId }) => {
    socket.to(roomId).emit("user-started-sharing", peerId);
  };
  const stopSharing = (roomId) => {
    socket.to(roomId).emit("user-stopped-sharing", roomId);
  };
  const addMessage = ({ roomId, message }) => {
    console.log({ message });
  };
  socket.on("create-room", createRoom);
  socket.on("join-room", joinRoom);
  socket.on("get-call-requests", (callback) => {
    callback(callRequests);
  });
  socket.on("delete-call-request", deleteCall);
  socket.on("start-sharing", startSharing);
  socket.on("stop-sharing", stopSharing);
  socket.on("send-message", addMessage);
};

module.exports = { roomHandler };
