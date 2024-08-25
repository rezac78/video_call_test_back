const { v4: uuidV4 } = require("uuid");

const rooms = {};
const chats = {};
const callRequests = [];

const roomHandler = (socket) => {
  const createRoom = ({ name, phoneNumber }) => {
    const roomId = uuidV4().substring(0, 12);
    rooms[roomId] = [];
    chats[roomId] = [];
    const newCallRequest = {
      id: roomId,
      name,
      phoneNumber,
      timestamp: Date.now(),
    };
    callRequests.push(newCallRequest);
    socket.emit("room-created", { roomId });

    socket.broadcast.emit("new-call-request", newCallRequest);
  };

  const joinRoom = ({ roomId, peerId }) => {
    if (!rooms[roomId]) rooms[roomId] = [];
    socket.emit("get-messages", chats[roomId]);
    rooms[roomId].push(peerId);
    socket.join(roomId);
    socket.emit("user-joined", { peerId });
    socket.to(roomId).emit("user-joined", { peerId });
    socket.emit("get-users", {
      roomId,
      participants: rooms[roomId],
    });
    socket.on("disconnect", () => {
      leaveRoom({ roomId, peerId });
    });
  };

  const leaveRoom = ({ peerId, roomId }) => {
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== peerId);
      socket.to(roomId).emit("user-disconnected", peerId);

      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
        delete chats[roomId];
      }
    }
    socket.on("delete-call-request", (requestId) => {
      deleteCall(requestId);
      socket.leave(requestId);
    });
  };

  const deleteCall = (requestId) => {
    const index = callRequests.findIndex((request) => request.id === requestId);
    if (index !== -1) {
      callRequests.splice(index, 1);
    }
  };

  const startSharing = ({ peerId, roomId }) => {
    socket.to(roomId).emit("user-started-sharing", peerId);
  };
  const stopSharing = (roomId) => {
    socket.to(roomId).emit("user-stopped-sharing", roomId);
  };
  const addMessage = ({ roomId, message }) => {
    if (Array.isArray(chats[roomId])) {
      chats[roomId].push(message);
    } else {
      chats[roomId] = [message];
    }

    socket.to(roomId).emit("add-message", message);
  };

  socket.on("send-message", (roomId, message) => {
    console.log(roomId);
    console.log(message);
    addMessage({ roomId, message });
  });

  socket.on("create-room", createRoom);
  socket.on("join-room", joinRoom);
  socket.on("get-call-requests", (callback) => {
    callback(callRequests);
  });
  socket.on("delete-call-request", deleteCall);
  socket.on("start-sharing", startSharing);
  socket.on("stop-sharing", stopSharing);
};

module.exports = { roomHandler };
