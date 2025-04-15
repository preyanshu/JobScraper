const JobModel = require("../models/Job");
const scrapeQueue = require("../jobs/queue");
const  connection  = require("../jobs/processor");

exports.createJob = async (req, res) => {
  const { twitterHandle, duration = 60000, userId = "user123" } = req.body;

  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + duration);

  const jobDoc = await JobModel.create({
    userId,
    twitterHandle,
    duration,
  
    startTime,
    endTime,
  });

  const repeatEvery = 10000; 
  const limit = Math.floor(duration / repeatEvery);

  await scrapeQueue.add(
    "scrape",
    { twitterHandle, jobId: jobDoc._id.toString() },
    {
      repeat: { every: repeatEvery, limit },
      jobId: `job-${jobDoc._id}`,
    }
  );

  res.status(201).json({ message: "Job created", job: jobDoc });
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