import express from 'express';
import Order from '../models/Order';

const router = express.Router();

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

export default router;
