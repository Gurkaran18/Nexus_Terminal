import express from 'express';
import mongoose from 'mongoose';
import YahooFinance from 'yahoo-finance2';
import Order from '../models/Order';

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
    res.json(updated);
  } catch (error) {
    console.error('Error closing order:', error);
    res.status(500).json({ error: 'Server error closing order' });
  }
});

export default router;
