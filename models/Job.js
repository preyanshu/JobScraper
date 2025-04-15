const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema({
  userId: String,
  twitterHandle: String,
  duration: Number, // in ms
  startTime: Date,
  endTime: Date,
  status: { type: String, default: "active" },
});

module.exports = mongoose.model("Job", JobSchema);
