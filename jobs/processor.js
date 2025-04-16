const Queue = require('bee-queue');
const RedisMock = require('ioredis-mock');
const scrapeTwitter = require('../scrapers/twitterScraper');
const { jobDB } = require('../db');

const logListPrefix = "job-logs";

// Use Redis mock for development and testing
const connection = new RedisMock({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

// Promisified helpers for NeDB
const findById = (id) =>
  new Promise((resolve, reject) => {
    jobDB.findOne({ _id: id }, (err, doc) => {
      if (err) reject(err);
      else resolve(doc);
    });
  });

const updateJob = (id, updateFields) =>
  new Promise((resolve, reject) => {
    jobDB.update({ _id: id }, { $set: updateFields }, {}, (err, numAffected) => {
      if (err) reject(err);
      else resolve(numAffected);
    });
  });

// Initialize Bee-Queue
const scrapeQueue = new Queue('scrape-jobs', {
  redis: connection,
  // Set concurrency to 5 (process up to 5 jobs in parallel)
  concurrency: 5,
});

// Worker to process jobs
scrapeQueue.process(5,async (job) => {

  console.log(job.data)
  const { twitterHandle, jobId } = job.data;

  console.log(`[✔] Processing job for Twitter Handle: ${twitterHandle}`);

  // Log job started
  await connection.rpush(
    `${logListPrefix}:${jobId}`,
    `Job started at ${new Date().toISOString()} for ${twitterHandle}`
  );

  // Fetch job document from NeDB
  const jobDoc = await findById(jobId);
  if (!jobDoc || jobDoc.status !== "active") return; // Only process active jobs

  const now = new Date();
  const endTime = new Date(jobDoc.endTime);

  // Check if job's end time has passed, if so, mark as completed
  if (now >= endTime) {
    await updateJob(jobId, { status: "completed" });
    console.log(`[✔] Job ${jobId} marked as completed.`);
    return;
  }

  // Scrape tweets for the Twitter handle
  const tweets = await scrapeTwitter(twitterHandle);

  // Log tweet scraping status
  await connection.rpush(
    `${logListPrefix}:${jobId}`,
    `[✔] ${twitterHandle}: ${tweets.length} tweet(s) scraped.`
  );
  console.log(`[✔] ${twitterHandle}: ${tweets.length} tweet(s) scraped.`);


  try {
    const delay = 1000;

    setTimeout(async () => {
      try {
        await scrapeQueue.createJob({ twitterHandle, jobId }).save();
        console.log("✅ Re-added job to queue with delay");
      } catch (err) {
        console.error("❌ Failed to re-add job to queue:", err);
      }
    }, delay);
  
    console.log("✅ Job re-added to queue with delay");
  } catch (err) {
    console.error("❌ Failed to re-add job to queue:", err);
  }

});

// Function to add jobs to the queue (example)
const addJobToQueue = async (twitterHandle, jobId) => {
  await scrapeQueue.createJob({
    twitterHandle,
    jobId
  }).save();
};

module.exports = { scrapeQueue, addJobToQueue };
