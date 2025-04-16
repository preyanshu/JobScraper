
const scrapeQueue = require("../jobs/queue");
const  connection  = require("../jobs/processor");

const { jobDB } = require("../db"); // ✅ import NeDB instance
// const scrapeQueue = require("../jobs/queue");

exports.createJob = async (req, res) => {
  try {
    const { twitterHandle, duration = 60000, userId = "user123" } = req.body;

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration);

    const jobData = {
      userId,
      twitterHandle,
      duration,
      status: "active",
      startTime,
      endTime,
    };

    // Insert into NeDB
    jobDB.insert(jobData, async (err, newJob) => {
      if (err) {
        console.error("❌ Error inserting job:", err);
        return res.status(500).json({ error: "Failed to create job" });
      }

      const repeatEvery = 10000;
      const limit = Math.floor(duration / repeatEvery);

    


              await scrapeQueue.createJob({ twitterHandle, jobId: newJob._id.toString() }).save();

      res.status(201).json({ message: "Job created", job: newJob });
    });
  } catch (error) {
    console.error("❌ Job creation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const getJobLogsFromList = async (jobId) => {
    const logs = await connection.lrange(`job-logs:${jobId}`, 0, -1);
    return logs;
  };
  
  // Example API endpoint to get logs
  exports.getJobLogs = async (req, res) => {
    const { jobId } = req.params;
  
    const logs = await getJobLogsFromList(jobId);
  
    res.status(200).json({ logs });
  };