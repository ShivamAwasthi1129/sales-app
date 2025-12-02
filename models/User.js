import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['Super Admin', 'Admin', 'Customer', 'Sales Person'],
    default: 'Customer',
    required: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    // Optional field - validation handled in resolvers
    // Super Admin: no companyId
    // Admin: optional (can be created without, linked when company is created)
    // Customer and Sales Person: required (validated in resolver)
    required: false,
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  // Sales Person specific fields
  salesPersonId: {
    type: String,
    // Removed global unique constraint - will use compound index with companyId
    sparse: true, // Allow multiple null values for non-sales-person users
    trim: true,
    uppercase: true,
  },
  dateOfBirth: {
    type: Date,
    // Required for Sales Person, optional for others (validated in resolver)
  },
  photo: {
    type: String, // URL or base64 string
  },
  about: {
    type: String,
    trim: true,
  },
  // Track which Admin created this user (for Sales Person)
  createdByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  // Password change request system (for Sales Person)
  passwordChangeRequest: {
    status: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    requestedAt: {
      type: Date,
    },
    respondedAt: {
      type: Date,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Admin who approved/rejected
    },
    canChangePassword: {
      type: Boolean,
      default: false,
    },
    passwordChangedAt: {
      type: Date,
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

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  // Auto-generate sales person ID for Sales Person role (company-specific)
  if (this.role === 'Sales Person' && this.isNew && !this.salesPersonId) {
    // Get the last sales person from the same company
    const query = { 
      role: 'Sales Person', 
      salesPersonId: { $exists: true, $ne: null }
    };
    
    // If companyId exists, filter by company
    if (this.companyId) {
      query.companyId = this.companyId;
    }
    
    const lastSalesPerson = await this.constructor.findOne(
      query,
      {},
      { sort: { 'createdAt': -1 } }
    );
    
    let nextId = 1;
    if (lastSalesPerson && lastSalesPerson.salesPersonId) {
      const lastIdNum = parseInt(lastSalesPerson.salesPersonId.split('-')[1]);
      if (!isNaN(lastIdNum)) {
        nextId = lastIdNum + 1;
      }
    }
    this.salesPersonId = `SP-${String(nextId).padStart(4, '0')}`;
  }
  
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update the updatedAt field before updating
UserSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Compound index to ensure salesPersonId is unique within each company
// This allows different companies to have SP-0001, SP-0002, etc.
UserSchema.index(
  { companyId: 1, salesPersonId: 1 }, 
  { 
    unique: true,
    partialFilterExpression: { 
      salesPersonId: { $exists: true },
      companyId: { $exists: true }
    }
  }
);

// Delete the model if it exists to avoid caching issues with schema changes
if (mongoose.models.User) {
  delete mongoose.models.User;
}

export default mongoose.model('User', UserSchema);


