import mongoose from 'mongoose';
import { createClient } from 'redis';
import cron from 'node-cron';
import Alert from './models/Alert';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/portfolio-db';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const redisClient = createClient({ url: REDIS_URL });
redisClient.on('error', (err) => console.error('Redis Publisher Error:', err));

async function startWorker() {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log("✅ Worker connected to MongoDB");

    // 2. Connect to Redis
    await redisClient.connect();
    console.log("✅ Worker connected to Redis");

    console.log("⏰ Alert Microservice running. Checking conditions every minute.");

    // 3. Start Cron Job
    cron.schedule("* * * * *", async () => {
      try {
        const activeAlerts = await Alert.find({ isTriggered: false });
        if (activeAlerts.length === 0) return;

        for (const alert of activeAlerts) {
          // Simulate checking the current price by generating a random price
          const currentPrice = +(Math.random() * 1000).toFixed(2);
          let isHit = false;

          if (alert.condition === "above" && currentPrice >= alert.targetPrice) {
            isHit = true;
          } else if (alert.condition === "below" && currentPrice <= alert.targetPrice) {
            isHit = true;
          }

          if (isHit) {
            console.log(`\n🚨 MICROSERVICE ALERT: [${alert.assetSymbol}] has hit target price! Publishing to Redis...`);

            // Publish message to Redis
            const payload = JSON.stringify({
              assetSymbol: alert.assetSymbol,
              targetPrice: alert.targetPrice,
              currentPrice,
              condition: alert.condition
            });
            await redisClient.publish('PRICE_ALERTS', payload);

            // Mark as triggered
            alert.isTriggered = true;
            await alert.save();
          }
        }
      } catch (err) {
        console.error("Error in cron loop:", err);
      }
    });
  } catch (error) {
    console.error("Worker initialization failed:", error);
    process.exit(1);
  }
}

startWorker();
