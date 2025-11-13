import mongoose from 'mongoose';

const TaxRateSchema = new mongoose.Schema({
  displayName: { type: String, required: true }, // e.g., "VAT", "Sales Tax"
  description: { type: String },
  jurisdiction: { type: String, required: true }, // e.g., "DE", "CA", "US-NY"
  percentage: { type: Number, required: true, min: 0, max: 100 },
  inclusive: { type: Boolean, default: false }, // Is tax included in the price? (VAT)
  
  // Stripe Integration
  stripeTaxRateId: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
}, { timestamps: true });

export default mongoose.models.TaxRate || mongoose.model('TaxRate', TaxRateSchema);

