const { Worker } = require("bullmq");
const Redis = require("ioredis");
const JobModel = require("../models/Job");
const scrapeTwitter = require("../scrapers/twitterScraper");

 const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost', 
  port: process.env.REDIS_PORT || 6379,      
  maxRetriesPerRequest: null                 
});


module.exports = connection; 

const logListPrefix = "job-logs";

new Worker(
  "scrape-jobs",
  async (job) => {

    console.log(`[✔] Processing job for Twitter Handle: ${job.data.twitterHandle}`);
    const { twitterHandle, jobId } = job.data;
    
    await connection.rpush(`${logListPrefix}:${jobId}`, `Job started at ${new Date().toISOString()} for ${twitterHandle}`);

    const jobDoc = await JobModel.findById(jobId);
    if (!jobDoc || jobDoc.status !== "active") return;

    const now = new Date();
    if (now >= jobDoc.endTime) {
      jobDoc.status = "completed";
      await jobDoc.save();
      return;
    }

    const tweets = await scrapeTwitter(twitterHandle);

    await connection.rpush(`${logListPrefix}:${jobId}`, `[✔] ${twitterHandle}: ${tweets.length} tweet(s) scraped.`);
    console.log(`[✔] ${twitterHandle}: ${tweets.length} tweet(s) scraped.`);
  },
  {
    connection,
    concurrency: 5,
  }
);
