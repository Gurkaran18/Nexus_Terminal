import mongoose from 'mongoose';
import { createClient } from 'redis';
import cron from 'node-cron';
import YahooFinance from 'yahoo-finance2';
import Alert from './models/Alert';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/portfolio-db';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const redisClient = createClient({ url: REDIS_URL });
redisClient.on('error', (err) => console.error('Redis Publisher Error:', err));

/**
 * Fetch live prices for every symbol in ONE batched Yahoo Finance call.
 * Returns a symbol -> regularMarketPrice map. On failure the map is empty,
 * so the cron loop simply skips this run instead of crashing the worker.
 */
async function fetchPrices(symbols: string[]): Promise<Record<string, number>> {
  const priceMap: Record<string, number> = {};

  try {
    const quotes = await yahooFinance.quote(symbols);
    const quotesArr = Array.isArray(quotes) ? quotes : [quotes];

    quotesArr.forEach((q: any) => {
      if (q?.symbol && typeof q.regularMarketPrice === 'number') {
        priceMap[q.symbol] = q.regularMarketPrice;
      }
    });
  } catch (err) {
    console.error('Yahoo Finance batch quote error:', err);
  }

  return priceMap;
}

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

        // One batched quote call per run, not one per alert
        const symbols = Array.from(new Set(activeAlerts.map((a) => a.assetSymbol)));
        const priceMap = await fetchPrices(symbols);

        for (const alert of activeAlerts) {
          const currentPrice = priceMap[alert.assetSymbol];

          // Skip alerts whose quote is missing (bad symbol, delisted, API hiccup)
          if (typeof currentPrice !== 'number') {
            console.warn(`⚠️  No live price for [${alert.assetSymbol}] — skipping this alert.`);
            continue;
          }

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

            // Mark as triggered so it only fires once
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
