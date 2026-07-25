import express, { Request, Response } from 'express';
import YahooFinance from 'yahoo-finance2';

const router = express.Router();
// Initialize YahooFinance instance
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// 1. Search Endpoint
router.get('/search/:query', async (req: Request, res: Response) => {
  try {
    const query = req.params.query as string;
    const results = await yahooFinance.search(query, { quotesCount: 5, newsCount: 0 });
    
    // Map the results to a clean format
    const formattedResults = results.quotes.map(q => ({
      symbol: q.symbol,
      name: q.shortname || q.longname || q.symbol,
      exchange: q.exchange,
    }));
    
    res.json(formattedResults);
  } catch (error) {
    console.error("Search API Error:", error);
    res.status(500).json({ error: 'Failed to search for stocks' });
  }
});

// 2. Quote Summary Endpoint
router.get('/quote/:symbol', async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol as string;
    const quote = await yahooFinance.quoteSummary(symbol, { modules: ['price', 'summaryDetail'] });
    
    res.json({
      symbol: symbol,
      name: quote.price?.shortName || quote.price?.longName || symbol,
      price: quote.price?.regularMarketPrice || 0,
      change: quote.price?.regularMarketChange || 0,
      changePercent: quote.price?.regularMarketChangePercent || 0,
      marketCap: quote.summaryDetail?.marketCap || 0,
      trailingPE: quote.summaryDetail?.trailingPE || null,
      fiftyTwoWeekHigh: quote.summaryDetail?.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: quote.summaryDetail?.fiftyTwoWeekLow || 0,
      currency: quote.price?.currency || 'USD'
    });
  } catch (error) {
    console.error("Quote API Error:", error);
    res.status(500).json({ error: 'Failed to fetch quote details' });
  }
});

