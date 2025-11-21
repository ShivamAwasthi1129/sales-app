import mongoose from 'mongoose';

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
  salesPersonId: {
    type: String,
    required: [true, 'Please provide a sales person ID'],
    unique: true,
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
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
}, { timestamps: true });

// Auto-generate sales person ID if not provided
SalesPersonSchema.pre('save', async function(next) {
  if (!this.salesPersonId) {
    const count = await mongoose.models.SalesPerson.countDocuments();
    this.salesPersonId = `SP-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

export default mongoose.models.SalesPerson || mongoose.model('SalesPerson', SalesPersonSchema);

