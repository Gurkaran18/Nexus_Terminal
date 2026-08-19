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
}

const OrderSchema: Schema = new Schema({
  userEmail: { type: String, required: true },
  symbol: { type: String, required: true },
  region: { type: String, required: true, enum: ['US', 'IN', 'CRYPTO'] },
  type: { type: String, required: true, enum: ['BUY', 'SELL'] },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  total: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

export default mongoose.model<IOrder>('Order', OrderSchema);
