import { NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb.js';
import Coupon from '../../../models/Coupon.js';
import { verifyToken } from '../../../graphql/resolvers/userResolvers.js';
import User from '../../../models/User.js';
import Group from '../../../models/Group.js';

// Template coupons with all 3 types
const getCouponsTemplate = (companyId, groupIds = []) => [
  // Discount Coupons (5)
  { code: 'SAVE20', type: 'discount_coupon', name: '20% Off Summer Sale', description: 'Get 20% off on all products. Perfect for summer shopping!', discountType: 'percentage', discountValue: 20, minPurchase: 50, maxDiscount: 100, validFrom: new Date(), validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), usageLimit: 100, usedCount: 0, status: 'active', applicableTo: 'all', applicableProductIds: [], applicableGroupIds: [], companyId },
  { code: 'MEGA30', type: 'discount_coupon', name: 'Mega Sale 30%', description: 'Huge 30% discount on all products. Don\'t miss out!', discountType: 'percentage', discountValue: 30, minPurchase: 100, maxDiscount: 200, validFrom: new Date(), validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), usageLimit: 200, usedCount: 0, status: 'active', applicableTo: 'all', applicableProductIds: [], applicableGroupIds: [], companyId },
  { code: 'QUICK15', type: 'discount_coupon', name: 'Quick 15% Off', description: 'Fast 15% discount for quick purchases. No minimum required!', discountType: 'percentage', discountValue: 15, minPurchase: 0, maxDiscount: null, validFrom: new Date(), validTo: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), usageLimit: null, usedCount: 0, status: 'active', applicableTo: 'all', applicableProductIds: [], applicableGroupIds: [], companyId },
  { code: 'HOLIDAY25', type: 'discount_coupon', name: 'Holiday Special 25%', description: 'Celebrate holidays with 25% off on all your purchases!', discountType: 'percentage', discountValue: 25, minPurchase: 75, maxDiscount: 150, validFrom: new Date(), validTo: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), usageLimit: 150, usedCount: 0, status: 'active', applicableTo: 'all', applicableProductIds: [], applicableGroupIds: [], companyId },
  { code: 'WEEKEND20', type: 'discount_coupon', name: 'Weekend Special', description: '20% off every weekend. Shop more, save more!', discountType: 'percentage', discountValue: 20, minPurchase: 30, maxDiscount: null, validFrom: new Date(), validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), usageLimit: null, usedCount: 0, status: 'active', applicableTo: 'all', applicableProductIds: [], applicableGroupIds: [], companyId },
  
  // Promo Codes (3)
  { code: 'WELCOME10', type: 'promo_code', name: 'Welcome Discount', description: '10% off for new customers. Welcome to our store!', discountType: 'percentage', discountValue: 10, minPurchase: 25, maxDiscount: null, validFrom: new Date(), validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), usageLimit: null, usedCount: 0, status: 'active', applicableTo: 'all', applicableProductIds: [], applicableGroupIds: [], companyId },
  { code: 'FLAT50', type: 'promo_code', name: 'Flat $50 Off', description: 'Get $50 off on orders above $200. Limited time offer!', discountType: 'fixed', discountValue: 50, minPurchase: 200, maxDiscount: null, validFrom: new Date(), validTo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), usageLimit: 50, usedCount: 0, status: 'active', applicableTo: 'all', applicableProductIds: [], applicableGroupIds: [], companyId },
  { code: 'FIRST5', type: 'promo_code', name: 'First Order $5 Off', description: 'Get $5 off on your first order. Perfect for trying us out!', discountType: 'fixed', discountValue: 5, minPurchase: 10, maxDiscount: null, validFrom: new Date(), validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), usageLimit: null, usedCount: 0, status: 'active', applicableTo: 'all', applicableProductIds: [], applicableGroupIds: [], companyId },
  
  // Group Discounts (2) - only if groups exist
  ...(groupIds.length > 0 ? [
    { code: 'GROUP10', type: 'group_discount', name: 'Group Special 10%', description: 'Special 10% discount for specific product groups!', discountType: 'percentage', discountValue: 10, minPurchase: 50, maxDiscount: null, validFrom: new Date(), validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), usageLimit: null, usedCount: 0, status: 'active', applicableTo: 'groups', applicableProductIds: [], applicableGroupIds: [groupIds[0]], companyId },
    { code: 'GROUP20', type: 'group_discount', name: 'Group Mega 20%', description: 'Mega 20% discount on selected product groups!', discountType: 'percentage', discountValue: 20, minPurchase: 100, maxDiscount: 200, validFrom: new Date(), validTo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), usageLimit: 100, usedCount: 0, status: 'active', applicableTo: 'groups', applicableProductIds: [], applicableGroupIds: groupIds.slice(0, 2), companyId },
  ] : []),
];

export async function POST(request) {
  try {
    await connectDB();
    
    // Get user from token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user's company
    const user = await User.findById(decoded.userId).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const companyId = user.companyId;
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID not found. Please contact admin.' },
        { status: 400 }
      );
    }

    // Get available groups for this company
    const groups = await Group.find({ companyId }).lean();
    const groupIds = groups.map(g => g._id);

    // Generate coupons with company ID and group IDs
    const coupons = getCouponsTemplate(companyId, groupIds);
    
    let created = 0;
    let skipped = 0;
    const results = [];
    
    for (const couponData of coupons) {
      try {
        // Check if coupon already exists for this company
        const existing = await Coupon.findOne({ 
          code: couponData.code,
          companyId: companyId
        });
        
        if (existing) {
          skipped++;
          results.push({ 
            code: couponData.code, 
            type: couponData.type,
            status: 'exists' 
          });
          continue;
        }
        
        await Coupon.create(couponData);
        created++;
        results.push({ 
          code: couponData.code, 
          type: couponData.type,
          status: 'created' 
        });
      } catch (error) {
        if (error.code === 11000) {
          skipped++;
          results.push({ 
            code: couponData.code, 
            type: couponData.type,
            status: 'exists' 
          });
        } else {
          results.push({ 
            code: couponData.code, 
            type: couponData.type,
            status: 'error', 
            error: error.message 
          });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Seeded ${created} new coupons (${skipped} already existed)`,
      created,
      skipped,
      results,
      breakdown: {
        discount_coupons: results.filter(r => r.type === 'discount_coupon').length,
        promo_codes: results.filter(r => r.type === 'promo_code').length,
        group_discounts: results.filter(r => r.type === 'group_discount').length,
      }
    });
  } catch (error) {
    console.error('Error seeding coupons:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

