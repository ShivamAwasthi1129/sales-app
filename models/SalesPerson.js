import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SalesPersonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Please provide date of birth'],
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
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
    select: false, // Don't include password in queries by default
  },
  salesPersonId: {
    type: String,
    unique: true,
    sparse: true, // Allow multiple null values
    trim: true,
    uppercase: true,
  },
  role: {
    type: String,
    required: [true, 'Please provide a role'],
    trim: true,
  },
  about: {
    type: String,
    trim: true,
  },
  companyName: {
    type: String,
    required: [true, 'Please provide company name'],
    trim: true,
  },
  address: {
    type: String,
    required: [true, 'Please provide an address'],
    trim: true,
  },
  photo: {
    type: String, // URL or base64 string
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Track which Admin created this sales person
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: false, // Will be populated from createdBy user's companyId
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
}, { timestamps: true });

// Hash password before saving
SalesPersonSchema.pre('save', async function (next) {
  // Hash password if it's modified or if it's a new document with a password
  // Also check if password is not already hashed (bcrypt hashes are 60 chars)
  if (this.isModified('password') || (this.isNew && this.password)) {
    // Only hash if password is not already a bcrypt hash (less than 50 chars means it's plain text)
    if (this.password && this.password.length < 50) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }
  
  // Auto-generate sales person ID if not provided
  if (this.isNew && !this.salesPersonId) {
    const lastSalesPerson = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
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
SalesPersonSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.SalesPerson || mongoose.model('SalesPerson', SalesPersonSchema);

