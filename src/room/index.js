const { v4: uuidV4 } = require("uuid");
const axios = require("axios");
const Session = require("../../models/sessionSchema");
const rooms = {};
const chats = {};
const callRequests = [];
const formatDateForSQL = (date) => {
  const utcDate = new Date(date);
  const tehranOffsetMs = 3.5 * 3600 * 1000;
  const tehranDate = new Date(utcDate.getTime() + tehranOffsetMs);
  const year = tehranDate.getUTCFullYear();
  const month = (tehranDate.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = tehranDate.getUTCDate().toString().padStart(2, "0");
  const hours = tehranDate.getUTCHours().toString().padStart(2, "0");
  const minutes = tehranDate.getUTCMinutes().toString().padStart(2, "0");
  const seconds = tehranDate.getUTCSeconds().toString().padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const roomHandler = (socket) => {
  const createRoom = async ({
    name,
    phoneNumber,
    selectedItem,
    user_id,
    startDate,
    endDate,
    token,
  }) => {
    console.log("Creating room with details:", {
      name,
      phoneNumber,
      selectedItem,
      user_id,
      startDate,
      endDate,
      token,
    });
    const roomId = uuidV4().substring(0, 12);
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    console.log("Room ID:", roomId);
    console.log("Start Date:", startDate);
    console.log("End Date:", endDate);
    rooms[roomId] = [];
    chats[roomId] = [];
    const newCallRequest = {
      id: roomId,
      name,
      phoneNumber,
      group_id: selectedItem,
      user_id: user_id,
      startDate,
      endDate,
      roomId,
      timestamp: Date.now(),
    };
    let session = await Session.findOne({ id: roomId });
    if (!session) {
      session = new Session(newCallRequest);
      await session.save();
      console.log("New session created:", session);
    }

    callRequests.push(newCallRequest);
    socket.emit("room-created", { roomId });
    socket.broadcast.emit("new-call-request", newCallRequest);
    console.log("Call request created and emitted:", newCallRequest);

    try {
      const payload = {
        title: "مصاحبه کاری",
        description: "test",
        start_date: formatDateForSQL(startDate),
        end_date: formatDateForSQL(endDate),
        event_type: "online",
        meet_url: `https://meet.hamrahanefarda.com/room/${roomId}`,
      };
      console.log("Sending API request with payload:", payload);
      const response = await axios.post(
        "https://u-profile.hamrahanefarda.com/api/events",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("API response:", response.data);
    } catch (error) {
      if (error.response) {
        console.error("Error calling API:", error.response.data);
      } else {
        console.error("Error:", error.message);
      }
    }
    setTimeout(() => {
      const requestIndex = callRequests.findIndex(
        (request) => request.id === roomId
      );
      if (requestIndex !== -1) {
        callRequests.splice(requestIndex, 1);
        socket.emit("call-request-expired", { roomId });
        socket.broadcast.emit("call-request-expired", { roomId });
        console.log("Call request expired:", roomId);
      }
    }, 900000);
  };

  const joinRoom = async ({ roomId, peerId }) => {
    console.log("Joining room with ID:", roomId, "Peer ID:", peerId);
    let session = await Session.findOne({ id: roomId });
    if (!session) {
      socket.emit("error", "اتاق یافت نشد");
      console.log("Room not found:", roomId);
      return;
    }
    const currentTime = new Date();
    const isWithinTimeRange =
      currentTime >= session.startDate && currentTime <= session.endDate;
    if (!isWithinTimeRange) {
      socket.emit("error", "اتاق در این زمان فعال نیست");
      console.log("Room is not active during this time:", roomId);
      return;
    }
    if (!rooms[roomId]) rooms[roomId] = [];
    if (!chats[roomId]) chats[roomId] = [];
    socket.emit("get-messages", chats[roomId]);
    rooms[roomId].push(peerId);
    socket.join(roomId);
    socket.emit("user-joined", { peerId });
    socket.to(roomId).emit("user-joined", { peerId });
    socket.emit("get-users", {
      roomId,
      participants: rooms[roomId],
    });
    session.isAnswered = true;
    session.isActive = true;
    await session.save();
    console.log("User joined the room:", peerId, "Session updated:", session);
    socket.on("disconnect", () => {
      leaveRoom({ roomId, peerId });
    });
  };

  const leaveRoom = async ({ peerId, roomId }) => {
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== peerId);
      socket.to(roomId).emit("user-disconnected", peerId);
      let session = await Session.findOne({ id: roomId });
      if (session) {
        const leaveTime = new Date();
        const joinTime = session.timestamp;
        const duration = (leaveTime - joinTime) / 1000;
        session.duration = duration;
        await session.save();
      }
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
    console.log("User started sharing:", peerId, "Room ID:", roomId);
    socket.to(roomId).emit("user-started-sharing", peerId);
  };
  const stopSharing = (roomId) => {
    console.log("User stopped sharing in room:", roomId);
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
  socket.on(
    "update-microphone-status",
    ({ peerId, microphoneStatus, roomId }) => {
      console.log("Microphone status update:", {
        peerId,
        microphoneStatus,
        roomId,
      });
      socket
        .to(roomId)
        .emit("update-microphone-status", { peerId, microphoneStatus });
    }
  );

  socket.on("update-camera-status", ({ peerId, cameraStatus, roomId }) => {
    console.log("Camera status update:", { peerId, cameraStatus, roomId });
    socket.to(roomId).emit("update-camera-status", { peerId, cameraStatus });
  });
  socket.on("send-message", (roomId, message) => {
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
