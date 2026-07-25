import express, { Request, Response } from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors"; // Cross-Origin resource sharing
import NodeCache from "node-cache";
import mongoose from "mongoose";
import YahooFinance from "yahoo-finance2";
import portfolioRoutes from "./routes/portfolioRoutes";
import marketRoutes from "./routes/marketRoutes";
import watchlistRoutes from "./routes/watchlistRoutes";
import { startAlertWorker } from "./services/alertWorker";

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const app = express();
const PORT = process.env.PORT || 5001;

// ---------------------------------------------------------------------------
// HTTP & WebSocket Server Setup
// ---------------------------------------------------------------------------
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log(`🔌 New WebSocket Connection: ${socket.id}`);

  // Emit real live market data every 10 seconds to avoid strict rate limits
  const intervalId = setInterval(async () => {
    try {
      const usSymbols = ['^GSPC', '^DJI', '^IXIC']; // S&P 500, Dow Jones, Nasdaq
      const inSymbols = ['^NSEI', '^BSESN', '^CNXIT']; // Nifty 50, Sensex, Nifty IT
      const cryptoSymbols = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'DOGE-USD']; // Crypto
      const marqueeSymbols = ['AAPL', 'BTC-USD', 'GC=F', 'RELIANCE.NS'];
      
      const allSymbols = Array.from(new Set([...usSymbols, ...inSymbols, ...cryptoSymbols, ...marqueeSymbols]));
      const quotes = await yahooFinance.quote(allSymbols);
      
      const marketData: any = {
        timestamp: new Date().toISOString(),
        US: {},
        IN: {},
        CRYPTO: {},
        MARQUEE: {}
      };
      
      quotes.forEach(q => {
        const key = q.symbol.replace('^', '').replace('-USD', '').replace('=F', '');
        if (usSymbols.includes(q.symbol)) {
          marketData.US[key] = q.regularMarketPrice;
        }
        if (inSymbols.includes(q.symbol)) {
          marketData.IN[key] = q.regularMarketPrice;
        }
        if (cryptoSymbols.includes(q.symbol)) {
          // Keep the -USD for crypto if preferred, or use the stripped key
          marketData.CRYPTO[q.symbol.replace('-USD', '')] = q.regularMarketPrice;
        }
        if (marqueeSymbols.includes(q.symbol)) {
          marketData.MARQUEE[key] = q.regularMarketPrice;
        }
      });

      socket.emit("marketUpdate", marketData);
    } catch (err) {
      console.error("Socket emit error:", err);
    }
  }, 10000);

  // Prevent memory leaks by clearing the interval on disconnect
  socket.on("disconnect", () => {
    console.log(`🔌 WebSocket Disconnected: ${socket.id}`);
    clearInterval(intervalId);
  });
});

// Initialize cache with 5 minutes (300 seconds) standard TTL
const cache = new NodeCache({ stdTTL: 300 });

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());

// Mount the routes
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/watchlists", watchlistRoutes);

// ---------------------------------------------------------------------------
// Health-check route
// ---------------------------------------------------------------------------
app.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "Portfolio Dashboard API is running",
    timestamp: new Date().toISOString(),
  });
});

// The old mock market route has been moved to marketRoutes.ts and replaced with real data endpoints.

// ---------------------------------------------------------------------------
// MongoDB Connection
// ---------------------------------------------------------------------------

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/portfolio-db";

async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

connectDB().then(() => {
  // Start the background cron job for alerts
  startAlertWorker();

  httpServer.listen(PORT, () => {
    console.log(`🚀  Server is listening on http://localhost:${PORT}`);
  });
});

export default app;
