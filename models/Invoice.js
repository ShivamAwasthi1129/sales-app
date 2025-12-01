import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema({
  invoiceNo: {
    type: String,
    required: true,
    unique: true,
  },
  quotationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quotation',
    required: true,
  },
  quotationNo: {
    type: String,
    required: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  invoiceDate: {
    type: Date,
    default: Date.now,
  },
  dueDate: {
    type: Date,
  },
  // Customer/Client Information
  billTo: {
    businessName: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    address: String,
    country: String,
  },
  // Company Information
  billFrom: {
    businessName: { type: String, required: true },
    email: String,
    phone: String,
    address: String,
    country: String,
  },
  // Line Items
  lineItems: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    itemName: { type: String, required: true },
    description: String,
    imageUrl: String,
    quantity: { type: Number, required: true, default: 1 },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true },
    total: { type: Number, required: true },
    isSubscription: { type: Boolean, default: false },
    subscriptionDetails: {
      billingType: String,
      interval: String,
      intervalCount: Number,
    },
    selectedOptions: [{
      attributeName: String,
      optionLabel: String,
      optionValue: String,
      price: Number,
      isSubscription: Boolean,
    }],
  }],
  // Financial Details
  currency: {
    type: String,
    default: 'USD',
  },
  subtotal: {
    type: Number,
    required: true,
    default: 0,
  },
  taxRate: {
    type: Number,
    default: 0,
  },
  totalTax: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  // Payment Information
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'partially_paid', 'overdue'],
    default: 'unpaid',
  },
  paymentMethod: String,
  paymentDate: Date,
  paymentTransactionId: String,
  // Additional Details
  notes: String,
  terms: String,
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'cancelled', 'overdue'],
    default: 'sent',
  },
  pdfUrl: String,
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Auto-generate invoice number
InvoiceSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNo) {
    const count = await mongoose.model('Invoice').countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    this.invoiceNo = `INV-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Index for faster queries
InvoiceSchema.index({ quotationId: 1 });
InvoiceSchema.index({ customerId: 1 });
InvoiceSchema.index({ companyId: 1 });
InvoiceSchema.index({ invoiceNo: 1 });

export default mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);

