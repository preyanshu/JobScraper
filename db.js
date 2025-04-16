const path = require('path');
const Datastore = require('@seald-io/nedb'); // maintained fork of NeDB
const Queue = require('bee-queue'); 
const Redis = require('ioredis');
const scrapeTwitter = require('./scrapers/twitterScraper');


const RedisMock = require('ioredis-mock'); // You can replace this with 'ioredis' for real Redis

// Create a mock Redis connection (for development purposes)
const connection = new RedisMock({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

const scrapeQueue = new Queue('scrape-jobs', {
  redis: connection,
  isWorker: false, // we are not creating a worker here in this code
});

// Load NeDB database file
const db = new Datastore({
  filename: path.join(__dirname, 'nedb', 'jobs.db'),
  autoload: true
});

// Promisify NeDB find (optional helper)
const findAsync = (query) => new Promise((resolve, reject) => {
  db.find(query, (err, docs) => {
    if (err) reject(err);
    else resolve(docs);
  });
});

const pushActiveJobsToQueue = async () => {
  try {
    const activeJobs = await findAsync({ status: 'active' });

    if (activeJobs.length > 0) {
      console.log(`[✔] Found ${activeJobs.length} active job(s) to re-add to the queue.`);

      for (const jobDoc of activeJobs) {
        const repeatEvery = 10000; // Interval in ms
        const limit = Math.floor(jobDoc.duration / repeatEvery);

        // Add job to Bee-Queue
        const job = await scrapeQueue.createJob({
          twitterHandle: jobDoc.twitterHandle,
          jobId: jobDoc._id
        })
          // .repeat({ every: repeatEvery, limit }) // Repeat every 'repeatEvery' ms
          // // job.repeatInterval(repeatEvery); // Repeat every 'repeatEvery' ms
          job.save(); // Save the job to the queue

        console.log(`[✔] Re-added job with Twitter Handle: ${jobDoc.twitterHandle} to the queue.`);
      }
    } else {
      console.log('[✔] No active jobs found to re-add.');
    }
  } catch (error) {
    console.error('[❌] Error re-adding active jobs to the queue:', error);
  }
};

const connectDB = async () => {
  try {
    console.log("✅ NeDB initialized");
    await scrapeQueue.destroy(); 
    await pushActiveJobsToQueue();
  } catch (err) {
    console.error("❌ NeDB setup failed:", err);
    process.exit(1);
  }
};

module.exports = {
  connectDB,
  jobDB: db, 
};
