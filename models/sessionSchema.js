const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  group_id: { type: String, required: true },
  user_id: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  roomId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  duration: { type: Number, default: 0 },
});

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
