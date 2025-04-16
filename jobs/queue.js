const Queue = require('bee-queue');
const RedisMock = require('ioredis-mock'); // You can replace this with 'ioredis' for real Redis

// Create a mock Redis connection (for development purposes)
const connection = new RedisMock({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

// Create a Bee-Queue queue
const scrapeQueue = new Queue('scrape-jobs', {
  redis: connection, // Use the Redis connection
  // You can also specify additional options here if needed, such as concurrency, retry policy, etc.
});

module.exports = scrapeQueue;
