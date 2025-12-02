import mongoose from 'mongoose';

/**
 * UserCompanyRole Model
 * Manages many-to-many relationship between Users and Companies
 * Allows a user to have different roles in different companies
 */
const UserCompanyRoleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ['Admin', 'Customer', 'Sales Person'],
    required: true,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended'],
    default: 'Active',
  },
  // Additional permissions per company (optional)
  permissions: {
    type: [String],
    default: [],
  },
  // Who added this user to this company
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Sales Person specific field (for this company)
  salesPersonId: {
    type: String,
    sparse: true,
    trim: true,
    uppercase: true,
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

// Compound unique index: User can have only ONE role per company
UserCompanyRoleSchema.index(
  { userId: 1, companyId: 1 }, 
  { unique: true }
);

// Compound index for queries
UserCompanyRoleSchema.index({ userId: 1, status: 1 });
UserCompanyRoleSchema.index({ companyId: 1, role: 1, status: 1 });

// Update timestamp on save
UserCompanyRoleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Delete the model if it exists to avoid caching issues
if (mongoose.models.UserCompanyRole) {
  delete mongoose.models.UserCompanyRole;
}

export default mongoose.model('UserCompanyRole', UserCompanyRoleSchema);


