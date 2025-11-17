import mongoose from 'mongoose';

// Store a snapshot of the selected option and its price at time of purchase
const SelectedOptionSnapshotSchema = new mongoose.Schema({
  attributeName: { type: String, required: true }, // Changed from featureName
  optionLabel: { type: String, required: true },
  priceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Price', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  billingType: { type: String, required: true },
}, { _id: false });

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  
  // Array of all Price IDs included in this subscription (base + options)
  priceItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Price' }],
  
  // CRITICAL: A snapshot of the user's choices. This prevents changes to the
  // master product/attribute/option from affecting existing customer invoices.
  configurationSnapshot: [SelectedOptionSnapshotSchema],
  
  // Stripe Integration
  stripeSubscriptionId: { type: String, unique: true, required: true },
  stripeCustomerId: { type: String, required: true },
  status: {
    type: String,
    enum: ['trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired'],
    required: true,
  },
  currentPeriodStart: { type: Date },
  currentPeriodEnd: { type: Date }, // Fixed: was { type Date }
  cancelAtPeriodEnd: { type: Boolean, default: false },
  canceledAt: { type: Date },
  endedAt: { type: Date },
  trialStart: { type: Date },
  trialEnd: { type: Date },
}, { timestamps: true });

export default mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);





