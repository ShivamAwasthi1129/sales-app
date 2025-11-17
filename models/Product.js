import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  image: { type: String }, // Changed from imageUrl to match schema
  imageUrl: { type: String }, // Keep both for compatibility during migration
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  
  // This is the key change. We now reference attributes, not embed them.
  attributes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attribute' }],
  
  // This is the core price for the product (e.g., the monthly subscription base).
  basePrice: { type: mongoose.Schema.Types.ObjectId, ref: 'Price' }, // Made optional for development
  
  // Additional fields for frontend compatibility
  discount: { type: Number, min: 0, max: 100 }, // Discount percentage
  billingMode: { type: String, enum: ['subscription', 'one-time'] }, // Quick reference
  
  // Stripe Integration
  stripeProductId: { type: String, unique: true, sparse: true }, // sparse allows multiple nulls
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'draft' },
  tags: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);




