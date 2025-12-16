import mongoose from 'mongoose';

// Line item schema for quotation items
const QuotationLineItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  itemName: { type: String, required: true },
  description: { type: String },
  imageUrl: { type: String },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  rate: { type: Number, required: true, min: 0 }, // Price per unit
  amount: { type: Number, required: true }, // quantity * rate
  total: { type: Number, required: true }, // amount (no tax)
  // Store subscription details if product has subscription
  isSubscription: { type: Boolean, default: false },
  subscriptionDetails: {
    billingType: { type: String },
    interval: { type: String },
    intervalCount: { type: Number },
  },
  subscriptionPrice: { type: Number }, // Individual subscription price
  // Store selected attributes/options
  selectedOptions: [{
    attributeName: { type: String },
    optionLabel: { type: String },
    optionValue: { type: String },
    price: { type: Number },
    isSubscription: { type: Boolean },
    billingInterval: { type: String },
  }],
}, { _id: true });

// Main quotation schema
const QuotationSchema = new mongoose.Schema({
  quotationNo: { type: String, unique: true, sparse: true }, // Not required - will be auto-generated
  quotationDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date },
  
  // Quotation From (Business/Sender Details)
  from: {
    country: { type: String, default: 'United States of America (USA)' },
    businessName: { type: String },
    phone: { type: String },
    address: { type: String },
    email: { type: String },
    salesPersonName: { type: String },
    salesPersonId: { type: String },
  },
  
  // Quotation For (Client Details)
  to: {
    country: { type: String, default: 'United States of America (USA)' },
    businessName: { type: String },
    phone: { type: String },
    address: { type: String },
    email: { type: String },
  },
  
  // Currency and financial details
  currency: { type: String, default: 'USD', required: true },
  
  // Line items
  lineItems: [QuotationLineItemSchema],
  
  // Totals
  subtotal: { type: Number, required: true, default: 0 },
  totalTax: { type: Number, default: 0 }, // Kept for backward compatibility
  couponCode: { type: String },
  couponDiscount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true, default: 0 },
  
  // Additional fields
  notes: { type: String },
  terms: { type: String },
  businessLogo: { type: String }, // URL to logo
  
  // Status tracking
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'paid'], 
    default: 'draft' 
  },
  
  // Tracking when quotation was viewed by customer
  viewedAt: { type: Date },
  viewedBy: { type: String }, // Customer email who viewed
  
  // Payment information
  payment: {
    sessionId: { type: String },
    paymentStatus: { type: String },
    paymentLink: { type: String },
    paymentMethod: { type: String },
    amount: { type: Number },
    currency: { type: String },
    customerEmail: { type: String },
    paymentMode: { type: String }, // 'payment' or 'subscription'
    subscriptionId: { type: String },
    paidAt: { type: Date },
  },
  
  // Invoice reference (generated after payment)
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  invoiceNo: { type: String },
  
  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // If client is a registered user
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }, // Company this quotation belongs to
}, { timestamps: true });

// Auto-generate quotation number before saving (fallback if not set in resolver)
QuotationSchema.pre('save', async function(next) {
  if (!this.quotationNo) {
    try {
      // Use quotationDate from document, or current date
      const date = this.quotationDate || new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      
      // Find the last quotation of the day
      const lastQuotation = await mongoose.models.Quotation
        .findOne({ quotationNo: new RegExp(`^QT-${dateStr}`) })
        .sort({ quotationNo: -1 })
        .lean();
      
      let sequence = 1;
      if (lastQuotation && lastQuotation.quotationNo) {
        const parts = lastQuotation.quotationNo.split('-');
        if (parts.length === 3) {
          const lastSequence = parseInt(parts[2]);
          if (!isNaN(lastSequence)) {
            sequence = lastSequence + 1;
          }
        }
      }
      
      this.quotationNo = `QT-${dateStr}-${sequence.toString().padStart(4, '0')}`;
    } catch (error) {
      // If error generating, use timestamp as fallback
      const timestamp = Date.now().toString().slice(-8);
      this.quotationNo = `QT-${dateStr}-${timestamp}`;
    }
  }
  next();
});

// Clear cached model before compiling to ensure schema updates are applied
delete mongoose.connection.models.Quotation;

export default mongoose.models.Quotation || mongoose.model('Quotation', QuotationSchema);

