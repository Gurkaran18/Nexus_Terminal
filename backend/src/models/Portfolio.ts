import mongoose, { Schema, Document, Model } from "mongoose";

// ---------------------------------------------------------------------------
// TypeScript Interface
// ---------------------------------------------------------------------------

/** Allowed asset classes for a portfolio holding. */
export type AssetType = "equity" | "crypto" | "etf";

/** Shape of a single Portfolio Asset document (extends Mongoose Document). */
export interface IPortfolioAsset extends Document {
  userEmail: string;
  assetSymbol: string;
  assetType: AssetType;
  quantity: number;
  averagePurchasePrice: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Mongoose Schema
// ---------------------------------------------------------------------------

const PortfolioAssetSchema: Schema<IPortfolioAsset> = new Schema(
  {
    userEmail: {
      type: String,
      required: [true, "User email is required"],
      trim: true,
      lowercase: true,
    },
    assetSymbol: {
      type: String,
      required: [true, "Asset symbol is required"],
      trim: true,
      uppercase: true,
    },
    assetType: {
      type: String,
      required: [true, "Asset type is required"],
      enum: {
        values: ["equity", "crypto", "etf"],
        message: "{VALUE} is not a valid asset type",
      },
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
    },
    averagePurchasePrice: {
      type: Number,
      required: [true, "Average purchase price is required"],
      min: [0, "Average purchase price cannot be negative"],
    },
  },
  {
    timestamps: true, // auto-generates createdAt & updatedAt
  }
);

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

const PortfolioAsset: Model<IPortfolioAsset> = mongoose.model<IPortfolioAsset>(
  "PortfolioAsset",
  PortfolioAssetSchema
);

export default PortfolioAsset;
