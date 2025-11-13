import mongoose from 'mongoose';

const AttributeSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Hosting Plan", "Support Level"
  description: { type: String },
  uiType: {
    type: String,
    enum: ['dropdown', 'checkbox', 'radio', 'slider', 'number_input'],
    required: true,
  },
  isMandatory: { type: Boolean, default: false },
  
  // An attribute links to its possible answers (options).
  options: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AttributeOption' }],
  order: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
}, { timestamps: true });

export default mongoose.models.Attribute || mongoose.model('Attribute', AttributeSchema);

