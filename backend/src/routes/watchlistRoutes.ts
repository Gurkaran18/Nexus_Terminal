import express, { Request, Response } from "express";
import Watchlist from "../models/Watchlist";
import mongoose from "mongoose";

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/watchlists
// Create a new watchlist
// ---------------------------------------------------------------------------
router.post("/", async (req: Request, res: Response) => {
  try {
    const { userEmail, name, region } = req.body;

    if (!userEmail || !name || !region) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const newWatchlist = new Watchlist({
      userEmail,
      name,
      region,
      assets: []
    });

    const savedWatchlist = await newWatchlist.save();
    res.status(201).json(savedWatchlist);
  } catch (error: any) {
    console.error("Error creating watchlist:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/watchlists/:email
// Retrieve all watchlists for a user
// ---------------------------------------------------------------------------
router.get("/:userEmail", async (req: Request, res: Response) => {
  try {
    const userEmail = (req.params.userEmail as string).toLowerCase();
    if (!userEmail) {
      res.status(400).json({ error: "Email parameter is required" });
      return;
    }

    const watchlists = await Watchlist.find({ userEmail: userEmail }).sort({ createdAt: -1 });
    res.status(200).json(watchlists);
  } catch (error: any) {
    console.error("Error fetching watchlists:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/watchlists/:id/name
// Rename a watchlist
// ---------------------------------------------------------------------------
router.put("/:watchlistId/name", async (req: Request, res: Response) => {
  try {
    const watchlistId = req.params.watchlistId as string;
    const { name } = req.body;

    if (!mongoose.Types.ObjectId.isValid(watchlistId)) {
      res.status(400).json({ error: "Invalid watchlist ID" });
      return;
    }
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const updated = await Watchlist.findByIdAndUpdate(watchlistId, { name }, { new: true });
    if (!updated) {
      res.status(404).json({ error: "Watchlist not found" });
      return;
    }

    res.status(200).json(updated);
  } catch (error: any) {
    console.error("Error renaming watchlist:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/watchlists/:id/assets
// Add an asset to a watchlist
// ---------------------------------------------------------------------------
router.post("/:watchlistId/assets", async (req: Request, res: Response) => {
  try {
    const watchlistId = req.params.watchlistId as string;
    const { symbol, quantity, averagePurchasePrice } = req.body;

    if (!mongoose.Types.ObjectId.isValid(watchlistId)) {
      res.status(400).json({ error: "Invalid watchlist ID" });
      return;
    }

    const watchlist = await Watchlist.findById(watchlistId);
    if (!watchlist) {
      res.status(404).json({ error: "Watchlist not found" });
      return;
    }

    // Check if asset already exists, if so, we can add to quantity or update it. For simplicity, just append or update.
    const existingIndex = watchlist.assets.findIndex(a => a.symbol === symbol.toUpperCase());
    if (existingIndex > -1) {
      // Update existing
      const existing = watchlist.assets[existingIndex];
      const totalQty = existing.quantity + quantity;
      const totalCost = (existing.quantity * existing.averagePurchasePrice) + (quantity * averagePurchasePrice);
      watchlist.assets[existingIndex].quantity = totalQty;
      watchlist.assets[existingIndex].averagePurchasePrice = totalQty > 0 ? totalCost / totalQty : 0;
    } else {
      // Add new
      watchlist.assets.push({ symbol: symbol.toUpperCase(), quantity, averagePurchasePrice });
    }

    const updated = await watchlist.save();
    res.status(200).json(updated);
  } catch (error: any) {
    console.error("Error adding asset to watchlist:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/watchlists/:id
// Delete a watchlist
// ---------------------------------------------------------------------------
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid watchlist ID" });
      return;
    }

    const deleted = await Watchlist.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ error: "Watchlist not found" });
      return;
    }

    res.status(200).json({ message: "Watchlist deleted" });
  } catch (error: any) {
    console.error("Error deleting watchlist:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/watchlists/:watchlistId/assets/:symbol
// Update an existing asset in a watchlist (edit qty/price)
// ---------------------------------------------------------------------------
router.put("/:watchlistId/assets/:symbol", async (req: Request, res: Response) => {
  try {
    const watchlistId = req.params.watchlistId as string;
    const symbol = req.params.symbol.toUpperCase();
    const { quantity, averagePurchasePrice } = req.body;

    if (!mongoose.Types.ObjectId.isValid(watchlistId)) {
      res.status(400).json({ error: "Invalid watchlist ID" });
      return;
    }

    const watchlist = await Watchlist.findById(watchlistId);
    if (!watchlist) {
      res.status(404).json({ error: "Watchlist not found" });
      return;
    }

    const asset = watchlist.assets.find(a => a.symbol === symbol);
    if (!asset) {
      res.status(404).json({ error: "Asset not found in watchlist" });
      return;
    }

    asset.quantity = quantity;
    asset.averagePurchasePrice = averagePurchasePrice;

    const updated = await watchlist.save();
    res.status(200).json(updated);
  } catch (error: any) {
    console.error("Error updating asset:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/watchlists/:watchlistId/assets/:symbol
// Remove an asset from a watchlist entirely
// ---------------------------------------------------------------------------
router.delete("/:watchlistId/assets/:symbol", async (req: Request, res: Response) => {
  try {
    const watchlistId = req.params.watchlistId as string;
    const symbol = req.params.symbol.toUpperCase();

    if (!mongoose.Types.ObjectId.isValid(watchlistId)) {
      res.status(400).json({ error: "Invalid watchlist ID" });
      return;
    }

    const watchlist = await Watchlist.findById(watchlistId);
    if (!watchlist) {
      res.status(404).json({ error: "Watchlist not found" });
      return;
    }

    watchlist.assets = watchlist.assets.filter(a => a.symbol !== symbol);

    const updated = await watchlist.save();
    res.status(200).json(updated);
  } catch (error: any) {
    console.error("Error deleting asset:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

export default router;
