import express, { Request, Response } from "express";
import PortfolioAsset, { AssetType } from "../models/Portfolio";
import mongoose from "mongoose";

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/portfolio
// Create a new portfolio asset holding
// ---------------------------------------------------------------------------

interface CreateAssetBody {
  userEmail: string;
  assetSymbol: string;
  assetType: AssetType;
  quantity: number;
  averagePurchasePrice: number;
}

router.post(
  "/",
  async (req: Request<{}, {}, CreateAssetBody>, res: Response) => {
    try {
      const {
        userEmail,
        assetSymbol,
        assetType,
        quantity,
        averagePurchasePrice,
      } = req.body;

      // Basic validation
      if (
        !userEmail ||
        !assetSymbol ||
        !assetType ||
        quantity === undefined ||
        averagePurchasePrice === undefined
      ) {
         res.status(400).json({ error: "Missing required fields" });
         return;
      }

      const newAsset = new PortfolioAsset({
        userEmail,
        assetSymbol,
        assetType,
        quantity,
        averagePurchasePrice,
      });

      const savedAsset = await newAsset.save();
      res.status(201).json(savedAsset);
    } catch (error: any) {
      console.error("Error creating asset:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/portfolio/:email
// Retrieve all asset holdings for a specific user email
// ---------------------------------------------------------------------------

interface GetPortfolioParams {
  email: string;
}

router.get(
  "/:email",
  async (req: Request<GetPortfolioParams>, res: Response) => {
    try {
      const { email } = req.params;

      if (!email) {
         res.status(400).json({ error: "Email parameter is required" });
         return;
      }

      // Case-insensitive email search (although lowercase is enforced by schema)
      const assets = await PortfolioAsset.find({ 
        userEmail: email.toLowerCase() 
      }).sort({ createdAt: -1 });

      res.status(200).json(assets);
    } catch (error: any) {
      console.error("Error fetching portfolio:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/portfolio/:id
// Remove a specific asset transaction by its MongoDB document ID
// ---------------------------------------------------------------------------

interface DeleteAssetParams {
  id: string;
}

router.delete(
  "/:id",
  async (req: Request<DeleteAssetParams>, res: Response) => {
    try {
      const { id } = req.params;

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
         res.status(400).json({ error: "Invalid asset ID format" });
         return;
      }

      const deletedAsset = await PortfolioAsset.findByIdAndDelete(id);

      if (!deletedAsset) {
         res.status(404).json({ error: "Asset not found" });
         return;
      }

      res.status(200).json({ message: "Asset deleted successfully", deletedAsset });
    } catch (error: any) {
      console.error("Error deleting asset:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }
);

export default router;
