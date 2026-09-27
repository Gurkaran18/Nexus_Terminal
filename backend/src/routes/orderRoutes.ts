import express from 'express';
import mongoose from 'mongoose';
import YahooFinance from 'yahoo-finance2';
import Order from '../models/Order';
import Watchlist, { IWatchlist } from '../models/Watchlist';

const router = express.Router();
// Same client setup as the market routes use for quotes.
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// GET all orders for a user
router.get('/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { region } = req.query;
    
    let query: any = { userEmail: email };
    if (region) {
      query.region = region;
    }
    
    const orders = await Order.find(query).sort({ date: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Server error fetching orders' });
  }
});

// POST a new order
router.post('/', async (req, res) => {
  try {
    const { userEmail, symbol, region, type, quantity, price } = req.body;
    
    const total = quantity * price;
    const newOrder = new Order({
      userEmail,
      symbol,
      region,
      type,
      quantity,
      price,
      total
    });
    
    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Server error creating order' });
  }
});


// Reducing the watchlist holding that a closed BUY order represents.
//
// An order records userEmail, symbol, region, type, quantity and price, but
// not the watchlist it was added to, so the holding has to be resolved by
// user + symbol. When more than one watchlist holds the symbol we prefer one
// that can cover the whole order and say which one was used, rather than
// spreading the reduction over several lists.
interface HoldingAdjustment {
  applied: boolean;
  message: string;
  watchlistId?: string;
  watchlistName?: string;
  reducedBy?: number;
  remainingQuantity?: number;
  assetRemoved?: boolean;
  shortfall?: number;
  otherWatchlistsWithSymbol?: number;
}

const quantityOf = (watchlist: IWatchlist, symbol: string) =>
  watchlist.assets.find(a => a.symbol === symbol)?.quantity ?? 0;

async function reduceHolding(
  userEmail: string,
  symbol: string,
  quantity: number
): Promise<HoldingAdjustment> {
  const candidates = await Watchlist.find({
    userEmail: userEmail.toLowerCase(),
    'assets.symbol': symbol
  });

  if (candidates.length === 0) {
    return {
      applied: false,
      message: `No watchlist holding for ${symbol} was found, so the order was closed without changing any holding.`
    };
  }

  // Prefer a list that covers the full order, otherwise the largest holding.
  const chosen =
    candidates.find(w => quantityOf(w, symbol) >= quantity) ||
    candidates.reduce((a, b) => (quantityOf(b, symbol) > quantityOf(a, symbol) ? b : a));

  const index = chosen.assets.findIndex(a => a.symbol === symbol);
  const held = chosen.assets[index].quantity;
  const reducedBy = Math.min(held, quantity);
  const remaining = held - reducedBy;
  const shortfall = quantity - reducedBy;

  if (remaining <= 0) {
    chosen.assets.splice(index, 1);
  } else {
    // The average purchase price of the remaining quantity is unchanged.
    chosen.assets[index].quantity = remaining;
  }
  await chosen.save();

  const parts = [
    `Reduced ${symbol} by ${reducedBy} in watchlist "${chosen.name}"`,
    remaining <= 0 ? 'and removed the holding' : `leaving ${remaining}`
  ];
  if (shortfall > 0) {
    parts.push(`the holding was short by ${shortfall} of the order's ${quantity}`);
  }

  return {
    applied: true,
    message: parts.join('; ') + '.',
    watchlistId: String(chosen._id),
    watchlistName: chosen.name,
    reducedBy,
    remainingQuantity: remaining > 0 ? remaining : 0,
    assetRemoved: remaining <= 0,
    ...(shortfall > 0 ? { shortfall } : {}),
    ...(candidates.length > 1 ? { otherWatchlistsWithSymbol: candidates.length - 1 } : {})
  };
}

// PATCH close a paper-trade position at the current market price
router.patch('/:id/close', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid order ID' });
      return;
    }

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status === 'closed') {
      res.status(409).json({ error: 'Order is already closed' });
      return;
    }

    const quote = await yahooFinance.quote(order.symbol);
    const closePrice = quote?.regularMarketPrice;
    if (typeof closePrice !== 'number') {
      res.status(502).json({ error: `No current price available for ${order.symbol}` });
      return;
    }

    // A BUY gains when the price rises, a SELL gains when it falls.
    const realizedPnL = order.type === 'BUY'
      ? (closePrice - order.price) * order.quantity
      : (order.price - closePrice) * order.quantity;

    order.status = 'closed';
    order.closePrice = closePrice;
    order.closedAt = new Date();
    order.realizedPnL = realizedPnL;

    const updated = await order.save();

    // The order is saved first on purpose. Mongo runs standalone here, so
    // there is no transaction to span both documents; closing first means a
    // failure below leaves the holding untouched and a retry is refused with
    // 409, rather than risking the holding being reduced twice.
    let holdingAdjustment: HoldingAdjustment;
    if (order.type === 'BUY') {
      try {
        holdingAdjustment = await reduceHolding(order.userEmail, order.symbol.toUpperCase(), order.quantity);
      } catch (err) {
        console.error('Order closed but reducing the watchlist holding failed:', err);
        holdingAdjustment = {
          applied: false,
          message: `The order was closed, but reducing the ${order.symbol} holding failed. The watchlist is unchanged.`
        };
      }
    } else {
      holdingAdjustment = {
        applied: false,
        message: 'Closing a SELL order does not change watchlist holdings.'
      };
    }

    res.json({ ...updated.toObject(), holdingAdjustment });
  } catch (error) {
    console.error('Error closing order:', error);
    res.status(500).json({ error: 'Server error closing order' });
  }
});

export default router;
