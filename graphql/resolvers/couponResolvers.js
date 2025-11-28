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
      const allowedRoles = ['Super Admin', 'Admin', 'AdminTeam', 'Sales Person'];
      const isSalesPerson = context.user.type === 'salesPerson' || context.user.role === 'Sales Person';
      
      if (!allowedRoles.includes(context.user.role) && !isSalesPerson) {
        throw new Error('Not authorized to view coupons');
      }

      const coupons = await Coupon.find({})
        .sort({ createdAt: -1 })
        .lean();

      return coupons.map(coupon => ({
        ...coupon,
        id: coupon._id.toString(),
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

      const allowedRoles = ['Super Admin', 'Admin', 'AdminTeam', 'Sales Person'];
      const isSalesPerson = context.user.type === 'salesPerson' || context.user.role === 'Sales Person';
      
      if (!allowedRoles.includes(context.user.role) && !isSalesPerson) {
        throw new Error('Not authorized to view coupons');
      }

      const coupon = await Coupon.findById(id).lean();
      
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
      
      const coupon = await Coupon.findOne({ code: code.toUpperCase() });
      
      if (!coupon) {
        return {
          valid: false,
          error: 'Coupon not found',
          discount: 0,
          discountType: null,
          discountValue: 0,
          coupon: null,
        };
      }

      // Get product and group IDs from line items if not provided
      const validation = coupon.validateCoupon(subtotal, productIds, groupIds);
      
      if (!validation.valid) {
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

      const allowedRoles = ['Super Admin', 'Admin', 'AdminTeam'];
      if (!allowedRoles.includes(context.user.role)) {
        throw new Error('Not authorized to create coupons');
      }

      // Check if coupon code already exists
      const existingCoupon = await Coupon.findOne({ code: input.code.toUpperCase() });
      if (existingCoupon) {
        throw new Error('Coupon code already exists');
      }

      const couponData = {
        ...input,
        code: input.code.toUpperCase(),
        validFrom: new Date(input.validFrom),
        validTo: new Date(input.validTo),
        createdBy: context.user.userId || context.user.id,
        applicableProductIds: input.applicableProductIds || [],
        applicableGroupIds: input.applicableGroupIds || [],
      };

      const coupon = new Coupon(couponData);
      await coupon.save();

      const savedCoupon = await Coupon.findById(coupon._id).lean();

      return {
        ...savedCoupon,
        id: savedCoupon._id.toString(),
        validFrom: savedCoupon.validFrom?.toISOString() || new Date().toISOString(),
        validTo: savedCoupon.validTo?.toISOString(),
        createdAt: savedCoupon.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: savedCoupon.updatedAt?.toISOString() || new Date().toISOString(),
        applicableProductIds: (savedCoupon.applicableProductIds || []).map(id => id.toString()),
        applicableGroupIds: (savedCoupon.applicableGroupIds || []).map(id => id.toString()),
      };
    },

    updateCoupon: async (_, { id, input }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const allowedRoles = ['Super Admin', 'Admin', 'AdminTeam'];
      if (!allowedRoles.includes(context.user.role)) {
        throw new Error('Not authorized to update coupons');
      }

      const existingCoupon = await Coupon.findById(id);
      
      if (!existingCoupon) {
        throw new Error('Coupon not found');
      }

      // Check if code is being changed and if new code already exists
      if (input.code && input.code.toUpperCase() !== existingCoupon.code) {
        const codeExists = await Coupon.findOne({ 
          code: input.code.toUpperCase(),
          _id: { $ne: id }
        });
        if (codeExists) {
          throw new Error('Coupon code already exists');
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

      const allowedRoles = ['Super Admin', 'Admin', 'AdminTeam'];
      if (!allowedRoles.includes(context.user.role)) {
        throw new Error('Not authorized to delete coupons');
      }

      const coupon = await Coupon.findByIdAndDelete(id);
      
      if (!coupon) {
        throw new Error('Coupon not found');
      }

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

