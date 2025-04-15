const { Queue } = require("bullmq");
const Redis = require("ioredis");

const connection = new Redis(process.env.REDIS_URL);

const scrapeQueue = new Queue("scrape-jobs", {
  connection,
});

module.exports = scrapeQueue;
