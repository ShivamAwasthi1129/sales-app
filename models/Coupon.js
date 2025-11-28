import mongoose from 'mongoose';

const CouponSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true,
    trim: true,
    index: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String,
    trim: true
  },
  discountType: { 
    type: String, 
    enum: ['percentage', 'fixed'], 
    required: true,
    default: 'percentage'
  },
  discountValue: { 
    type: Number, 
    required: true, 
    min: 0
  },
  minPurchase: { 
    type: Number, 
    default: 0,
    min: 0
  },
  maxDiscount: { 
    type: Number,
    min: 0
  },
  validFrom: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  validTo: { 
    type: Date, 
    required: true
  },
  usageLimit: { 
    type: Number,
    default: null // null means unlimited
  },
  usedCount: { 
    type: Number, 
    default: 0,
    min: 0
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'expired'], 
    default: 'active'
  },
  applicableTo: {
    type: String,
    enum: ['all', 'products', 'groups'],
    default: 'all'
  },
  applicableProductIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  applicableGroupIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
}, { timestamps: true });

// Index for faster lookups
CouponSchema.index({ code: 1, status: 1 });
CouponSchema.index({ validFrom: 1, validTo: 1 });

// Virtual to check if coupon is valid
CouponSchema.virtual('isValid').get(function() {
  const now = new Date();
  return (
    this.status === 'active' &&
    now >= this.validFrom &&
    now <= this.validTo &&
    (this.usageLimit === null || this.usedCount < this.usageLimit)
  );
});

// Method to validate and apply coupon
CouponSchema.methods.validateCoupon = function(subtotal, productIds = [], groupIds = []) {
  const now = new Date();
  
  // Check status
  if (this.status !== 'active') {
    return { valid: false, error: 'Coupon is not active' };
  }
  
  // Check date validity
  if (now < this.validFrom || now > this.validTo) {
    return { valid: false, error: 'Coupon is expired or not yet valid' };
  }
  
  // Check usage limit
  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) {
    return { valid: false, error: 'Coupon usage limit reached' };
  }
  
  // Check minimum purchase
  if (subtotal < this.minPurchase) {
    return { valid: false, error: `Minimum purchase of ${this.currency || 'USD'} ${this.minPurchase} required` };
  }
  
  // Check applicability
  if (this.applicableTo === 'products' && this.applicableProductIds.length > 0) {
    const hasApplicableProduct = productIds.some(id => 
      this.applicableProductIds.some(pid => pid.toString() === id.toString())
    );
    if (!hasApplicableProduct) {
      return { valid: false, error: 'Coupon is not applicable to selected products' };
    }
  }
  
  if (this.applicableTo === 'groups' && this.applicableGroupIds.length > 0) {
    const hasApplicableGroup = groupIds.some(id => 
      this.applicableGroupIds.some(gid => gid.toString() === id.toString())
    );
    if (!hasApplicableGroup) {
      return { valid: false, error: 'Coupon is not applicable to selected product groups' };
    }
  }
  
  return { valid: true };
};

// Method to calculate discount
CouponSchema.methods.calculateDiscount = function(subtotal) {
  let discount = 0;
  
  if (this.discountType === 'percentage') {
    discount = (subtotal * this.discountValue) / 100;
    // Apply max discount if set
    if (this.maxDiscount && discount > this.maxDiscount) {
      discount = this.maxDiscount;
    }
  } else if (this.discountType === 'fixed') {
    discount = this.discountValue;
    // Don't allow discount more than subtotal
    if (discount > subtotal) {
      discount = subtotal;
    }
  }
  
  return Math.round(discount * 100) / 100; // Round to 2 decimal places
};

export default mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);

