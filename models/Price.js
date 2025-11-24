import mongoose from 'mongoose';

const PriceSchema = new mongoose.Schema({
  // A price can be for a product or a standalone option
  // It's not strictly required to allow for custom, one-off prices.
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  
  amount: { type: Number, required: true, min: 0 }, // Price in the smallest currency unit (e.g., cents)
  currency: { type: String, required: true, default: 'usd' },
  
  // 'one_time' for setup fees, 'recurring' for subscriptions
  billingType: { type: String, enum: ['one_time', 'recurring'], required: true },
  
  // Only if billingType is 'recurring'
  interval: { type: String, enum: ['day', 'week', 'month', 'year'] },
  intervalCount: { type: Number, min: 1, default: 1 },
  
  // Stripe Integration
  stripePriceId: { type: String, unique: true, sparse: true },
  nickname: { type: String }, // Internal name, e.g., "Pro Plan (Monthly)"
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
}, { timestamps: true });

export default mongoose.models.Price || mongoose.model('Price', PriceSchema);

