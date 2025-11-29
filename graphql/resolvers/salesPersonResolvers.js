import connectDB from '../../lib/mongodb.js';
import SalesPerson from '../../models/SalesPerson.js';
import User from '../../models/User.js';
import Company from '../../models/Company.js';
import Plan from '../../models/Plan.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Helper function to generate JWT token for sales person
const generateSalesPersonToken = (salesPerson) => {
  return jwt.sign(
    { 
      salesPersonId: salesPerson._id.toString(), 
      email: salesPerson.email, 
      role: 'Sales Person',
      type: 'salesPerson' // Add type to distinguish from regular users
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const salesPersonResolvers = {
  Query: {
    getSalesPersons: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Build query based on user role
      let query = {};
      
      if (context.user.role === 'Super Admin') {
        // Super Admin can see all sales persons
        query = {};
      } else if (context.user.role === 'Admin' || context.user.role === 'Sales Person' || context.user.type === 'salesPerson') {
        // Admin and Sales Person can only see their company's sales persons
        if (context.user.companyId) {
          query = { companyId: context.user.companyId };
        } else {
          // If no company, return empty
          return [];
        }
      } else {
        throw new Error('Not authorized to view sales persons');
      }

      const salesPersons = await SalesPerson.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      return salesPersons.map(sp => ({
        ...sp,
        id: sp._id.toString(),
        dateOfBirth: sp.dateOfBirth?.toISOString() || new Date().toISOString(),
        createdAt: sp.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: sp.updatedAt?.toISOString() || new Date().toISOString(),
      }));
    },

    getSalesPerson: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const salesPerson = await SalesPerson.findById(id)
        .populate('createdBy', 'name email')
        .lean();

      if (!salesPerson) {
        throw new Error('Sales person not found');
      }

      return {
        ...salesPerson,
        id: salesPerson._id.toString(),
        dateOfBirth: salesPerson.dateOfBirth?.toISOString() || new Date().toISOString(),
        createdAt: salesPerson.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: salesPerson.updatedAt?.toISOString() || new Date().toISOString(),
      };
    },

    getSalesPersonByEmail: async (_, { email }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const salesPerson = await SalesPerson.findOne({ email: email.toLowerCase() })
        .populate('createdBy', 'name email')
        .lean();

      if (!salesPerson) {
        return null;
      }

      return {
        ...salesPerson,
        id: salesPerson._id.toString(),
        dateOfBirth: salesPerson.dateOfBirth?.toISOString() || new Date().toISOString(),
        createdAt: salesPerson.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: salesPerson.updatedAt?.toISOString() || new Date().toISOString(),
      };
    },

    getCurrentSalesPerson: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Check if user is a sales person (from token)
      if (context.user.type !== 'salesPerson' && context.user.role !== 'Sales Person') {
        throw new Error('Not a sales person');
      }

      // Get sales person by email from token or by salesPersonId (which is _id in token)
      let salesPerson = null;
      if (context.user.email) {
        salesPerson = await SalesPerson.findOne({ email: context.user.email.toLowerCase() })
          .populate('createdBy', 'name email')
          .lean();
      } else if (context.user.salesPersonId) {
        // salesPersonId in token is actually the sales person _id
        salesPerson = await SalesPerson.findById(context.user.salesPersonId)
          .populate('createdBy', 'name email')
          .lean();
      } else if (context.user.userId) {
        // Fallback: userId might be used in some cases
        salesPerson = await SalesPerson.findById(context.user.userId)
          .populate('createdBy', 'name email')
          .lean();
      }

      if (!salesPerson) {
        throw new Error('Sales person not found');
      }

      // Check if Sales Person role is enabled for their company
      if (salesPerson.companyName) {
        const company = await Company.findOne({ name: salesPerson.companyName }).lean();
        if (company) {
          const enabledRoles = company.enabledRoles || ['Admin', 'Customer', 'Sales Person'];
          if (!enabledRoles.includes('Sales Person')) {
            throw new Error('Your Sales Person role has been disabled for this company. Please contact your administrator.');
          }
        }
      }

      return {
        ...salesPerson,
        id: salesPerson._id.toString(),
        dateOfBirth: salesPerson.dateOfBirth?.toISOString() || new Date().toISOString(),
        createdAt: salesPerson.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: salesPerson.updatedAt?.toISOString() || new Date().toISOString(),
      };
    },
  },

  Mutation: {
    createSalesPerson: async (_, { input }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can create sales persons
      if (!['Super Admin'].includes(context.user.role)) {
        throw new Error('Not authorized to create sales persons');
      }

      // Check if email already exists
      const existingEmail = await SalesPerson.findOne({ email: input.email.toLowerCase() });
      if (existingEmail) {
        throw new Error('Email already exists');
      }

      // Check company sales person limit
      if (input.companyName) {
        const company = await Company.findOne({ name: input.companyName.trim() });
        if (company) {
          // Get the plan to check limits
          const plan = await Plan.findById(company.planId);
          if (plan) {
            // Check if plan is "Basic" (case-insensitive) or has salesPersonLimit of 5
            const isBasicPlan = plan.name.toLowerCase() === 'basic' || plan.salesPersonLimit === 5;
            const salesPersonLimit = plan.salesPersonLimit || company.planLimits?.salesPersonLimit || 0;
            
            // Count existing active sales persons for this company
            const existingSalesPersonsCount = await SalesPerson.countDocuments({ 
              companyName: input.companyName.trim(),
              status: 'Active'
            });
            
            // Check if adding one more would exceed the limit
            if (existingSalesPersonsCount >= salesPersonLimit) {
              throw new Error(
                `Cannot add more sales persons. The company "${input.companyName}" has reached the limit of ${salesPersonLimit} sales person${salesPersonLimit > 1 ? 's' : ''} for the ${plan.name} plan. Please upgrade the plan to add more sales persons.`
              );
            }
          }
        }
      }

      // Generate salesPersonId if not provided
      let generatedSalesPersonId = input.salesPersonId;
      if (!generatedSalesPersonId) {
        const lastSalesPerson = await SalesPerson.findOne({}, {}, { sort: { 'createdAt': -1 } });
        let nextId = 1;
        if (lastSalesPerson && lastSalesPerson.salesPersonId) {
          const lastIdNum = parseInt(lastSalesPerson.salesPersonId.split('-')[1]);
          if (!isNaN(lastIdNum)) {
            nextId = lastIdNum + 1;
          }
        }
        generatedSalesPersonId = `SP-${String(nextId).padStart(4, '0')}`;
        
        // Check if generated ID already exists (shouldn't happen, but safety check)
        const existingId = await SalesPerson.findOne({ salesPersonId: generatedSalesPersonId });
        if (existingId) {
          // If conflict, try next number
          let conflictId = nextId + 1;
          while (true) {
            const testId = `SP-${String(conflictId).padStart(4, '0')}`;
            const conflictCheck = await SalesPerson.findOne({ salesPersonId: testId });
            if (!conflictCheck) {
              generatedSalesPersonId = testId;
              break;
            }
            conflictId++;
          }
        }
      } else {
        // Check if provided salesPersonId already exists
        const existingId = await SalesPerson.findOne({ salesPersonId: input.salesPersonId.toUpperCase() });
        if (existingId) {
          throw new Error('Sales Person ID already exists');
        }
        generatedSalesPersonId = input.salesPersonId.toUpperCase();
      }

      // Get companyId from the creator (admin)
      let companyId = null;
      if (context.user.companyId) {
        companyId = context.user.companyId;
      } else if (context.user.role === 'Admin') {
        // If admin doesn't have companyId, fetch from User model
        const adminUser = await User.findById(context.user.userId || context.user.id);
        if (adminUser && adminUser.companyId) {
          companyId = adminUser.companyId;
        }
      }

      const salesPersonData = {
        ...input,
        email: input.email.toLowerCase(),
        password: input.password, // Password will be hashed by pre-save hook
        salesPersonId: generatedSalesPersonId,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : new Date(),
        createdBy: context.user.userId || context.user.id,
        companyId: companyId, // Add company association
        status: input.status || 'Active',
      };

      const salesPerson = new SalesPerson(salesPersonData);
      await salesPerson.save();

      // Update company's sales person count if company exists
      if (input.companyName) {
        const company = await Company.findOne({ name: input.companyName.trim() });
        if (company) {
          company.currentUsage.salesPersonCount = (company.currentUsage.salesPersonCount || 0) + 1;
          await company.save();
        }
      }

      const savedSalesPerson = await SalesPerson.findById(salesPerson._id)
        .populate('createdBy', 'name email')
        .lean();

      return {
        ...savedSalesPerson,
        id: savedSalesPerson._id.toString(),
        dateOfBirth: savedSalesPerson.dateOfBirth?.toISOString() || new Date().toISOString(),
        createdAt: savedSalesPerson.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: savedSalesPerson.updatedAt?.toISOString() || new Date().toISOString(),
      };
    },

    updateSalesPerson: async (_, { id, input }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can update sales persons
      if (!['Super Admin'].includes(context.user.role)) {
        throw new Error('Not authorized to update sales persons');
      }

      const existingSalesPerson = await SalesPerson.findById(id);
      
      if (!existingSalesPerson) {
        throw new Error('Sales person not found');
      }

      // Check if email is being changed and if new email already exists
      if (input.email && input.email.toLowerCase() !== existingSalesPerson.email) {
        const existingEmail = await SalesPerson.findOne({ email: input.email.toLowerCase() });
        if (existingEmail) {
          throw new Error('Email already exists');
        }
      }

      // Check if salesPersonId is being changed and if new ID already exists
      if (input.salesPersonId && input.salesPersonId.toUpperCase() !== existingSalesPerson.salesPersonId) {
        const existingId = await SalesPerson.findOne({ salesPersonId: input.salesPersonId.toUpperCase() });
        if (existingId) {
          throw new Error('Sales Person ID already exists');
        }
      }

      const updateData = {
        ...input,
        email: input.email ? input.email.toLowerCase() : existingSalesPerson.email,
        salesPersonId: input.salesPersonId ? input.salesPersonId.toUpperCase() : existingSalesPerson.salesPersonId,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : existingSalesPerson.dateOfBirth,
      };
      
      // Handle password update - only include if provided and not already hashed
      if (input.password) {
        // Check if password is already hashed (bcrypt hashes are 60 chars)
        // If less than 50 chars, it's likely plain text and needs hashing
        if (input.password.length < 50) {
          // Password is plain text, will be hashed by pre-save hook
          updateData.password = input.password;
        } else {
          // Password appears to be already hashed, use as is
          updateData.password = input.password;
        }
      } else {
        // Don't include password in update if not provided
        delete updateData.password;
      }

      // Handle status changes - update company count if status changes
      if (input.status && input.status !== existingSalesPerson.status) {
        const company = await Company.findOne({ name: existingSalesPerson.companyName?.trim() });
        if (company) {
          if (existingSalesPerson.status === 'Active' && input.status === 'Inactive') {
            // Decrement count when changing from Active to Inactive
            company.currentUsage.salesPersonCount = Math.max(0, (company.currentUsage.salesPersonCount || 0) - 1);
            await company.save();
          } else if (existingSalesPerson.status === 'Inactive' && input.status === 'Active') {
            // Check limit before incrementing when changing from Inactive to Active
            const plan = await Plan.findById(company.planId);
            if (plan) {
              const salesPersonLimit = plan.salesPersonLimit || company.planLimits?.salesPersonLimit || 0;
              const currentCount = await SalesPerson.countDocuments({ 
                companyName: existingSalesPerson.companyName?.trim(),
                status: 'Active',
                _id: { $ne: id } // Exclude current sales person
              });
              
              if (currentCount >= salesPersonLimit) {
                throw new Error(
                  `Cannot activate sales person. The company "${existingSalesPerson.companyName}" has reached the limit of ${salesPersonLimit} sales person${salesPersonLimit > 1 ? 's' : ''} for the ${plan.name} plan.`
                );
              }
              
              // Increment count when changing from Inactive to Active
              company.currentUsage.salesPersonCount = (company.currentUsage.salesPersonCount || 0) + 1;
              await company.save();
            }
          }
        }
      }

      const salesPerson = await SalesPerson.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('createdBy', 'name email')
        .lean();

      return {
        ...salesPerson,
        id: salesPerson._id.toString(),
        dateOfBirth: salesPerson.dateOfBirth?.toISOString() || new Date().toISOString(),
        createdAt: salesPerson.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: salesPerson.updatedAt?.toISOString() || new Date().toISOString(),
      };
    },

    deleteSalesPerson: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can delete sales persons
      if (!['Super Admin'].includes(context.user.role)) {
        throw new Error('Not authorized to delete sales persons');
      }

      const salesPerson = await SalesPerson.findById(id);
      
      if (!salesPerson) {
        throw new Error('Sales person not found');
      }

      // Decrement company's sales person count if sales person was active
      if (salesPerson.status === 'Active' && salesPerson.companyName) {
        const company = await Company.findOne({ name: salesPerson.companyName.trim() });
        if (company) {
          company.currentUsage.salesPersonCount = Math.max(0, (company.currentUsage.salesPersonCount || 0) - 1);
          await company.save();
        }
      }

      await SalesPerson.findByIdAndDelete(id);

      return {
        success: true,
        message: 'Sales person deleted successfully',
      };
    },

    salesPersonLogin: async (_, { email, password }) => {
      await connectDB();

      // Find sales person with password field
      const salesPerson = await SalesPerson.findOne({ email: email.toLowerCase() }).select('+password');
      
      if (!salesPerson) {
        throw new Error('Invalid email or password');
      }

      // Check if sales person is active
      if (salesPerson.status !== 'Active') {
        throw new Error('Account is inactive. Please contact administrator.');
      }

      // Check if Sales Person has a company assigned
      if (!salesPerson.companyId) {
        throw new Error('Access Denied: Sales Person account is not associated with any company. Please contact your administrator.');
      }

      // Verify password - check if method exists, if not use bcrypt directly
      let isPasswordValid = false;
      if (typeof salesPerson.comparePassword === 'function') {
        isPasswordValid = await salesPerson.comparePassword(password);
      } else {
        // Fallback: use bcrypt directly if method is not available
        if (!salesPerson.password) {
          throw new Error('Invalid email or password');
        }
        isPasswordValid = await bcrypt.compare(password, salesPerson.password);
      }
      
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Generate token
      const token = generateSalesPersonToken(salesPerson);

      // Get sales person data without password
      const salesPersonData = await SalesPerson.findById(salesPerson._id)
        .populate('createdBy', 'name email')
        .lean();

      return {
        token,
        salesPerson: {
          ...salesPersonData,
          id: salesPersonData._id.toString(),
          dateOfBirth: salesPersonData.dateOfBirth?.toISOString() || new Date().toISOString(),
          createdAt: salesPersonData.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: salesPersonData.updatedAt?.toISOString() || new Date().toISOString(),
        },
      };
    },
  },

  SalesPerson: {
    createdBy: async (parent) => {
      if (parent.createdBy && typeof parent.createdBy === 'object') {
        return {
          id: parent.createdBy._id?.toString() || parent.createdBy.id,
          name: parent.createdBy.name,
          email: parent.createdBy.email,
        };
      }
      if (parent.createdBy) {
        const user = await User.findById(parent.createdBy).lean();
        if (user) {
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
          };
        }
      }
      return null;
    },
  },
};

