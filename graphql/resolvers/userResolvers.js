import User from '../../models/User.js';
import Company from '../../models/Company.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import connectDB from '../../lib/mongodb.js';
import { sendWelcomeEmail, sendPasswordChangeEmail } from '../../lib/email.js';

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Helper function to verify token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const userResolvers = {
  Query: {
    getUsers: async (_, __, context) => {
      await connectDB();
      
      // Check if user is authenticated
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Check if user has permission (Super Admin or Admin)
      if (!['Super Admin', 'Admin'].includes(context.user.role)) {
        throw new Error('Not authorized');
      }

      const users = await User.find({}).sort({ createdAt: -1 });
      return users.map(user => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        status: user.status,
        companyId: user.companyId ? user.companyId.toString() : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }));
    },

    getUser: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const user = await User.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        status: user.status,
        companyId: user.companyId ? user.companyId.toString() : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },

    getCustomers: async (_, __, context) => {
      await connectDB();
      
      // Check if user is authenticated
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Super Admin, Admin, and Sales Person can view all customers
      if (!['Super Admin', 'Admin', 'Sales Person'].includes(context.user.role) && context.user.type !== 'salesPerson') {
        throw new Error('Not authorized to view customers');
      }

      // Get all users with Customer role
      const customers = await User.find({ role: 'Customer' }).sort({ createdAt: -1 });
      return customers.map(user => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        status: user.status,
        companyId: user.companyId ? user.companyId.toString() : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }));
    },

    getCurrentUser: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Skip role check for Super Admin
      if (context.user.role === 'Super Admin') {
        const user = await User.findById(context.user.userId);
        if (!user) {
          throw new Error('User not found');
        }
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone || '',
          address: user.address || '',
          status: user.status,
          companyId: user.companyId ? user.companyId.toString() : null,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        };
      }

      const user = await User.findById(context.user.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user's role is enabled for their company
      if (user.companyId) {
        const company = await Company.findById(user.companyId).lean();
        if (company) {
          const enabledRoles = company.enabledRoles || ['Admin', 'Customer', 'Sales Person'];
          if (!enabledRoles.includes(user.role)) {
            throw new Error(`Your ${user.role} role has been disabled for this company. Please contact your administrator.`);
          }
        }
      }

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        status: user.status,
        companyId: user.companyId ? user.companyId.toString() : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },
  },

  Mutation: {
    login: async (_, { email, password }) => {
      await connectDB();

      // Find user with password field
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (user.status !== 'Active') {
        throw new Error('Account is inactive. Please contact administrator.');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Generate token
      const token = generateToken(user);

      return {
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone || '',
          address: user.address || '',
          status: user.status,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      };
    },

    register: async (_, { name, email, password, role, phone, address }) => {
      await connectDB();

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create new user
      const user = await User.create({
        name,
        email,
        password,
        role: role || 'Customer',
        phone,
        address,
      });

      // Generate token
      const token = generateToken(user);

      return {
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone || '',
          address: user.address || '',
          status: user.status,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      };
    },

    createUser: async (_, { name, email, password, role, phone, address, companyId }, context) => {
      await connectDB();

      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Check authorization (Super Admin and Admin can create users)
      if (!['Super Admin', 'Admin'].includes(context.user.role)) {
        throw new Error('Not authorized to create users');
      }

      // Role restrictions for created users
      const currentUserRole = context.user.role;
      
      // Admin cannot create Super Admin
      if (currentUserRole === 'Admin' && role === 'Super Admin') {
        throw new Error('Not authorized to create Super Admin');
      }

      // Clean and validate email from input
      const cleanEmail = email ? email.trim().toLowerCase() : '';
      if (!cleanEmail || !cleanEmail.includes('@')) {
        throw new Error('Invalid email address');
      }

      console.log('Creating user with email:', cleanEmail);

      // Check if user already exists
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Validate companyId based on role
      if (role === 'Super Admin' && companyId) {
        throw new Error('Super Admin cannot be associated with a company');
      }

      // Customer and Sales Person require companyId
      if (['Customer', 'Sales Person'].includes(role) && !companyId) {
        throw new Error(`Company is required for ${role} role`);
      }

      // If companyId is provided, verify it exists and check plan limits
      if (companyId) {
        const Company = (await import('../../models/Company.js')).default;
        const company = await Company.findById(companyId);
        if (!company) {
          throw new Error('Company not found');
        }

        // Check plan limits for non-Super Admin roles
        if (role !== 'Super Admin') {
          const { checkUserLimitForCompany } = await import('../../lib/planLimitHelpers.js');
          const limitCheck = await checkUserLimitForCompany(companyId, role);
          
          if (!limitCheck.canAdd) {
            const roleSpecificMessage = role === 'Admin' 
              ? `Your company's plan allows only ${limitCheck.limit} user${limitCheck.limit > 1 ? 's' : ''} to be registered. ` +
                `Currently ${limitCheck.currentUsage} user${limitCheck.currentUsage !== 1 ? 's are' : ' is'} registered. ` +
                `Please upgrade your plan to add more Admins or use the existing ${limitCheck.currentUsage} Admin${limitCheck.currentUsage !== 1 ? 's' : ''}.`
              : limitCheck.message;
            
            throw new Error(
              `Cannot create ${role} for this company. ${roleSpecificMessage}`
            );
          }
        }
      }

      // Create new user
      // Admin users can be created without companyId - they will be linked when company is created
      // Super Admin: no companyId
      // Admin: optional companyId (can be null/undefined)
      // Customer/Sales Person: companyId required (validated above)
      const userData = {
        name,
        email: cleanEmail, // Use cleaned email
        password,
        role,
        phone,
        address,
      };

      // Only include companyId if it's provided and role is not Super Admin
      if (role !== 'Super Admin' && companyId) {
        userData.companyId = companyId;
      }
      // For Admin without companyId, don't include the field at all

      const user = await User.create(userData);

      // If user is linked to an existing company, increment company user count
      if (companyId && role !== 'Super Admin') {
        const { incrementUserCount } = await import('../../lib/planLimitHelpers.js');
        await incrementUserCount(companyId, role);
        
        // If Admin is linked, also add to company's adminIds array
        if (role === 'Admin') {
          const Company = (await import('../../models/Company.js')).default;
          const company = await Company.findById(companyId);
          await Company.findByIdAndUpdate(companyId, {
            $addToSet: { adminIds: user._id }, // Add to array if not already present
            $set: { 
              adminId: company?.adminId || user._id, // Set as primary if no primary admin
              updatedAt: new Date() 
            },
          });
        }
      }

      // Send welcome email to new user using the cleaned email from input
      // Note: Pass password before it gets hashed (it's still in plain text at this point)
      try {
        console.log('Sending welcome email to:', cleanEmail);
        const emailResult = await sendWelcomeEmail({
          name: name,
          email: cleanEmail, // Use the cleaned email from input
          password: password, // Pass the original password before hashing
          role: role,
          phone: phone || '',
          address: address || '',
          status: user.status,
        });
        console.log('Email send result:', emailResult);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't throw error, just log it - user creation should still succeed
      }

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        status: user.status,
        companyId: user.companyId ? user.companyId.toString() : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },

    updateUser: async (_, { id, name, email, password, role, phone, address, status, companyId }, context) => {
      await connectDB();

      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Get the target user
      const targetUser = await User.findById(id);
      if (!targetUser) {
        throw new Error('User not found');
      }

      const currentUserRole = context.user.role;
      const targetUserRole = targetUser.role;
      const currentUserId = context.user.userId;

      // Check authorization based on roles
      // Super Admin can edit anyone
      if (currentUserRole === 'Super Admin') {
        // Super Admin can edit anyone
      }
      // Admin cannot edit Super Admin
      else if (currentUserRole === 'Admin') {
        if (targetUserRole === 'Super Admin') {
          throw new Error('Not authorized to edit Super Admin');
        }
        // Admin can edit itself and others (except Super Admin)
      }
      // Customer cannot edit anyone except themselves
      else if (currentUserRole === 'Customer') {
        if (context.user.userId !== id && context.user.id !== id) {
          throw new Error('Not authorized to update users');
        }
      }
      else {
        throw new Error('Not authorized to update users');
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      
      // Password update (only if provided)
      if (password) {
        // Only Super Admin and Admin can change passwords
        if (currentUserRole === 'Super Admin' || currentUserRole === 'Admin') {
          // Hash the password before updating (since findByIdAndUpdate doesn't trigger pre-save hook)
          const salt = await bcrypt.genSalt(10);
          updateData.password = await bcrypt.hash(password, salt);
        } else {
          throw new Error('Not authorized to change password');
        }
      }
      
      // Role change restrictions
      if (role) {
        // Super Admin can change anyone's role
        if (currentUserRole === 'Super Admin') {
          updateData.role = role;
        }
        // Admin cannot change Super Admin's role
        else if (currentUserRole === 'Admin') {
          if (targetUserRole === 'Super Admin') {
            throw new Error('Not authorized to change Super Admin role');
          }
          updateData.role = role;
        }
        // AdminTeam cannot change Super Admin or Admin's role
        else if (currentUserRole === 'AdminTeam') {
          if (targetUserRole === 'Super Admin' || targetUserRole === 'Admin') {
            throw new Error('Not authorized to change this user\'s role');
          }
          updateData.role = role;
        }
      }
      
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (status) updateData.status = status;
      
      // Handle companyId update
      const oldCompanyId = targetUser.companyId ? targetUser.companyId.toString() : null;
      let newCompanyId = null;
      
      if (companyId !== undefined) {
        const newRole = role || targetUser.role;
        
        // Super Admin cannot have companyId
        if (newRole === 'Super Admin') {
          if (companyId) {
            throw new Error('Super Admin cannot be associated with a company');
          }
          updateData.companyId = undefined;
          newCompanyId = null;
        } else {
          // For Customer and Sales Person roles, companyId is required
          if (['Customer', 'Sales Person'].includes(newRole) && !companyId) {
            throw new Error(`Company is required for ${newRole} role`);
          }
          
          // Verify company exists if provided and check plan limits
          if (companyId) {
            const Company = (await import('../../models/Company.js')).default;
            const company = await Company.findById(companyId);
            if (!company) {
              throw new Error('Company not found');
            }

            // Check plan limits when linking to a company
            const { checkUserLimitForCompany } = await import('../../lib/planLimitHelpers.js');
            const limitCheck = await checkUserLimitForCompany(companyId, newRole);
            
            if (!limitCheck.canAdd) {
              const roleSpecificMessage = newRole === 'Admin' 
                ? `Your company's plan allows only ${limitCheck.limit} user${limitCheck.limit > 1 ? 's' : ''} to be registered. ` +
                  `Currently ${limitCheck.currentUsage} user${limitCheck.currentUsage !== 1 ? 's are' : ' is'} registered. ` +
                  `Please upgrade your plan to add more Admins or use the existing ${limitCheck.currentUsage} Admin${limitCheck.currentUsage !== 1 ? 's' : ''}.`
                : limitCheck.message;
              
              throw new Error(
                `Cannot link ${newRole} to company. ${roleSpecificMessage}`
              );
            }
          }
          
          // Admin can have companyId or not (will be linked when company is created)
          updateData.companyId = companyId || undefined;
          newCompanyId = companyId ? companyId.toString() : null;
        }
      } else if (role) {
        // If role is being changed but companyId is not provided, handle it
        const newRole = role;
        if (newRole === 'Super Admin') {
          updateData.companyId = undefined;
          newCompanyId = null;
        } else if (['Customer', 'Sales Person'].includes(newRole) && !targetUser.companyId) {
          throw new Error(`Company is required for ${newRole} role`);
        } else {
          // Keep existing companyId
          newCompanyId = oldCompanyId;
        }
        // Admin role change doesn't require companyId validation
      } else {
        // No change to companyId
        newCompanyId = oldCompanyId;
      }

      const user = await User.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      // Update company user counts when companyId changes
      if (oldCompanyId !== newCompanyId) {
        const { incrementUserCount, decrementUserCount } = await import('../../lib/planLimitHelpers.js');
        const Company = (await import('../../models/Company.js')).default;
        const userRole = role || targetUser.role;
        
        // Decrement count from old company
        if (oldCompanyId) {
          await decrementUserCount(oldCompanyId, userRole);
          
          // If Admin, remove from old company's adminIds array
          if (userRole === 'Admin') {
            await Company.findByIdAndUpdate(oldCompanyId, {
              $pull: { adminIds: user._id },
              updatedAt: new Date(),
            });
          }
        }
        
        // Increment count for new company
        if (newCompanyId) {
          await incrementUserCount(newCompanyId, userRole);
          
          // If Admin, add to new company's adminIds array
          if (userRole === 'Admin') {
            await Company.findByIdAndUpdate(newCompanyId, {
              $addToSet: { adminIds: user._id },
              $set: { 
                adminId: (await Company.findById(newCompanyId)).adminId || user._id,
                updatedAt: new Date() 
              },
            });
          }
        }
      }

      if (!user) {
        throw new Error('User not found');
      }

      // Send password change notification email if password was updated
      if (password && (currentUserRole === 'Super Admin' || currentUserRole === 'Admin')) {
        try {
          await sendPasswordChangeEmail({
            name: user.name,
            email: user.email,
          });
        } catch (emailError) {
          console.error('Failed to send password change email:', emailError);
          // Don't throw error, just log it
        }
      }

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        status: user.status,
        companyId: user.companyId ? user.companyId.toString() : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },

    deleteUser: async (_, { id }, context) => {
      await connectDB();

      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Get the target user
      const targetUser = await User.findById(id);
      if (!targetUser) {
        throw new Error('User not found');
      }

      const currentUserRole = context.user.role;
      const targetUserRole = targetUser.role;
      const currentUserId = context.user.userId;

      // Prevent self-deletion
      if (currentUserId === id) {
        throw new Error('Cannot delete your own account');
      }

      // Check authorization based on roles
      // Super Admin can delete anyone (except itself)
      if (currentUserRole === 'Super Admin') {
        // Super Admin can delete anyone
      }
      // Admin cannot delete Super Admin or itself
      else if (currentUserRole === 'Admin') {
        if (targetUserRole === 'Super Admin') {
          throw new Error('Not authorized to delete Super Admin');
        }
        // Admin can delete others (except Super Admin)
      }
      // Customer cannot delete anyone
      else if (currentUserRole === 'Customer') {
        throw new Error('Not authorized to delete users');
      }
      else {
        throw new Error('Not authorized to delete users');
      }

      const user = await User.findByIdAndDelete(id);

      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        message: 'User deleted successfully',
      };
    },
  },
};