// 2.5 Multiple Quotes Endpoint
router.get('/quotes', async (req: Request, res: Response) => {
  try {
    const symbolsStr = req.query.symbols as string;
    if (!symbolsStr) {
      res.json([]);
      return;
    }
    const symbols = symbolsStr.split(',');
    const quotes = await yahooFinance.quote(symbols);
    
    const results = quotes.map(q => ({
      symbol: q.symbol,
      price: q.regularMarketPrice || 0,
      change: q.regularMarketChange || 0,
      changePercent: q.regularMarketChangePercent || 0
    }));
    
    res.json(results);
  } catch (error) {
    console.error("Quotes API Error:", error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// 3. Top Movers Endpoint
router.get('/movers', async (req: Request, res: Response) => {
  try {
    const region = (req.query.region as string) || 'US';

    const formatScreener = (data: any) => data.map((q: any) => ({
      symbol: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      price: q.regularMarketPrice,
      changePercent: q.regularMarketChangePercent
    }));

    if (region === 'IN') {
      // Yahoo Finance screeners are heavily biased to US. We manually pull top Indian stocks and sort them.
      const indianSymbols = [
        'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
        'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'LT.NS', 'BAJFINANCE.NS',
        'HINDUNILVR.NS', 'AXISBANK.NS', 'KOTAKBANK.NS', 'MARUTI.NS', 'SUNPHARMA.NS'
      ];
      
      const quotes = await yahooFinance.quote(indianSymbols);
      
      // Sort for Gainers (Highest % change)
      const gainers = [...quotes].sort((a, b) => (b.regularMarketChangePercent || 0) - (a.regularMarketChangePercent || 0)).slice(0, 5);
      
      // Sort for Losers (Lowest % change)
      const losers = [...quotes].sort((a, b) => (a.regularMarketChangePercent || 0) - (b.regularMarketChangePercent || 0)).slice(0, 5);
      
      // Sort for Volume (Highest volume)
      const actives = [...quotes].sort((a, b) => (b.regularMarketVolume || 0) - (a.regularMarketVolume || 0)).slice(0, 5);

      res.json({
        gainers: formatScreener(gainers),
        losers: formatScreener(losers),
        volumeShockers: formatScreener(actives)
      });
      return;
    }

    if (region === 'CRYPTO') {
      const cryptoSymbols = [
        'BTC-USD', 'ETH-USD', 'USDT-USD', 'BNB-USD', 'SOL-USD',
        'XRP-USD', 'USDC-USD', 'ADA-USD', 'AVAX-USD', 'DOGE-USD',
        'TRX-USD', 'DOT-USD', 'LINK-USD', 'MATIC-USD', 'TON11419-USD'
      ];
      
      const quotes = await yahooFinance.quote(cryptoSymbols);

      const formatCrypto = (q: any) => ({
        symbol: q.symbol,
        name: q.shortName || q.longName || q.symbol,
        price: q.regularMarketPrice,
        changePercent: q.regularMarketChangePercent
      });

      const gainers = [...quotes].sort((a, b) => (b.regularMarketChangePercent || 0) - (a.regularMarketChangePercent || 0)).slice(0, 5);
      const losers = [...quotes].sort((a, b) => (a.regularMarketChangePercent || 0) - (b.regularMarketChangePercent || 0)).slice(0, 5);
      const actives = [...quotes].sort((a, b) => (b.regularMarketVolume || 0) - (a.regularMarketVolume || 0)).slice(0, 5);

      res.json({
        gainers: gainers.map(formatCrypto),
        losers: losers.map(formatCrypto),
        volumeShockers: actives.map(formatCrypto)
      });
      return;
    }

    // Default US Logic
    const [gainersData, losersData, activesData] = await Promise.all([
      yahooFinance.screener({ scrIds: 'day_gainers', count: 5 }),
      yahooFinance.screener({ scrIds: 'day_losers', count: 5 }),
      yahooFinance.screener({ scrIds: 'most_actives', count: 5 })
    ]);

    res.json({
      gainers: formatScreener(gainersData.quotes),
      losers: formatScreener(losersData.quotes),
      volumeShockers: formatScreener(activesData.quotes)
    });
  } catch (error) {
    console.error("Movers API Error:", error);
    res.status(500).json({ error: 'Failed to fetch market movers' });
  }
});

// 3. Sectors Endpoint (Option A: Real Prices, Simulated Ratios)
router.get('/sectors', async (req: Request, res: Response) => {
  try {
    const region = (req.query.region as string) || 'US';

    // Map abstract sectors to real major ETFs based on region
    let sectorMap: { id: string, name: string }[] = [];
    if (region === 'IN') {
      sectorMap = [
        { id: '^CNXIT', name: 'Technology' },
        { id: '^CNXPHARMA', name: 'Healthcare' },
        { id: '^CNXFIN', name: 'Financials' },
        { id: '^CNXENERGY', name: 'Energy' },
        { id: '^CNXAUTO', name: 'Auto' },
      ];
    } else if (region === 'CRYPTO') {
      sectorMap = [
        { id: 'BTC-USD', name: 'Store of Value' },
        { id: 'ETH-USD', name: 'Smart Contracts' },
        { id: 'SOL-USD', name: 'Layer 1s' },
        { id: 'UNI7083-USD', name: 'DeFi' },
        { id: 'DOGE-USD', name: 'Memes' },
      ];
    } else {
      sectorMap = [
        { id: 'XLK', name: 'Technology' },
        { id: 'XLV', name: 'Healthcare' },
        { id: 'XLF', name: 'Financials' },
        { id: 'XLE', name: 'Energy' },
        { id: 'XLY', name: 'Consumer Discretionary' },
      ];
    }

    const symbols = sectorMap.map(s => s.id);
    const quotes = await yahooFinance.quote(symbols);

    const formattedSectors = sectorMap.map(sector => {
      const quote = quotes.find(q => q.symbol === sector.id);
      
      // Generate a simulated green/red ratio (e.g., 29 gainers, 10 losers)
      // We weight it slightly based on whether the overall sector is up or down
      const isUp = (quote?.regularMarketChangePercent || 0) >= 0;
      const gainerBase = isUp ? 60 : 20;
      const gainersCount = Math.floor(gainerBase + Math.random() * 40);
      const losersCount = 100 - gainersCount;

      return {
        name: sector.name,
        symbol: sector.id,
        priceChange: quote?.regularMarketChangePercent || 0,
        gainers: gainersCount,
        losers: losersCount
      };
    });

    res.json(formattedSectors);
  } catch (error) {
    console.error("Sectors API Error:", error);
    res.status(500).json({ error: 'Failed to fetch sectors' });
  }
});

// 4. Historical Chart Endpoint
router.get('/history', async (req: Request, res: Response) => {
  try {
    const symbolsStr = req.query.symbols as string;
    const range = (req.query.range as string) || '1mo'; // 1mo, 3mo, 6mo, 1y, 5y
    
    if (!symbolsStr) {
      res.status(400).json({ error: 'Missing symbols parameter' });
      return;
    }

    const symbols = symbolsStr.split(',');
    
    // Map abstract range strings to yahoo finance ranges/intervals
    let queryOptions: any = { interval: '1d' };
    
    // Yahoo finance chart requires period1 (Date or timestamp)
    const now = new Date();
    let period1 = new Date();
    
    switch (range) {
      case '1w': period1.setDate(now.getDate() - 7); queryOptions.interval = '1d'; break;
      case '1mo': period1.setMonth(now.getMonth() - 1); queryOptions.interval = '1d'; break;
      case '1y': period1.setFullYear(now.getFullYear() - 1); queryOptions.interval = '1wk'; break;
      case '2y': period1.setFullYear(now.getFullYear() - 2); queryOptions.interval = '1wk'; break;
      case '5y': period1.setFullYear(now.getFullYear() - 5); queryOptions.interval = '1mo'; break;
      default: period1.setMonth(now.getMonth() - 1); break;
    }
    
    queryOptions.period1 = period1;

    // Fetch historical data for all requested symbols
    const promises = symbols.map(async (symbol) => {
      try {
        const result = await yahooFinance.chart(symbol, queryOptions);
        return { symbol, quotes: result.quotes };
      } catch (err) {
        console.warn(`Failed to fetch history for ${symbol}`, err);
        return { symbol, quotes: [] };
      }
    });

    const results = await Promise.all(promises);
    res.json(results);
  } catch (error) {
    console.error("History API Error:", error);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

export default router;
