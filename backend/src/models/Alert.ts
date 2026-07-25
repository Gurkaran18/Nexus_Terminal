import mongoose, { Schema, Document, Model } from "mongoose";

// ---------------------------------------------------------------------------
// TypeScript Interface
// ---------------------------------------------------------------------------

export type AlertCondition = "above" | "below";

export interface IAlert extends Document {
  userEmail: string;
  assetSymbol: string;
  targetPrice: number;
  condition: AlertCondition;
  isTriggered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Mongoose Schema
// ---------------------------------------------------------------------------

const AlertSchema: Schema<IAlert> = new Schema(
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
    targetPrice: {
      type: Number,
      required: [true, "Target price is required"],
      min: [0, "Target price cannot be negative"],
    },
    condition: {
      type: String,
      required: [true, "Condition is required"],
      enum: {
        values: ["above", "below"],
        message: "{VALUE} is not a valid condition",
      },
    },
    isTriggered: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

const Alert: Model<IAlert> = mongoose.model<IAlert>("Alert", AlertSchema);

export default Alert;
