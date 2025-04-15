const mongoose = require("mongoose");


const { Queue, Worker } = require('bullmq');
const JobModel = require('./models/Job'); 
const Redis = require('ioredis');
const scrapeTwitter = require('./scrapers/twitterScraper');

const connection = new Redis(process.env.REDIS_URL);

const scrapeQueue = new Queue('scrape-jobs', { connection });

const pushActiveJobsToQueue = async () => {
  try {
    const activeJobs = await JobModel.find({ status: 'active' });

    if (activeJobs.length > 0) {
      console.log(`[✔] Found ${activeJobs.length} active job(s) to re-add to the queue.`);

      activeJobs.forEach(async (jobDoc) => {
        const repeatEvery = 10000;
        const limit = Math.floor(jobDoc.duration / repeatEvery);

        await scrapeQueue.add(
          'scrape',
          { twitterHandle: jobDoc.twitterHandle, jobId: jobDoc._id.toString() },
          {
            repeat: { every: repeatEvery, limit },
            jobId: `job-${jobDoc._id}`,
          }
        );

        console.log(`[✔] Re-added job with Twitter Handle: ${jobDoc.twitterHandle} to the queue.`);
      });
    } else {
      console.log('[✔] No active jobs found to re-add.');
    }
  } catch (error) {
    console.error('[❌] Error re-adding active jobs to the queue:', error);
  }
};


const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await pushActiveJobsToQueue();
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
