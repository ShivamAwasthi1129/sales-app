import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a company name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide a company email'],
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  website: {
    type: String,
    trim: true,
  },
  industry: {
    type: String,
    trim: true,
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Keep for backward compatibility - primary admin
  },
  adminIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: [],
    // Optional - can have multiple admins
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: [true, 'Please select a subscription plan'],
  },
  // Plan limits tracking
  planLimits: {
    salesPersonLimit: {
      type: Number,
      default: 0,
    },
    quotationLimit: {
      type: Number,
      default: 0,
    },
    usersLimit: {
      type: Number,
      default: 0,
    },
  },
  // Current usage
  currentUsage: {
    salesPersonCount: {
      type: Number,
      default: 0,
    },
    quotationCount: {
      type: Number,
      default: 0,
    },
    usersCount: {
      type: Number,
      default: 0,
    },
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended'],
    default: 'Active',
  },
  logo: {
    type: String,
  },
  description: {
    type: String,
    trim: true,
  },
  // Enabled roles for this company
  enabledRoles: {
    type: [String],
    enum: ['Admin', 'Customer', 'Sales Person'],
    default: ['Admin', 'Customer', 'Sales Person'],
  },
  // Sidebar modules configuration for this company
  sidebarModules: {
    type: Map,
    of: Boolean,
    default: function() {
      return new Map();
    },
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
CompanySchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);

