import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  userEmail: string;
  symbol: string;
  region: 'US' | 'IN' | 'CRYPTO';
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  date: Date;
  // Paper-trade position lifecycle. Orders created before this field existed
  // have no `status` stored; they are treated as open everywhere.
  status: 'open' | 'closed';
  closePrice?: number;
  closedAt?: Date;
  realizedPnL?: number;
}

const OrderSchema: Schema = new Schema({
  userEmail: { type: String, required: true },
  symbol: { type: String, required: true },
  region: { type: String, required: true, enum: ['US', 'IN', 'CRYPTO'] },
  type: { type: String, required: true, enum: ['BUY', 'SELL'] },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  total: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  closePrice: { type: Number },
  closedAt: { type: Date },
  realizedPnL: { type: Number }
});

export default mongoose.model<IOrder>('Order', OrderSchema);
