import mongoose from 'mongoose';

// Change detail schema
const ChangeDetailSchema = new mongoose.Schema({
  field: { type: String, required: true }, // Field name that changed
  oldValue: { type: mongoose.Schema.Types.Mixed }, // Old value
  newValue: { type: mongoose.Schema.Types.Mixed }, // New value
  changeType: { 
    type: String, 
    enum: ['added', 'updated', 'deleted'], 
    required: true 
  },
}, { _id: false });

// Main change tracking schema
const QuotationChangeSchema = new mongoose.Schema({
  quotationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Quotation', 
    required: true 
  },
  version: { type: Number, required: true }, // Version number of this change
  changedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false 
  },
  changeType: { 
    type: String, 
    enum: ['created', 'updated', 'status_changed'], 
    required: true 
  },
  changes: [ChangeDetailSchema], // Array of field changes
  summary: { type: String }, // Human-readable summary
  // Line item changes
  lineItemChanges: [{
    itemId: { type: String },
    changeType: { type: String, enum: ['added', 'updated', 'deleted'] },
    oldItem: { type: mongoose.Schema.Types.Mixed },
    newItem: { type: mongoose.Schema.Types.Mixed },
  }],
}, { timestamps: true });

// Index for efficient queries
QuotationChangeSchema.index({ quotationId: 1, version: -1 });

export default mongoose.models.QuotationChange || mongoose.model('QuotationChange', QuotationChangeSchema);

