import express, { Request, Response } from 'express';
import Alert from '../models/Alert';

const router = express.Router();

// Create a new price alert
router.post('/', async (req: Request, res: Response) => {
  try {
    const { assetSymbol, targetPrice, condition, userEmail } = req.body;

    if (!assetSymbol || targetPrice === undefined || !condition || !userEmail) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const newAlert = new Alert({
      assetSymbol: assetSymbol.toUpperCase(),
      targetPrice,
      condition,
      userEmail,
      isTriggered: false
    });

    await newAlert.save();
    res.status(201).json(newAlert);
  } catch (error) {
    console.error("Error creating alert:", error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

export default router;
