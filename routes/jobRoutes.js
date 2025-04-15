const express = require("express");
const router = express.Router();
const { createJob } = require("../controllers/jobController");
const { getJobLogs } = require("../controllers/jobController");

router.post("/create", createJob);


router.get("/:jobId/logs", getJobLogs);

module.exports = router;
