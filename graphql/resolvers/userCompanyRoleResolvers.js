import connectDB from '../../lib/mongodb.js';
import UserCompanyRole from '../../models/UserCompanyRole.js';
import User from '../../models/User.js';
import Company from '../../models/Company.js';
import jwt from 'jsonwebtoken';

// Helper function to generate JWT token with active company
const generateToken = (user, activeCompanyId) => {
  return jwt.sign(
    { 
      userId: user._id, 
      email: user.email, 
      role: user.role,
      companyId: user.companyId?.toString() || null,
      activeCompanyId: activeCompanyId?.toString() || user.companyId?.toString() || null
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const userCompanyRoleResolvers = {
  Query: {
    // Get all companies a user has access to
    getUserCompanies: async (_, { userId }, context) => {
      await connectDB();

      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // If userId not provided, use logged-in user
      const targetUserId = userId || context.user.userId || context.user.id;

      // Authorization: User can only see their own companies unless Super Admin
      if (context.user.role !== 'Super Admin' && targetUserId !== (context.user.userId || context.user.id)) {
        throw new Error('Not authorized to view other users companies');
      }

      // Get all company roles for this user
      const userCompanyRoles = await UserCompanyRole.find({ 
        userId: targetUserId,
        status: 'Active'
      })
        .populate('companyId')
        .lean();

      // Also check if user has a primary companyId (backward compatibility)
      const user = await User.findById(targetUserId).lean();
      const companies = [];

      // Add companies from UserCompanyRole
      for (const ucr of userCompanyRoles) {
        if (ucr.companyId) {
          companies.push({
            companyId: ucr.companyId._id.toString(),
            companyName: ucr.companyId.name,
            role: ucr.role,
            status: ucr.status,
            salesPersonId: ucr.salesPersonId || null,
            isActive: user.activeCompanyId?.toString() === ucr.companyId._id.toString(),
          });
        }
      }

      // Add primary company if not already in list (backward compatibility)
      if (user.companyId) {
        const existsInList = companies.some(c => c.companyId === user.companyId.toString());
        if (!existsInList) {
          const company = await Company.findById(user.companyId).lean();
          if (company) {
            companies.push({
              companyId: user.companyId.toString(),
              companyName: company.name,
              role: user.role,
              status: user.status,
              salesPersonId: user.salesPersonId || null,
              isActive: !user.activeCompanyId || user.activeCompanyId.toString() === user.companyId.toString(),
            });
          }
        }
      }

      return companies;
    },

    // Get all users in a company
    getCompanyUsers: async (_, { companyId }, context) => {
      await connectDB();

      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Authorization: Only Super Admin or Admin of that company
      if (context.user.role !== 'Super Admin') {
        const userCompanyId = context.user.activeCompanyId || context.user.companyId;
        if (userCompanyId !== companyId) {
          throw new Error('Not authorized to view this company users');
        }
      }

      const companyUsers = await UserCompanyRole.find({ 
        companyId,
        status: 'Active'
      })
        .populate('userId')
        .populate('companyId')
        .lean();

      return companyUsers.map(ucr => ({
        id: ucr._id.toString(),
        userId: ucr.userId._id.toString(),
        companyId: ucr.companyId._id.toString(),
        role: ucr.role,
        status: ucr.status,
        permissions: ucr.permissions || [],
        salesPersonId: ucr.salesPersonId || null,
        addedBy: ucr.addedBy?.toString() || null,
        createdAt: ucr.createdAt.toISOString(),
        updatedAt: ucr.updatedAt.toISOString(),
        user: {
          id: ucr.userId._id.toString(),
          name: ucr.userId.name,
          email: ucr.userId.email,
          phone: ucr.userId.phone || '',
          status: ucr.userId.status,
        },
        company: {
          id: ucr.companyId._id.toString(),
          name: ucr.companyId.name,
          email: ucr.companyId.email,
        },
      }));
    },

    // Get specific user-company role
    getUserCompanyRole: async (_, { userId, companyId }, context) => {
      await connectDB();

      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const ucr = await UserCompanyRole.findOne({ userId, companyId })
        .populate('userId')
        .populate('companyId')
        .lean();

      if (!ucr) {
        return null;
      }

      return {
        id: ucr._id.toString(),
        userId: ucr.userId._id.toString(),
        companyId: ucr.companyId._id.toString(),
        role: ucr.role,
        status: ucr.status,
        permissions: ucr.permissions || [],
        salesPersonId: ucr.salesPersonId || null,
        addedBy: ucr.addedBy?.toString() || null,
        createdAt: ucr.createdAt.toISOString(),
        updatedAt: ucr.updatedAt.toISOString(),
      };
    },
  },

  Mutation: {
    // Switch active company
    switchCompany: async (_, { companyId }, context) => {
      await connectDB();

      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const userId = context.user.userId || context.user.id;

      // Verify user has access to this company
      const hasAccess = await UserCompanyRole.findOne({
        userId,
        companyId,
        status: 'Active'
      }).lean();

      // Also check primary companyId (backward compatibility)
      const user = await User.findById(userId).lean();
      const isPrimaryCompany = user.companyId?.toString() === companyId;

      if (!hasAccess && !isPrimaryCompany) {
        throw new Error('You do not have access to this company');
      }

      // Update user's activeCompanyId
      await User.findByIdAndUpdate(userId, {
        activeCompanyId: companyId,
        lastCompanySwitch: new Date(),
      });

      // Get updated user with new active company
      const updatedUser = await User.findById(userId).lean();
      
      // Get company details
      const company = await Company.findById(companyId).lean();

      // Get user's role in this company
      let roleInCompany = user.role;
      if (hasAccess) {
        roleInCompany = hasAccess.role;
      }

      // Generate new token with activeCompanyId
      const token = generateToken(
        { ...updatedUser, role: roleInCompany }, 
        companyId
      );

      console.log(`[switchCompany] User ${user.email} switched to company ${company?.name}`);

      return {
        success: true,
        message: `Successfully switched to ${company?.name || 'company'}`,
        token,
        user: {
          id: updatedUser._id.toString(),
          name: updatedUser.name,
          email: updatedUser.email,
          role: roleInCompany,
          companyId: updatedUser.companyId?.toString() || null,
          activeCompanyId: companyId,
          status: updatedUser.status,
          phone: updatedUser.phone || '',
          address: updatedUser.address || '',
          createdAt: updatedUser.createdAt.toISOString(),
          updatedAt: updatedUser.updatedAt.toISOString(),
        },
        activeCompany: company ? {
          id: company._id.toString(),
          name: company.name,
          email: company.email,
          phone: company.phone || '',
          address: company.address || '',
          status: company.status,
        } : null,
      };
    },

    // Add user to company
    addUserToCompany: async (_, { userId, companyId, role, salesPersonId }, context) => {
      await connectDB();

      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Authorization: Only Super Admin or Admin of that company
      if (context.user.role !== 'Super Admin') {
        const userCompanyId = context.user.activeCompanyId || context.user.companyId;
        if (userCompanyId !== companyId) {
          throw new Error('Not authorized to add users to this company');
        }
      }

      // Check if relationship already exists
      const existing = await UserCompanyRole.findOne({ userId, companyId });
      if (existing) {
        throw new Error('User already has a role in this company');
      }

      // Create new user-company role
      const ucr = await UserCompanyRole.create({
        userId,
        companyId,
        role,
        status: 'Active',
        salesPersonId,
        addedBy: context.user.userId || context.user.id,
      });

      console.log(`[addUserToCompany] User ${userId} added to company ${companyId} as ${role}`);

      return {
        id: ucr._id.toString(),
        userId: ucr.userId.toString(),
        companyId: ucr.companyId.toString(),
        role: ucr.role,
        status: ucr.status,
        permissions: ucr.permissions || [],
        salesPersonId: ucr.salesPersonId || null,
        addedBy: ucr.addedBy?.toString() || null,
        createdAt: ucr.createdAt.toISOString(),
        updatedAt: ucr.updatedAt.toISOString(),
      };
    },

    // Remove user from company
    removeUserFromCompany: async (_, { userId, companyId }, context) => {
      await connectDB();

      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Authorization: Only Super Admin or Admin of that company
      if (context.user.role !== 'Super Admin') {
        const userCompanyId = context.user.activeCompanyId || context.user.companyId;
        if (userCompanyId !== companyId) {
          throw new Error('Not authorized to remove users from this company');
        }
      }

      const result = await UserCompanyRole.findOneAndDelete({ userId, companyId });

      if (!result) {
        throw new Error('User-company relationship not found');
      }

      console.log(`[removeUserFromCompany] User ${userId} removed from company ${companyId}`);

      return {
        success: true,
        message: 'User removed from company successfully',
      };
    },

    // Update user's role in company
    updateUserCompanyRole: async (_, { userId, companyId, role, status, permissions }, context) => {
      await connectDB();

      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Authorization: Only Super Admin or Admin of that company
      if (context.user.role !== 'Super Admin') {
        const userCompanyId = context.user.activeCompanyId || context.user.companyId;
        if (userCompanyId !== companyId) {
          throw new Error('Not authorized to update users in this company');
        }
      }

      const updateData = {};
      if (role) updateData.role = role;
      if (status) updateData.status = status;
      if (permissions) updateData.permissions = permissions;

      const ucr = await UserCompanyRole.findOneAndUpdate(
        { userId, companyId },
        updateData,
        { new: true }
      ).lean();

      if (!ucr) {
        throw new Error('User-company relationship not found');
      }

      console.log(`[updateUserCompanyRole] Updated user ${userId} role in company ${companyId}`);

      return {
        id: ucr._id.toString(),
        userId: ucr.userId.toString(),
        companyId: ucr.companyId.toString(),
        role: ucr.role,
        status: ucr.status,
        permissions: ucr.permissions || [],
        salesPersonId: ucr.salesPersonId || null,
        addedBy: ucr.addedBy?.toString() || null,
        createdAt: ucr.createdAt.toISOString(),
        updatedAt: ucr.updatedAt.toISOString(),
      };
    },
  },
};


