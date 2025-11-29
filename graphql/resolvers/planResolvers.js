import connectDB from '../../lib/mongodb.js';
import Plan from '../../models/Plan.js';

export const planResolvers = {
  Query: {
    getPlans: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can view plans
      if (context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Super Admin access required.');
      }

      const plans = await Plan.find().sort({ displayOrder: 1, createdAt: -1 });
      
      return plans.map(plan => ({
        id: plan._id.toString(),
        name: plan.name,
        description: plan.description || '',
        price: plan.price,
        billingCycle: plan.billingCycle,
        usersLimit: plan.usersLimit,
        salesPersonLimit: plan.salesPersonLimit || 0,
        quotationLimit: plan.quotationLimit || 0,
        features: plan.features || [],
        status: plan.status,
        isPopular: plan.isPopular,
        displayOrder: plan.displayOrder,
        subscriptionCount: plan.subscriptionCount,
        totalRevenue: plan.totalRevenue,
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString(),
      }));
    },

    getPlan: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const plan = await Plan.findById(id);
      if (!plan) {
        throw new Error('Plan not found');
      }

      return {
        id: plan._id.toString(),
        name: plan.name,
        description: plan.description || '',
        price: plan.price,
        billingCycle: plan.billingCycle,
        usersLimit: plan.usersLimit,
        features: plan.features || [],
        status: plan.status,
        isPopular: plan.isPopular,
        displayOrder: plan.displayOrder,
        subscriptionCount: plan.subscriptionCount,
        totalRevenue: plan.totalRevenue,
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString(),
      };
    },

    getActivePlans: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can view active plans
      if (context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Super Admin access required.');
      }

      const plans = await Plan.find({ status: 'Active' }).sort({ displayOrder: 1, createdAt: -1 });
      
      return plans.map(plan => ({
        id: plan._id.toString(),
        name: plan.name,
        description: plan.description || '',
        price: plan.price,
        billingCycle: plan.billingCycle,
        usersLimit: plan.usersLimit,
        salesPersonLimit: plan.salesPersonLimit || 0,
        quotationLimit: plan.quotationLimit || 0,
        features: plan.features || [],
        status: plan.status,
        isPopular: plan.isPopular,
        displayOrder: plan.displayOrder,
        subscriptionCount: plan.subscriptionCount,
        totalRevenue: plan.totalRevenue,
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString(),
      }));
    },

    getPlanStats: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can view plan stats
      if (context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Super Admin access required.');
      }

      const plans = await Plan.find();
      
      const totalPlans = plans.length;
      const activePlans = plans.filter(p => p.status === 'Active').length;
      const totalRevenue = plans.reduce((sum, p) => sum + (p.totalRevenue || 0), 0);
      const averageUsersLimit = totalPlans > 0 
        ? plans.reduce((sum, p) => sum + p.usersLimit, 0) / totalPlans 
        : 0;
      const totalSubscriptions = plans.reduce((sum, p) => sum + (p.subscriptionCount || 0), 0);

      return {
        totalPlans,
        activePlans,
        totalRevenue,
        averageUsersLimit: Math.round(averageUsersLimit),
        totalSubscriptions,
      };
    },
  },

  Mutation: {
    createPlan: async (_, args, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can create plans
      if (context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Super Admin access required.');
      }

      const plan = await Plan.create({
        ...args,
        subscriptionCount: 0,
        totalRevenue: 0,
      });

      return {
        id: plan._id.toString(),
        name: plan.name,
        description: plan.description || '',
        price: plan.price,
        billingCycle: plan.billingCycle,
        usersLimit: plan.usersLimit,
        salesPersonLimit: plan.salesPersonLimit || 0,
        quotationLimit: plan.quotationLimit || 0,
        features: plan.features || [],
        status: plan.status,
        isPopular: plan.isPopular,
        displayOrder: plan.displayOrder,
        subscriptionCount: plan.subscriptionCount,
        totalRevenue: plan.totalRevenue,
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString(),
      };
    },

    updatePlan: async (_, { id, ...updates }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can update plans
      if (context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Super Admin access required.');
      }

      const plan = await Plan.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!plan) {
        throw new Error('Plan not found');
      }

      return {
        id: plan._id.toString(),
        name: plan.name,
        description: plan.description || '',
        price: plan.price,
        billingCycle: plan.billingCycle,
        usersLimit: plan.usersLimit,
        salesPersonLimit: plan.salesPersonLimit || 0,
        quotationLimit: plan.quotationLimit || 0,
        features: plan.features || [],
        status: plan.status,
        isPopular: plan.isPopular,
        displayOrder: plan.displayOrder,
        subscriptionCount: plan.subscriptionCount,
        totalRevenue: plan.totalRevenue,
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString(),
      };
    },

    deletePlan: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can delete plans
      if (context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Super Admin access required.');
      }

      const plan = await Plan.findByIdAndDelete(id);
      if (!plan) {
        throw new Error('Plan not found');
      }

      return {
        success: true,
        message: 'Plan deleted successfully',
      };
    },
  },
};

