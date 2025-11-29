import mongoose from 'mongoose';

const FeatureSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  value: {
    type: String,
    trim: true,
  },
  isIncluded: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

const PlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a plan name'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Please provide a price'],
    min: 0,
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly', 'one-time'],
    default: 'monthly',
  },
  usersLimit: {
    type: Number,
    required: [true, 'Please provide users limit'],
    min: 0,
  },
  salesPersonLimit: {
    type: Number,
    required: [true, 'Please provide sales person limit'],
    min: 0,
    default: 0,
  },
  quotationLimit: {
    type: Number,
    required: [true, 'Please provide quotation limit'],
    min: 0,
    default: 0,
  },
  features: {
    type: [FeatureSchema],
    default: [],
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Archived'],
    default: 'Active',
  },
  isPopular: {
    type: Boolean,
    default: false,
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
  // Tracking
  subscriptionCount: {
    type: Number,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before updating
PlanSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

export default mongoose.models.Plan || mongoose.model('Plan', PlanSchema);

