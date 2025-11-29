import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  order: { type: Number, default: 0 }, // For UI sorting
  // Company association - required for multi-tenancy
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Make slug unique per company (compound index)
GroupSchema.index({ slug: 1, companyId: 1 }, { unique: true });

export default mongoose.models.Group || mongoose.model('Group', GroupSchema);






