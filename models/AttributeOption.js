import mongoose from 'mongoose';

const AttributeOptionSchema = new mongoose.Schema({
  label: { type: String, required: true }, // e.g., "E-commerce", "16GB RAM"
  value: { type: String, required: true }, // e.g., "ecom", "16gb_ram"
  description: { type: String },
  
  // THE MOST IMPORTANT CHANGE: An option has a price, which is its own document.
  // This can be a zero-dollar price if the option is included by default.
  // This price ID is what gets sent to Stripe.
  price: { type: mongoose.Schema.Types.ObjectId, ref: 'Price', required: true },
  defaultSelected: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
}, { timestamps: true });

export default mongoose.models.AttributeOption || mongoose.model('AttributeOption', AttributeOptionSchema);






