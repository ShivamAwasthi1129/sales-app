import connectDB from '../../lib/mongodb.js';
import Coupon from '../../models/Coupon.js';
import { getCurrentUserFromToken } from '../../lib/auth.js';

export const couponResolvers = {
  Query: {
    getCoupons: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only allow certain roles to view coupons
      const allowedRoles = ['Super Admin', 'Admin', 'Sales Person'];
      const isSalesPerson = context.user.type === 'salesPerson' || context.user.role === 'Sales Person';
      
      if (!allowedRoles.includes(context.user.role) && !isSalesPerson) {
        throw new Error('Not authorized to view coupons');
      }

      // Company-based filtering
      let filter = {};
      
      if (context.user.role === 'Admin' || context.user.role === 'Sales Person' || isSalesPerson) {
        // Admin and Sales Person can only see their company's coupons
        if (!context.user.companyId) {
          throw new Error('Company information missing. Please contact administrator.');
        }
        filter.companyId = context.user.companyId;
      }
      // Super Admin sees all coupons (no filter)

      const coupons = await Coupon.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      return coupons.map(coupon => ({
        ...coupon,
        id: coupon._id.toString(),
        companyId: coupon.companyId?.toString() || null,
        validFrom: coupon.validFrom?.toISOString() || new Date().toISOString(),
        validTo: coupon.validTo?.toISOString(),
        createdAt: coupon.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: coupon.updatedAt?.toISOString() || new Date().toISOString(),
        applicableProductIds: (coupon.applicableProductIds || []).map(id => id.toString()),
        applicableGroupIds: (coupon.applicableGroupIds || []).map(id => id.toString()),
      }));
    },

    getCoupon: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const allowedRoles = ['Super Admin', 'Admin', 'Sales Person'];
      const isSalesPerson = context.user.type === 'salesPerson' || context.user.role === 'Sales Person';
      
      if (!allowedRoles.includes(context.user.role) && !isSalesPerson) {
        throw new Error('Not authorized to view coupons');
      }

      const coupon = await Coupon.findById(id).lean();
      
      if (!coupon) {
        throw new Error('Coupon not found');
      }

      // Company-based authorization check
      if (context.user.role === 'Admin' || context.user.role === 'Sales Person' || isSalesPerson) {
        if (coupon.companyId.toString() !== context.user.companyId) {
          throw new Error('Not authorized to view this coupon');
        }
      }

      return {
        ...coupon,
        id: coupon._id.toString(),
        companyId: coupon.companyId?.toString() || null,
        validFrom: coupon.validFrom?.toISOString() || new Date().toISOString(),
        validTo: coupon.validTo?.toISOString(),
        createdAt: coupon.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: coupon.updatedAt?.toISOString() || new Date().toISOString(),
        applicableProductIds: (coupon.applicableProductIds || []).map(id => id.toString()),
        applicableGroupIds: (coupon.applicableGroupIds || []).map(id => id.toString()),
      };
    },

    getCouponByCode: async (_, { code }, context) => {
      await connectDB();
      
      // This can be accessed without authentication for validation purposes
      const coupon = await Coupon.findOne({ code: code.toUpperCase() }).lean();
      
      if (!coupon) {
        return null;
      }

      return {
        ...coupon,
        id: coupon._id.toString(),
        validFrom: coupon.validFrom?.toISOString() || new Date().toISOString(),
        validTo: coupon.validTo?.toISOString(),
        createdAt: coupon.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: coupon.updatedAt?.toISOString() || new Date().toISOString(),
        applicableProductIds: (coupon.applicableProductIds || []).map(id => id.toString()),
        applicableGroupIds: (coupon.applicableGroupIds || []).map(id => id.toString()),
      };
    },

    validateCoupon: async (_, { code, subtotal, productIds = [], groupIds = [] }, context) => {
      await connectDB();
      
      console.log('[ValidateCoupon] Starting validation...');
      console.log('[ValidateCoupon] Code:', code);
      console.log('[ValidateCoupon] Subtotal:', subtotal);
      console.log('[ValidateCoupon] User context:', context.user);
      
      // Build query filter
      const filter = { code: code.toUpperCase() };
      
      // If user is authenticated and has company ID, filter by company
      // This ensures coupon belongs to the user's company
      if (context?.user?.companyId) {
        filter.companyId = context.user.companyId;
        console.log('[ValidateCoupon] Filtering by companyId:', filter.companyId);
      } else {
        console.log('[ValidateCoupon] No company ID in context - checking all companies');
      }
      
      console.log('[ValidateCoupon] Filter:', filter);
      const coupon = await Coupon.findOne(filter);
      console.log('[ValidateCoupon] Coupon found:', coupon ? `Yes (${coupon.code})` : 'No');
      
      if (!coupon) {
        console.log('[ValidateCoupon] Coupon not found - returning error');
        return {
          valid: false,
          error: 'Coupon not found or not available for your company',
          discount: 0,
          discountType: null,
          discountValue: 0,
          coupon: null,
        };
      }

      // Get product and group IDs from line items if not provided
      console.log('[ValidateCoupon] Running validation logic...');
      const validation = coupon.validateCoupon(subtotal, productIds, groupIds);
      console.log('[ValidateCoupon] Validation result:', validation);
      
      if (!validation.valid) {
        console.log('[ValidateCoupon] Validation failed:', validation.error);
        return {
          valid: false,
          error: validation.error,
          discount: 0,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          coupon: {
            ...coupon.toObject(),
            id: coupon._id.toString(),
            validFrom: coupon.validFrom?.toISOString(),
            validTo: coupon.validTo?.toISOString(),
          },
        };
      }

      const discount = coupon.calculateDiscount(subtotal);
      console.log('[ValidateCoupon] Calculated discount:', discount);

      console.log('[ValidateCoupon] Returning success response');
      return {
        valid: true,
        error: null,
        discount,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        coupon: {
          ...coupon.toObject(),
          id: coupon._id.toString(),
          validFrom: coupon.validFrom?.toISOString(),
          validTo: coupon.validTo?.toISOString(),
        },
      };
    },
  },

  Mutation: {
    createCoupon: async (_, { input }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const allowedRoles = ['Super Admin', 'Admin'];
      if (!allowedRoles.includes(context.user.role)) {
        throw new Error('Not authorized to create coupons');
      }

      console.log('[createCoupon] ====== START ======');
      console.log('[createCoupon] Context user:', {
        userId: context.user.userId || context.user.id,
        role: context.user.role,
        companyId: context.user.companyId,
        inputCompanyId: input.companyId
      });

      // Determine companyId with strict validation
      let companyId = null;
      
      // For Admin, MUST get companyId from database to ensure it exists
      if (context.user.role === 'Admin') {
        console.log('[createCoupon] Admin detected, fetching user from DB...');
        const User = (await import('../../models/User.js')).default;
        const dbUser = await User.findById(context.user.userId).lean();
        
        if (!dbUser) {
          console.error('[createCoupon] Admin user not found in database');
          throw new Error('User account not found. Please re-login.');
        }
        
        if (!dbUser.companyId) {
          console.error('[createCoupon] Admin has no companyId in database:', dbUser);
          throw new Error('Your account is not associated with any company. Please contact Super Admin to assign your account to a company before creating coupons.');
        }
        
        companyId = dbUser.companyId.toString();
        console.log('[createCoupon] Admin companyId from DB:', companyId);
      }
      
      // For Super Admin, companyId must be provided in input
      if (context.user.role === 'Super Admin') {
        if (!input.companyId) {
          throw new Error('Company ID is required when creating coupons as Super Admin');
        }
        companyId = input.companyId;
        console.log('[createCoupon] SuperAdmin using input companyId:', companyId);
      }

      // Final validation - MUST have companyId
      if (!companyId) {
        console.error('[createCoupon] CRITICAL: No companyId after all checks!');
        console.error('[createCoupon] Context:', context.user);
        console.error('[createCoupon] Input:', input);
        throw new Error('Company ID could not be determined. This is a system error. Please contact technical support.');
      }

      console.log('[createCoupon] Final companyId to use:', companyId);

      // Check if coupon code already exists for this company
      const existingCoupon = await Coupon.findOne({ 
        code: input.code.toUpperCase(),
        companyId: companyId
      });
      if (existingCoupon) {
        throw new Error('Coupon code already exists for this company');
      }

      const couponData = {
        ...input,
        code: input.code.toUpperCase(),
        validFrom: new Date(input.validFrom),
        validTo: new Date(input.validTo),
        companyId: companyId, // This is validated to exist above
        createdBy: context.user.userId || context.user.id,
        applicableProductIds: input.applicableProductIds || [],
        applicableGroupIds: input.applicableGroupIds || [],
      };

      console.log('[createCoupon] Creating coupon with data:', {
        code: couponData.code,
        companyId: couponData.companyId,
        createdBy: couponData.createdBy
      });

      const coupon = new Coupon(couponData);
      await coupon.save();

      console.log('[createCoupon] Coupon saved, fetching back...');
      const savedCoupon = await Coupon.findById(coupon._id).lean();
      
      if (!savedCoupon) {
        throw new Error('Failed to retrieve saved coupon');
      }

      console.log('[createCoupon] Saved coupon companyId:', savedCoupon.companyId);

      // Ensure companyId is not null
      if (!savedCoupon.companyId) {
        console.error('[createCoupon] ERROR: Saved coupon has no companyId!', savedCoupon);
        throw new Error('Failed to save coupon with company information');
      }

      const response = {
        ...savedCoupon,
        id: savedCoupon._id.toString(),
        companyId: savedCoupon.companyId.toString(), // Must be non-null
        validFrom: savedCoupon.validFrom?.toISOString() || new Date().toISOString(),
        validTo: savedCoupon.validTo?.toISOString(),
        createdAt: savedCoupon.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: savedCoupon.updatedAt?.toISOString() || new Date().toISOString(),
        applicableProductIds: (savedCoupon.applicableProductIds || []).map(id => id.toString()),
        applicableGroupIds: (savedCoupon.applicableGroupIds || []).map(id => id.toString()),
      };

      console.log('[createCoupon] Returning response with companyId:', response.companyId);
      return response;
    },

    updateCoupon: async (_, { id, input }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const allowedRoles = ['Super Admin', 'Admin'];
      if (!allowedRoles.includes(context.user.role)) {
        throw new Error('Not authorized to update coupons');
      }

      const existingCoupon = await Coupon.findById(id);
      
      if (!existingCoupon) {
        throw new Error('Coupon not found');
      }

      // Company-based authorization check
      if (context.user.role === 'Admin') {
        if (existingCoupon.companyId.toString() !== context.user.companyId) {
          throw new Error('Not authorized to update this coupon');
        }
      }

      // Check if code is being changed and if new code already exists for this company
      if (input.code && input.code.toUpperCase() !== existingCoupon.code) {
        const codeExists = await Coupon.findOne({ 
          code: input.code.toUpperCase(),
          companyId: existingCoupon.companyId,
          _id: { $ne: id }
        });
        if (codeExists) {
          throw new Error('Coupon code already exists for this company');
        }
      }

      const updateData = {
        ...input,
        code: input.code ? input.code.toUpperCase() : existingCoupon.code,
        validFrom: input.validFrom ? new Date(input.validFrom) : existingCoupon.validFrom,
        validTo: input.validTo ? new Date(input.validTo) : existingCoupon.validTo,
        applicableProductIds: input.applicableProductIds !== undefined ? input.applicableProductIds : existingCoupon.applicableProductIds,
        applicableGroupIds: input.applicableGroupIds !== undefined ? input.applicableGroupIds : existingCoupon.applicableGroupIds,
      };

      const updatedCoupon = await Coupon.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean();

      return {
        ...updatedCoupon,
        id: updatedCoupon._id.toString(),
        companyId: updatedCoupon.companyId?.toString() || null,
        validFrom: updatedCoupon.validFrom?.toISOString() || new Date().toISOString(),
        validTo: updatedCoupon.validTo?.toISOString(),
        createdAt: updatedCoupon.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: updatedCoupon.updatedAt?.toISOString() || new Date().toISOString(),
        applicableProductIds: (updatedCoupon.applicableProductIds || []).map(id => id.toString()),
        applicableGroupIds: (updatedCoupon.applicableGroupIds || []).map(id => id.toString()),
      };
    },

    deleteCoupon: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const allowedRoles = ['Super Admin', 'Admin'];
      if (!allowedRoles.includes(context.user.role)) {
        throw new Error('Not authorized to delete coupons');
      }

      const coupon = await Coupon.findById(id);
      
      if (!coupon) {
        throw new Error('Coupon not found');
      }

      // Company-based authorization check
      if (context.user.role === 'Admin') {
        if (coupon.companyId.toString() !== context.user.companyId) {
          throw new Error('Not authorized to delete this coupon');
        }
      }

      await Coupon.findByIdAndDelete(id);

      return {
        success: true,
        message: 'Coupon deleted successfully',
      };
    },

    incrementCouponUsage: async (_, { id }, context) => {
      await connectDB();
      
      const coupon = await Coupon.findByIdAndUpdate(
        id,
        { $inc: { usedCount: 1 } },
        { new: true }
      ).lean();

      if (!coupon) {
        throw new Error('Coupon not found');
      }

      return {
        ...coupon,
        id: coupon._id.toString(),
        validFrom: coupon.validFrom?.toISOString() || new Date().toISOString(),
        validTo: coupon.validTo?.toISOString(),
        createdAt: coupon.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: coupon.updatedAt?.toISOString() || new Date().toISOString(),
        applicableProductIds: (coupon.applicableProductIds || []).map(id => id.toString()),
        applicableGroupIds: (coupon.applicableGroupIds || []).map(id => id.toString()),
      };
    },
  },
};

