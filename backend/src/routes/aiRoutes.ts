import express, { Request, Response } from "express";
import YahooFinance from "yahoo-finance2";
import PortfolioAsset from "../models/Portfolio";

const router = express.Router();
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://ai-service:8000";

// ---------------------------------------------------------------------------
// Helper: Build enriched portfolio context (MongoDB + Yahoo Finance live prices)
// ---------------------------------------------------------------------------
async function buildPortfolioPayload() {
  const assets = await PortfolioAsset.find({}).lean();

  if (assets.length === 0) {
    return { holdings: [], totalValue: 0, totalGainLoss: 0, totalGainLossPct: 0 };
  }

  // Fetch live prices in one batch call
  const symbols = [...new Set(assets.map((a) => a.assetSymbol))];
  let priceMap: Record<string, { price: number; name: string }> = {};

  try {
    const quotes = await yahooFinance.quote(symbols);
    const quotesArr = Array.isArray(quotes) ? quotes : [quotes];
    quotesArr.forEach((q: any) => {
      priceMap[q.symbol] = {
        price: q.regularMarketPrice ?? 0,
        name: q.shortName || q.longName || q.symbol,
      };
    });
  } catch (err) {
    console.error("Yahoo Finance batch quote error:", err);
  }

  // Aggregate multiple lots of the same symbol
  const holdingMap: Record<string, any> = {};
  for (const asset of assets) {
    const sym = asset.assetSymbol;
    if (!holdingMap[sym]) {
      holdingMap[sym] = {
        symbol: sym,
        name: priceMap[sym]?.name || sym,
        quantity: 0,
        totalCost: 0,
        currentPrice: priceMap[sym]?.price ?? asset.averagePurchasePrice,
      };
    }
    holdingMap[sym].quantity += asset.quantity;
    holdingMap[sym].totalCost += asset.quantity * asset.averagePurchasePrice;
  }

  const holdings = Object.values(holdingMap).map((h: any) => {
    const avgPrice = h.quantity > 0 ? h.totalCost / h.quantity : 0;
    const totalValue = h.currentPrice * h.quantity;
    const gainLoss = (h.currentPrice - avgPrice) * h.quantity;
    const gainLossPct = avgPrice > 0 ? ((h.currentPrice - avgPrice) / avgPrice) * 100 : 0;
    return { ...h, avgPrice, totalValue, gainLoss, gainLossPct };
  });

  const totalValue = holdings.reduce((s, h) => s + h.totalValue, 0);
  const totalGainLoss = holdings.reduce((s, h) => s + h.gainLoss, 0);
  const invested = totalValue - totalGainLoss;
  const totalGainLossPct = invested > 0 ? (totalGainLoss / invested) * 100 : 0;

  return { holdings, totalValue, totalGainLoss, totalGainLossPct };
}

// ---------------------------------------------------------------------------
// POST /api/ai/analyze
// Generate full AI portfolio analysis
// ---------------------------------------------------------------------------
router.post("/analyze", async (_req: Request, res: Response) => {
  try {
    const payload = await buildPortfolioPayload();

    if (payload.holdings.length === 0) {
      return res.json({
        response: "Your portfolio is empty. Add some holdings first to get an AI analysis! 📊",
        cached: false,
        model: "gemini-1.5-flash",
      });
    }

    const response = await fetch(`${AI_SERVICE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error("AI analyze error:", error);
    return res.status(500).json({ error: "Failed to connect to AI service" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/ask
// Answer a natural language question about the portfolio
// ---------------------------------------------------------------------------
router.post("/ask", async (req: Request, res: Response) => {
  const { question } = req.body;
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "question field is required" });
  }

  try {
    const payload = await buildPortfolioPayload();

    const response = await fetch(`${AI_SERVICE_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, ...payload }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error("AI ask error:", error);
    return res.status(500).json({ error: "Failed to connect to AI service" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/ai/health
// ---------------------------------------------------------------------------
router.get("/health", async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/health`);
    const data = await response.json();
    return res.json(data);
  } catch {
    return res.status(503).json({ status: "ai-service unreachable" });
  }
});

export default router;
