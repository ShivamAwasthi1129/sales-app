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
      role: user.role,
      companyId: user.companyId?.toString() || null
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

      let filter = {};
      
      // Admin can only see users (including Sales Persons) from their own company
      if (context.user.role === 'Admin' && context.user.companyId) {
        filter.companyId = context.user.companyId;
        console.log(`[getUsers] Admin filtering by companyId: ${context.user.companyId}`);
      } else {
        console.log(`[getUsers] SuperAdmin viewing all users`);
      }

      const users = await User.find(filter)
        .populate('createdByAdminId', 'name email')
        .sort({ createdAt: -1 });
      
      return users.map(user => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        status: user.status,
        companyId: user.companyId ? user.companyId.toString() : null,
        salesPersonId: user.salesPersonId || null,
        dateOfBirth: user.dateOfBirth?.toISOString() || null,
        photo: user.photo || null,
        about: user.about || null,
        createdByAdminId: user.createdByAdminId?.toString() || null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }));
    },

    getUser: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const user = await User.findById(id).populate('createdByAdminId', 'name email');
      if (!user) {
        throw new Error('User not found');
      }

      // Admin can only view users from their own company
      if (context.user.role === 'Admin' && 
          context.user.companyId && 
          user.companyId?.toString() !== context.user.companyId) {
        throw new Error('Not authorized to view this user');
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
        salesPersonId: user.salesPersonId || null,
        dateOfBirth: user.dateOfBirth?.toISOString() || null,
        photo: user.photo || null,
        about: user.about || null,
        createdByAdminId: user.createdByAdminId?.toString() || null,
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

      // Super Admin, Admin, and Sales Person can view customers
      if (!['Super Admin', 'Admin', 'Sales Person'].includes(context.user.role) && context.user.type !== 'salesPerson') {
        throw new Error('Not authorized to view customers');
      }

      let customers = [];

      if (context.user.role === 'Super Admin') {
        // Super Admin can see all customers
        customers = await User.find({ role: 'Customer' }).sort({ createdAt: -1 });
      } else {
        // For Admin and Sales Person, get customers from quotations of their company
        const Quotation = (await import('../../models/Quotation.js')).default;
        const companyId = context.user.companyId;
        
        if (companyId) {
          // Get all quotations from this company (created by any Admin/Sales Person of the company)
          const companyUsers = await User.find({ companyId: companyId }).select('_id').lean();
          const userIds = companyUsers.map(u => u._id);
          
          // Also get sales persons of this company
          const salesPersons = await User.find({ 
            companyId: companyId, 
            role: 'Sales Person' 
          }).select('_id salesPersonId').lean();
          const salesPersonIds = salesPersons.map(sp => sp.salesPersonId);
          
          // Get quotations created by company users or with salesPersonId from company
          const quotations = await Quotation.find({
            $or: [
              { createdBy: { $in: userIds } },
              { 'from.salesPersonId': { $in: salesPersonIds } }
            ]
          }).select('to.email to.businessName').lean();
          
          // Extract unique customer emails
          const customerEmails = [...new Set(quotations.map(q => q.to?.email?.toLowerCase()).filter(Boolean))];
          
          // Get customers by email and company
          if (customerEmails.length > 0) {
            customers = await User.find({
              role: 'Customer',
              $or: [
                { companyId: companyId },
                { email: { $in: customerEmails } }
              ]
            }).sort({ createdAt: -1 });
          }
        }
      }

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
      let company = null;
      if (user.companyId) {
        company = await Company.findById(user.companyId).lean();
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
        company: company ? {
          id: company._id.toString(),
          name: company.name || '',
          email: company.email || '',
          phone: company.phone || '',
          address: company.address || '',
          website: company.website || '',
        } : null,
        salesPersonId: user.salesPersonId || null,
        dateOfBirth: user.dateOfBirth?.toISOString() || null,
        photo: user.photo || null,
        about: user.about || null,
        createdByAdminId: user.createdByAdminId?.toString() || null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },

    getSalesPersons: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Admin and Super Admin can view sales persons
      if (!['Super Admin', 'Admin'].includes(context.user.role)) {
        throw new Error('Not authorized to view sales persons');
      }

      let filter = { role: 'Sales Person' };
      
      // Admin can only see sales persons from their own company
      if (context.user.role === 'Admin' && context.user.companyId) {
        filter.companyId = context.user.companyId;
      }

      const salesPersons = await User.find(filter)
        .populate('createdByAdminId', 'name email')
        .sort({ createdAt: -1 });
      
      return salesPersons.map(sp => ({
        id: sp._id.toString(),
        name: sp.name,
        email: sp.email,
        role: sp.role,
        phone: sp.phone || '',
        address: sp.address || '',
        status: sp.status,
        companyId: sp.companyId?.toString() || null,
        salesPersonId: sp.salesPersonId || null,
        dateOfBirth: sp.dateOfBirth?.toISOString() || null,
        photo: sp.photo || null,
        about: sp.about || null,
        createdByAdminId: sp.createdByAdminId?.toString() || null,
        createdAt: sp.createdAt.toISOString(),
        updatedAt: sp.updatedAt.toISOString(),
      }));
    },

    getSalesPerson: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const salesPerson = await User.findOne({ _id: id, role: 'Sales Person' })
        .populate('createdByAdminId', 'name email');
      
      if (!salesPerson) {
        throw new Error('Sales person not found');
      }

      // Admin can only view sales persons from their own company
      if (context.user.role === 'Admin' && 
          context.user.companyId && 
          salesPerson.companyId?.toString() !== context.user.companyId) {
        throw new Error('Not authorized to view this sales person');
      }

      return {
        id: salesPerson._id.toString(),
        name: salesPerson.name,
        email: salesPerson.email,
        role: salesPerson.role,
        phone: salesPerson.phone || '',
        address: salesPerson.address || '',
        status: salesPerson.status,
        companyId: salesPerson.companyId?.toString() || null,
        salesPersonId: salesPerson.salesPersonId || null,
        dateOfBirth: salesPerson.dateOfBirth?.toISOString() || null,
        photo: salesPerson.photo || null,
        about: salesPerson.about || null,
        createdByAdminId: salesPerson.createdByAdminId?.toString() || null,
        createdAt: salesPerson.createdAt.toISOString(),
        updatedAt: salesPerson.updatedAt.toISOString(),
      };
    },

    getSalesPersonByEmail: async (_, { email }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const salesPerson = await User.findOne({ 
        email: email.toLowerCase(), 
        role: 'Sales Person' 
      }).populate('createdByAdminId', 'name email');
      
      if (!salesPerson) {
        throw new Error('Sales person not found');
      }

      // Admin can only view sales persons from their own company
      if (context.user.role === 'Admin' && 
          context.user.companyId && 
          salesPerson.companyId?.toString() !== context.user.companyId) {
        throw new Error('Not authorized to view this sales person');
      }

      return {
        id: salesPerson._id.toString(),
        name: salesPerson.name,
        email: salesPerson.email,
        role: salesPerson.role,
        phone: salesPerson.phone || '',
        address: salesPerson.address || '',
        status: salesPerson.status,
        companyId: salesPerson.companyId?.toString() || null,
        salesPersonId: salesPerson.salesPersonId || null,
        dateOfBirth: salesPerson.dateOfBirth?.toISOString() || null,
        photo: salesPerson.photo || null,
        about: salesPerson.about || null,
        createdByAdminId: salesPerson.createdByAdminId?.toString() || null,
        createdAt: salesPerson.createdAt.toISOString(),
        updatedAt: salesPerson.updatedAt.toISOString(),
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

      // Check if Admin user has a company assigned
      if (user.role === 'Admin' && !user.companyId) {
        throw new Error('Access Denied: Admin account is not associated with any company. Please contact the Super Admin to assign your account to a company.');
      }

      // Check if Customer user has a company assigned
      if (user.role === 'Customer' && !user.companyId) {
        throw new Error('Access Denied: Customer account is not associated with any company. Please contact your administrator.');
      }

      // Check if Sales Person user has a company assigned
      if (user.role === 'Sales Person' && !user.companyId) {
        throw new Error('Access Denied: Sales Person account is not associated with any company. Please contact your administrator.');
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
          companyId: user.companyId?.toString() || null,
          salesPersonId: user.salesPersonId || null,
          dateOfBirth: user.dateOfBirth?.toISOString() || null,
          photo: user.photo || null,
          about: user.about || null,
          createdByAdminId: user.createdByAdminId?.toString() || null,
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

    createUser: async (_, { name, email, password, role, phone, address, companyId, salesPersonId, dateOfBirth, photo, about }, context) => {
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
      // If not provided and user is Admin, use Admin's companyId
      let finalCompanyId = companyId;
      if (['Customer', 'Sales Person'].includes(role) && !finalCompanyId) {
        // Try to get companyId from logged-in user (Admin)
        if (context.user.role === 'Admin' && context.user.companyId) {
          finalCompanyId = context.user.companyId;
          console.log(`[Sales Person] Using Admin's companyId: ${finalCompanyId}`);
        } else {
          throw new Error(`Company is required for ${role} role`);
        }
      }

      // If companyId is provided, verify it exists and check plan limits
      if (finalCompanyId) {
        const Company = (await import('../../models/Company.js')).default;
        const company = await Company.findById(finalCompanyId);
        if (!company) {
          throw new Error('Company not found');
        }

        // Check plan limits for non-Super Admin roles
        if (role !== 'Super Admin') {
          const { checkUserLimitForCompany } = await import('../../lib/planLimitHelpers.js');
          const limitCheck = await checkUserLimitForCompany(finalCompanyId, role);
          
          if (!limitCheck.canAdd) {
            let roleSpecificMessage = '';
            if (role === 'Admin') {
              roleSpecificMessage = `Your company's plan allows only ${limitCheck.limit} user${limitCheck.limit > 1 ? 's' : ''} to be registered. ` +
                `Currently ${limitCheck.currentUsage} user${limitCheck.currentUsage !== 1 ? 's are' : ' is'} registered. ` +
                `Please upgrade your plan to add more Admins or use the existing ${limitCheck.currentUsage} Admin${limitCheck.currentUsage !== 1 ? 's' : ''}.`;
            } else if (role === 'Sales Person') {
              roleSpecificMessage = `Your company's plan allows only ${limitCheck.limit} sales person${limitCheck.limit > 1 ? 's' : ''} to be added. ` +
                `Currently ${limitCheck.currentUsage} sales person${limitCheck.currentUsage !== 1 ? 's are' : ' is'} registered. ` +
                `Please upgrade your plan to add more Sales Persons.`;
            } else {
              roleSpecificMessage = limitCheck.message;
            }
            
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
      if (role !== 'Super Admin' && finalCompanyId) {
        userData.companyId = finalCompanyId;
        console.log(`[createUser] Setting companyId for ${role}: ${finalCompanyId}`);
      }

      // Validate and add Sales Person specific fields
      if (role === 'Sales Person') {
        // Only phone is required for Sales Person (validated above in userData)
        if (!phone) {
          throw new Error('Phone number is required for Sales Person');
        }
        
        if (salesPersonId) userData.salesPersonId = salesPersonId;
        if (dateOfBirth) userData.dateOfBirth = new Date(dateOfBirth);
        if (photo) userData.photo = photo;
        if (about) userData.about = about;
        // Track which Admin created this sales person
        if (context.user.role === 'Admin') {
          userData.createdByAdminId = context.user.userId;
        }
      }

      const user = await User.create(userData);
      console.log(`[createUser] ✅ User created: ${user.name} (${role}) - ID: ${user._id}`);

      // Increment user count for company (handles both Sales Person and other roles)
      if (finalCompanyId && role !== 'Super Admin') {
        console.log(`[createUser] Incrementing count for company ${finalCompanyId}, role: ${role}`);
        const { incrementUserCount } = await import('../../lib/planLimitHelpers.js');
        await incrementUserCount(finalCompanyId, role);
        
        // If Admin is linked, also add to company's adminIds array
        if (role === 'Admin') {
          console.log(`[createUser] 👤 Linking Admin to company ${finalCompanyId}...`);
          const Company = (await import('../../models/Company.js')).default;
          const company = await Company.findById(finalCompanyId);
          
          if (!company) {
            console.error(`[createUser] ❌ Company ${finalCompanyId} not found!`);
            throw new Error('Company not found');
          }
          
          await Company.findByIdAndUpdate(finalCompanyId, {
            $addToSet: { adminIds: user._id }, // Add to array if not already present
            $set: { 
              adminId: company?.adminId || user._id, // Set as primary if no primary admin
              updatedAt: new Date() 
            },
          });
          
          console.log(`[createUser] ✅ Admin added to company.adminIds array`);
          console.log(`[createUser] Primary adminId: ${company?.adminId || user._id}`);
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
        salesPersonId: user.salesPersonId || null,
        dateOfBirth: user.dateOfBirth?.toISOString() || null,
        photo: user.photo || null,
        about: user.about || null,
        createdByAdminId: user.createdByAdminId?.toString() || null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },

    updateUser: async (_, { id, name, email, password, role, phone, address, status, companyId, salesPersonId, dateOfBirth, photo, about }, context) => {
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
        // Admin can only edit users from their own company
        if (context.user.companyId && 
            targetUser.companyId?.toString() !== context.user.companyId) {
          throw new Error('Not authorized to edit users from other companies');
        }
        // Admin can edit itself and others from same company (except Super Admin)
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
      
      // Sales Person specific fields
      if (salesPersonId !== undefined) updateData.salesPersonId = salesPersonId;
      if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
      if (photo !== undefined) updateData.photo = photo;
      if (about !== undefined) updateData.about = about;
      
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
        salesPersonId: user.salesPersonId || null,
        dateOfBirth: user.dateOfBirth?.toISOString() || null,
        photo: user.photo || null,
        about: user.about || null,
        createdByAdminId: user.createdByAdminId?.toString() || null,
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
        // Admin can only delete users from their own company
        if (context.user.companyId && 
            targetUser.companyId?.toString() !== context.user.companyId) {
          throw new Error('Not authorized to delete users from other companies');
        }
        // Admin can delete others from same company (except Super Admin)
      }
      // Customer cannot delete anyone
      else if (currentUserRole === 'Customer') {
        throw new Error('Not authorized to delete users');
      }
      else {
        throw new Error('Not authorized to delete users');
      }

      // Store user data before deletion for count decrement
      const userCompanyId = targetUser.companyId;
      const userRole = targetUser.role;

      const user = await User.findByIdAndDelete(id);

      if (!user) {
        throw new Error('User not found');
      }

      // Decrement user count for company
      if (userCompanyId && userRole !== 'Super Admin') {
        const { decrementUserCount } = await import('../../lib/planLimitHelpers.js');
        await decrementUserCount(userCompanyId.toString(), userRole);
      }

      return {
        success: true,
        message: 'User deleted successfully',
      };
    },

    fixSalesPersonCompanyLinks: async (_, __, context) => {
      await connectDB();

      // Check authentication - only Super Admin
      if (!context.user || context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Super Admin access required.');
      }

      // Find all Sales Persons without companyId
      const salesPersonsWithoutCompany = await User.find({
        role: 'Sales Person',
        $or: [
          { companyId: null },
          { companyId: { $exists: false } }
        ]
      });

      console.log(`[Fix] Found ${salesPersonsWithoutCompany.length} sales persons without company`);

      let fixed = 0;
      const details = [];

      for (const salesPerson of salesPersonsWithoutCompany) {
        try {
          // Try to find company by createdByAdminId
          if (salesPerson.createdByAdminId) {
            const admin = await User.findById(salesPerson.createdByAdminId);
            if (admin && admin.companyId) {
              await User.findByIdAndUpdate(salesPerson._id, {
                companyId: admin.companyId
              });
              fixed++;
              details.push(`Fixed ${salesPerson.name} (${salesPerson.email}) - linked to admin's company`);
              console.log(`[Fix] Linked ${salesPerson.name} to company ${admin.companyId}`);
            } else {
              details.push(`Could not fix ${salesPerson.name} - admin has no company`);
            }
          } else {
            details.push(`Could not fix ${salesPerson.name} - no createdByAdminId`);
          }
        } catch (error) {
          details.push(`Error fixing ${salesPerson.name}: ${error.message}`);
          console.error(`[Fix] Error:`, error);
        }
      }

      return {
        success: true,
        message: `Fixed ${fixed} out of ${salesPersonsWithoutCompany.length} sales persons`,
        fixed,
        details,
      };
    },
  },
};


