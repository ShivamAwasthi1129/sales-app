import { NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb.js';
import Coupon from '../../../models/Coupon.js';

const coupons = [
  { code: 'SAVE20', name: '20% Off Summer Sale', description: 'Get 20% off on all products. Perfect for summer shopping!', discountType: 'percentage', discountValue: 20, minPurchase: 50, maxDiscount: 100, validFrom: new Date(), validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), usageLimit: 100, usedCount: 0, status: 'active', applicableTo: 'all', applicableProductIds: [], applicableGroupIds: [] },
  { code: 'WELCOME10', name: 'Welcome Discount', description: '10% off for new customers. Welcome to our store!', discountType: 'percentage', discountValue: 10, minPurchase: 25, maxDiscount: null, validFrom: new Date(), validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), usageLimit: null, usedCount: 0, status: 'active', applicableTo: 'all', applicableProductIds: [], applicableGroupIds: [] },
  { code: 'FLAT50', name: 'Flat $50 Off', description: 'Get $50 off on orders above $200. Limited time offer!', discountType: 'fixed', discountValue: 50, minPurchase: 200, maxDiscount: null, validFrom: new Date(), validTo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), usageLimit: 50, usedCount: 0, status: 'active', applicableTo: 'all', applicableProductIds: [], applicableGroupIds: [] },
  { code: 'MEGA30', name: 'Mega Sale 30%', description: 'Huge 30% discount on all products. Don\'t miss out!', discountType: 'percentage', discountValue: 30, minPurchase: 100, maxDiscount: 200, validFrom: new Date(), validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), usageLimit: 200, usedCount: 0, status: 'active', applicableTo: 'all', applicableProductIds: [], applicableGroupIds: [] },
  { code: 'QUICK15', name: 'Quick 15% Off', description: 'Fast 15% discount for quick purchases. No minimum required!', discountType: 'percentage', discountValue: 15, minPurchase: 0, maxDiscount: null, validFrom: new Date(), validTo: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), usageLimit: null, usedCount: 0, status: 'active', applicableTo: 'all', applicableProductIds: [], applicableGroupIds: [] },
  { code: 'VIP100', name: 'VIP $100 Off', description: 'Exclusive VIP discount of $100. For premium customers only!', discountType: 'fixed', discountValue: 100, minPurchase: 500, maxDiscount: null, validFrom: new Date(), validTo: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), usageLimit: 25, usedCount: 0, status: 'active', applicableTo: 'all', applicableProductIds: [], applicableGroupIds: [] },
  { code: 'HOLIDAY25', name: 'Holiday Special 25%', description: 'Celebrate holidays with 25% off on all your purchases!', discountType: 'percentage', discountValue: 25, minPurchase: 75, maxDiscount: 150, validFrom: new Date(), validTo: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), usageLimit: 150, usedCount: 0, status: 'active', applicableTo: 'all', applicableProductIds: [], applicableGroupIds: [] },
  { code: 'FIRST5', name: 'First Order $5 Off', description: 'Get $5 off on your first order. Perfect for trying us out!', discountType: 'fixed', discountValue: 5, minPurchase: 10, maxDiscount: null, validFrom: new Date(), validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), usageLimit: null, usedCount: 0, status: 'active', applicableTo: 'all', applicableProductIds: [], applicableGroupIds: [] },
  { code: 'BULK40', name: 'Bulk Purchase 40%', description: 'Special 40% discount for bulk purchases. Great for businesses!', discountType: 'percentage', discountValue: 40, minPurchase: 500, maxDiscount: 500, validFrom: new Date(), validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), usageLimit: 30, usedCount: 0, status: 'active', applicableTo: 'all', applicableProductIds: [], applicableGroupIds: [] },
  { code: 'WEEKEND20', name: 'Weekend Special', description: '20% off every weekend. Shop more, save more!', discountType: 'percentage', discountValue: 20, minPurchase: 30, maxDiscount: null, validFrom: new Date(), validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), usageLimit: null, usedCount: 0, status: 'active', applicableTo: 'all', applicableProductIds: [], applicableGroupIds: [] },
];

export async function POST(request) {
  try {
    await connectDB();
    
    let created = 0;
    let skipped = 0;
    const results = [];
    
    for (const couponData of coupons) {
      try {
        const existing = await Coupon.findOne({ code: couponData.code });
        if (existing) {
          skipped++;
          results.push({ code: couponData.code, status: 'exists' });
          continue;
        }
        
        await Coupon.create(couponData);
        created++;
        results.push({ code: couponData.code, status: 'created' });
      } catch (error) {
        if (error.code === 11000) {
          skipped++;
          results.push({ code: couponData.code, status: 'exists' });
        } else {
          results.push({ code: couponData.code, status: 'error', error: error.message });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Seeded ${created} new coupons, ${skipped} already existed`,
      created,
      skipped,
      results,
    });
  } catch (error) {
    console.error('Error seeding coupons:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

