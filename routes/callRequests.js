const express = require("express");
const Session = require("../models/sessionSchema");
const router = express.Router();

router.get("/call-requests", async (req, res) => {
  try {
    const sessions = await Session.find();
    res.status(200).json({ data: sessions, status: true });
  } catch (error) {
    res.status(500).json({ message: "Error fetching call requests", error });
  }
});

module.exports = router;
