import mongoose, { Schema, Document, Model } from "mongoose";

// ---------------------------------------------------------------------------
// TypeScript Interface
// ---------------------------------------------------------------------------

export interface IWatchlistAsset {
  symbol: string;
  quantity: number;
  averagePurchasePrice: number;
}

export interface IWatchlist extends Document {
  userEmail: string;
  name: string;
  region: 'US' | 'IN';
  assets: IWatchlistAsset[];
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Mongoose Schema
// ---------------------------------------------------------------------------

const WatchlistAssetSchema = new Schema<IWatchlistAsset>({
  symbol: { type: String, required: true, uppercase: true },
  quantity: { type: Number, required: true, min: 0 },
  averagePurchasePrice: { type: Number, required: true, min: 0 }
});

const WatchlistSchema: Schema<IWatchlist> = new Schema(
  {
    userEmail: {
      type: String,
      required: [true, "User email is required"],
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, "Watchlist name is required"],
      trim: true,
    },
    region: {
      type: String,
      required: [true, "Region is required"],
      enum: ['US', 'IN'],
    },
    assets: [WatchlistAssetSchema]
  },
  {
    timestamps: true, // auto-generates createdAt & updatedAt
  }
);

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

const Watchlist: Model<IWatchlist> = mongoose.model<IWatchlist>(
  "Watchlist",
  WatchlistSchema
);

export default Watchlist;
