import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  order: { type: Number, default: 0 }, // For UI sorting
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.Group || mongoose.model('Group', GroupSchema);





