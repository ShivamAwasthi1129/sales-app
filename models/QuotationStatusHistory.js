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
    enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'paid', 'updated'],
    required: true,
  },
  updateType: {
    type: String,
    enum: ['status_change', 'content_update', 'payment_update', 'created'],
    default: 'status_change',
  },
  changedByRole: {
    type: String,
    trim: true,
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

// Clear cached model before compiling to ensure schema updates are applied
delete mongoose.connection.models.QuotationStatusHistory;

export default mongoose.models.QuotationStatusHistory || mongoose.model('QuotationStatusHistory', QuotationStatusHistorySchema);

