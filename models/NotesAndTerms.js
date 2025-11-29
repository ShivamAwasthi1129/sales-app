import mongoose from 'mongoose';

const NotesAndTermsSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required'],
    unique: true, // Each company has only one NotesAndTerms record
    index: true,
  },
  notesToClient: {
    type: String,
    trim: true,
    default: 'Thank you for your interest in our products/services.\n\nPlease review the quotation carefully and contact us if you have any questions.\n\nWe look forward to working with you.',
  },
  termsAndConditions: {
    type: String,
    trim: true,
    default: '• Payment terms: Net 30 days from invoice date\n• All prices are subject to change without prior notice\n• Delivery time: As per agreed schedule\n• Warranty: Standard warranty applies as per product specifications',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
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
NotesAndTermsSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

NotesAndTermsSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

export default mongoose.models.NotesAndTerms || mongoose.model('NotesAndTerms', NotesAndTermsSchema);

