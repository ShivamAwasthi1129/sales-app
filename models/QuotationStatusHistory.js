import mongoose from 'mongoose';

const QuotationStatusHistorySchema = new mongoose.Schema({
  quotationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quotation',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'paid'],
    required: true,
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  changedByEmail: {
    type: String,
    required: false,
  },
  changedByName: {
    type: String,
    required: false,
  },
  reason: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  // Store snapshot of quotation at this status change
  quotationSnapshot: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
QuotationStatusHistorySchema.index({ quotationId: 1, createdAt: -1 });
QuotationStatusHistorySchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.QuotationStatusHistory || mongoose.model('QuotationStatusHistory', QuotationStatusHistorySchema);

