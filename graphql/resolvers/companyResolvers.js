import connectDB from '../../lib/mongodb.js';
import Company from '../../models/Company.js';
import User from '../../models/User.js';
import Plan from '../../models/Plan.js';
import Quotation from '../../models/Quotation.js';
import { SIDEBAR_CONFIG, ROLES } from '../../config/navigation.config.js';
import mongoose from 'mongoose';

export const companyResolvers = {
  Query: {
    getCompanies: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can view all companies
      if (context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Super Admin access required.');
      }

      const companies = await Company.find().sort({ createdAt: -1 });
      
      return companies.map(company => ({
        id: company._id.toString(),
        name: company.name,
        email: company.email,
        phone: company.phone || '',
        address: company.address || '',
        website: company.website || '',
        industry: company.industry || '',
        adminId: company.adminId ? company.adminId.toString() : null,
        adminIds: company.adminIds ? company.adminIds.map(id => id.toString()) : [],
        planId: company.planId ? company.planId.toString() : null,
        planLimits: company.planLimits || {
          salesPersonLimit: 0,
          quotationLimit: 0,
          usersLimit: 0,
        },
        currentUsage: company.currentUsage || {
          salesPersonCount: 0,
          quotationCount: 0,
          usersCount: 0,
        },
        status: company.status,
        logo: company.logo || '',
        description: company.description || '',
        enabledRoles: company.enabledRoles || ['Admin', 'Customer', 'Sales Person'],
        sidebarModules: getSidebarModulesForCompany(company),
        createdAt: company.createdAt ? company.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: company.updatedAt ? company.updatedAt.toISOString() : new Date().toISOString(),
      }));
    },

    getCompany: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const company = await Company.findById(id);
      if (!company) {
        throw new Error('Company not found');
      }

      // Authorization check: Super Admin can view any company, Admin can only view their own company
      if (context.user.role !== 'Super Admin') {
        const userCompanyId = context.user.companyId;
        const requestedCompanyId = id.toString();
        
        // Check if user's companyId matches the requested company ID
        if (!userCompanyId || userCompanyId.toString() !== requestedCompanyId) {
          throw new Error('Not authorized to view this company');
        }
      }

      return {
        id: company._id.toString(),
        name: company.name,
        email: company.email,
        phone: company.phone || '',
        address: company.address || '',
        website: company.website || '',
        industry: company.industry || '',
        adminId: company.adminId ? company.adminId.toString() : null,
        adminIds: company.adminIds ? company.adminIds.map(id => id.toString()) : [],
        planId: company.planId ? company.planId.toString() : null,
        planLimits: company.planLimits || {
          salesPersonLimit: 0,
          quotationLimit: 0,
          usersLimit: 0,
        },
        currentUsage: company.currentUsage || {
          salesPersonCount: 0,
          quotationCount: 0,
          usersCount: 0,
        },
        status: company.status,
        logo: company.logo || '',
        description: company.description || '',
        enabledRoles: (company.enabledRoles && Array.isArray(company.enabledRoles) && company.enabledRoles.length > 0) 
          ? company.enabledRoles 
          : ['Admin', 'Customer', 'Sales Person'], // Ensure non-null array
        sidebarModules: getSidebarModulesForCompany(company) || [], // Ensure non-null array
        createdAt: company.createdAt ? company.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: company.updatedAt ? company.updatedAt.toISOString() : new Date().toISOString(),
      };
    },

    checkCompanyLimit: async (_, { companyId, limitType }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      if (limitType === 'salesPerson') {
        return company.currentUsage.salesPersonCount < company.planLimits.salesPersonLimit;
      } else if (limitType === 'quotation') {
        return company.currentUsage.quotationCount < company.planLimits.quotationLimit;
      } else if (limitType === 'users') {
        return company.currentUsage.usersCount < company.planLimits.usersLimit;
      }

      return false;
    },

    getCompanyControlData: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can view control data
      if (context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Super Admin access required.');
      }

      const companies = await Company.find().sort({ createdAt: -1 });
      const result = [];

      for (const company of companies) {
        // Get all ADMIN users for this company (exclude Sales Persons and Customers)
        const users = await User.find({ 
          companyId: company._id,
          role: 'Admin' // Only Admins, NOT Sales Persons or Customers
        }).lean();
        
        // Get all sales persons for this company
        const salesPersons = await User.find({ 
          role: 'Sales Person',
          companyId: company._id 
        }).lean();

        // Get all unique customers from quotations created by this company's sales persons
        const salesPersonIds = salesPersons.map(sp => sp.salesPersonId);
        const quotations = await Quotation.find({
          'from.salesPersonId': { $in: salesPersonIds }
        }).lean();

        // Extract unique customers
        const customerMap = new Map();
        quotations.forEach(quotation => {
          const customerKey = quotation.to.businessName + (quotation.to.email || '');
          if (!customerMap.has(customerKey)) {
            customerMap.set(customerKey, {
              businessName: quotation.to.businessName,
              email: quotation.to.email || '',
              phone: quotation.to.phone || '',
              address: quotation.to.address || '',
              quotationCount: 0,
              lastQuotationDate: null,
            });
          }
          const customer = customerMap.get(customerKey);
          customer.quotationCount++;
          const quoteDate = new Date(quotation.quotationDate);
          if (!customer.lastQuotationDate || quoteDate > new Date(customer.lastQuotationDate)) {
            customer.lastQuotationDate = quotation.quotationDate.toISOString();
          }
        });

        const customers = Array.from(customerMap.values());

        result.push({
          company: {
            id: company._id.toString(),
            name: company.name,
            email: company.email,
            phone: company.phone || '',
            address: company.address || '',
            website: company.website || '',
            industry: company.industry || '',
            adminId: company.adminId ? company.adminId.toString() : null,
            adminIds: company.adminIds ? company.adminIds.map(id => id.toString()) : [],
            planId: company.planId ? company.planId.toString() : null,
            planLimits: company.planLimits || {
              salesPersonLimit: 0,
              quotationLimit: 0,
              usersLimit: 0,
            },
            currentUsage: company.currentUsage || {
              salesPersonCount: 0,
              quotationCount: 0,
              usersCount: 0,
            },
            status: company.status,
            logo: company.logo || '',
            description: company.description || '',
            enabledRoles: company.enabledRoles || ['Admin', 'Customer', 'Sales Person'],
            sidebarModules: getSidebarModulesForCompany(company),
            createdAt: company.createdAt.toISOString(),
            updatedAt: company.updatedAt.toISOString(),
          },
          users: users.map(user => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone || '',
            address: user.address || '',
            status: user.status,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          })),
          salesPersons: salesPersons.map(sp => ({
            id: sp._id.toString(),
            name: sp.name,
            email: sp.email,
            phone: sp.phone,
            salesPersonId: sp.salesPersonId,
            role: sp.role,
            companyName: sp.companyName,
            address: sp.address,
            photo: sp.photo || '',
            status: sp.status,
            createdAt: sp.createdAt.toISOString(),
            updatedAt: sp.updatedAt.toISOString(),
          })),
          customers,
        });
      }

      return result;
    },
  },

  Company: {
    admin: async (parent) => {
      await connectDB();
      
      // First try primary adminId
      let adminId = parent.adminId;
      
      // If no primary admin, get first from adminIds array
      if (!adminId && parent.adminIds && parent.adminIds.length > 0) {
        adminId = parent.adminIds[0];
        console.log(`[Company.admin] No primary adminId, using first from adminIds: ${adminId}`);
      }
      
      if (!adminId) {
        console.log(`[Company.admin] No admin found for company ${parent._id}`);
        return null;
      }
      
      const admin = await User.findById(adminId);
      if (!admin) {
        console.log(`[Company.admin] Admin ${adminId} not found in database`);
        return null;
      }
      
      console.log(`[Company.admin] Returning admin: ${admin.name} (${admin.email})`);
      return {
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        role: admin.role,
        phone: admin.phone || '',
        address: admin.address || '',
        status: admin.status,
        createdAt: admin.createdAt.toISOString(),
        updatedAt: admin.updatedAt.toISOString(),
      };
    },

    plan: async (parent) => {
      await connectDB();
      if (!parent.planId) return null;
      
      const plan = await Plan.findById(parent.planId);
      if (!plan) return null;
      
      return {
        id: plan._id.toString(),
        name: plan.name,
        description: plan.description || '',
        price: plan.price,
        billingCycle: plan.billingCycle,
        usersLimit: plan.usersLimit,
        salesPersonLimit: plan.salesPersonLimit,
        quotationLimit: plan.quotationLimit,
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

    userCount: async (parent) => {
      await connectDB();
      // Return the current usage count
      return parent.currentUsage?.usersCount || 0;
    },
  },

  Mutation: {
    createCompany: async (_, args, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can create companies
      if (context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Super Admin access required.');
      }

      // Handle adminIds (multiple admins) or adminId (single admin for backward compatibility)
      const adminIds = args.adminIds && args.adminIds.length > 0 
        ? args.adminIds 
        : (args.adminId ? [args.adminId] : []);

      // Verify all admins exist and have Admin role
      // Also check which admins already have a company (to avoid double counting)
      let newAdminCount = 0;
      if (adminIds.length > 0) {
        for (const adminId of adminIds) {
          const admin = await User.findById(adminId);
          if (!admin) {
            throw new Error(`Admin user with ID ${adminId} not found`);
          }
          if (admin.role !== 'Admin') {
            throw new Error(`User ${admin.name} must have Admin role`);
          }
          // Count only admins that don't already have a company
          if (!admin.companyId) {
            newAdminCount++;
          }
        }
      }
      
      // Set primary adminId (first one) for backward compatibility
      const primaryAdminId = adminIds.length > 0 ? adminIds[0] : null;

      // Verify plan exists and fetch its limits
      const plan = await Plan.findById(args.planId);
      if (!plan) {
        throw new Error('Selected plan not found');
      }
      if (plan.status !== 'Active') {
        throw new Error('Selected plan is not active');
      }

      // Check if number of new admins exceeds plan limit
      if (newAdminCount > 0 && newAdminCount > plan.usersLimit) {
        throw new Error(
          `Cannot create company. The selected plan allows only ${plan.usersLimit} user${plan.usersLimit > 1 ? 's' : ''}, ` +
          `but you are trying to link ${newAdminCount} new Admin${newAdminCount > 1 ? 's' : ''}. ` +
          `Please select a plan with a higher user limit or link fewer Admins.`
        );
      }

      // Create company with plan limits
      const company = await Company.create({
        ...args,
        adminId: primaryAdminId, // Primary admin for backward compatibility
        adminIds: adminIds, // Array of all admins
        planLimits: {
          salesPersonLimit: plan.salesPersonLimit,
          quotationLimit: plan.quotationLimit,
          usersLimit: plan.usersLimit,
        },
        currentUsage: {
          salesPersonCount: 0,
          quotationCount: 0,
          usersCount: newAdminCount || (adminIds.length > 0 ? adminIds.length : 1), // Count of new admins or total admins or 1
        },
      });

      // Link the company to all selected Admin users
      // Note: usersCount is already set correctly above based on newAdminCount
      if (adminIds.length > 0) {
        console.log(`[createCompany] Linking ${adminIds.length} admin(s) to new company`);
        
        // Get admins that already have a company (to update old company counts)
        const adminsWithCompany = await User.find({
          _id: { $in: adminIds },
          companyId: { $exists: true, $ne: null }
        }).select('companyId');
        
        console.log(`[createCompany] Found ${adminsWithCompany.length} admin(s) with existing company`);
        
        // Decrement user count from old companies - FIX: Count by company
        const oldCompanyIds = [...new Set(adminsWithCompany.map(admin => admin.companyId?.toString()).filter(Boolean))];
        if (oldCompanyIds.length > 0) {
          // Count how many admins are being removed from each old company
          const companyCountMap = {};
          adminsWithCompany.forEach(admin => {
            const compId = admin.companyId.toString();
            companyCountMap[compId] = (companyCountMap[compId] || 0) + 1;
          });

          // Decrement each company by the correct count
          for (const [compId, count] of Object.entries(companyCountMap)) {
            await Company.findByIdAndUpdate(compId, {
              $inc: { 'currentUsage.usersCount': -count },
              updatedAt: new Date(),
            });
            console.log(`[createCompany] Decremented ${count} admin(s) from old company ${compId}`);
          }
          
          // Remove from old companies' adminIds arrays
          for (const admin of adminsWithCompany) {
            if (admin.companyId) {
              await Company.findByIdAndUpdate(admin.companyId, {
                $pull: { adminIds: admin._id },
                updatedAt: new Date(),
              });
            }
          }
        }
        
        // Update all admins to link to this new company
        console.log(`[createCompany] Updating ${adminIds.length} admin(s) with companyId: ${company._id}`);
        const updateResult = await User.updateMany(
          { _id: { $in: adminIds } },
          {
            $set: {
              companyId: company._id,
              updatedAt: new Date(),
            },
          }
        );
        console.log(`[createCompany] Updated ${updateResult.modifiedCount} admin records`);
        
        // Update adminIds array in new company for all admins
        await Company.findByIdAndUpdate(company._id, {
          $set: { 
            adminIds: adminIds.map(id => id),
            updatedAt: new Date() 
          },
        });
        
        console.log(`[createCompany] Successfully linked all admins to company`);
      }

      // Update plan subscription count
      await Plan.findByIdAndUpdate(args.planId, {
        $inc: { subscriptionCount: 1 },
      });

      return {
        id: company._id.toString(),
        name: company.name,
        email: company.email,
        phone: company.phone || '',
        address: company.address || '',
        website: company.website || '',
        industry: company.industry || '',
        adminId: company.adminId ? company.adminId.toString() : null,
        adminIds: company.adminIds ? company.adminIds.map(id => id.toString()) : [],
        planId: company.planId ? company.planId.toString() : null,
        planLimits: company.planLimits,
        currentUsage: company.currentUsage,
        status: company.status,
        logo: company.logo || '',
        description: company.description || '',
        enabledRoles: company.enabledRoles || ['Admin', 'Customer', 'Sales Person'],
        sidebarModules: getSidebarModulesForCompany(company),
        createdAt: company.createdAt ? company.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: company.updatedAt ? company.updatedAt.toISOString() : new Date().toISOString(),
      };
    },

    updateCompany: async (_, { id, ...updates }, context) => {
      await connectDB();
      
      console.log(`[updateCompany] ===== START =====`);
      console.log(`[updateCompany] Company ID:`, id);
      console.log(`[updateCompany] Updates received:`, {
        ...updates,
        adminIds: updates.adminIds || 'not provided',
        adminId: updates.adminId || 'not provided'
      });
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Get the old company first to compare admin changes
      const oldCompany = await Company.findById(id);
      if (!oldCompany) {
        throw new Error('Company not found');
      }

      console.log(`[updateCompany] Old company adminIds:`, oldCompany.adminIds?.map(id => id.toString()));
      console.log(`[updateCompany] Old company adminId:`, oldCompany.adminId?.toString());

      // Check if user is Admin trying to update their own company
      const isAdmin = context.user.role === 'Admin';
      const userCompanyId = context.user.companyId?.toString();
      const companyIdStr = oldCompany._id.toString();
      const isOwnCompany = isAdmin && userCompanyId === companyIdStr;

      // Only Super Admin can update company details
      // Notes and Terms are managed separately via NotesAndTerms table
      if (context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Super Admin access required.');
      }

      // Handle adminIds (multiple admins) or adminId (single admin for backward compatibility)
      const newAdminIds = updates.adminIds && updates.adminIds.length > 0 
        ? updates.adminIds 
        : (updates.adminId ? [updates.adminId] : null);
      
      console.log(`[updateCompany] New adminIds to assign:`, newAdminIds);

      // If admins are being updated
      if (newAdminIds !== null) {
        // Verify all admins exist and have Admin role
        for (const adminId of newAdminIds) {
          const admin = await User.findById(adminId);
          if (!admin) {
            throw new Error(`Admin user with ID ${adminId} not found`);
          }
          if (admin.role !== 'Admin') {
            throw new Error(`User ${admin.name} must have Admin role`);
          }
        }

        // Get old admin IDs (from adminIds array or adminId) - convert to strings for comparison
        const oldAdminIds = oldCompany.adminIds && oldCompany.adminIds.length > 0
          ? oldCompany.adminIds.map(id => id.toString())
          : (oldCompany.adminId ? [oldCompany.adminId.toString()] : []);

        // Convert new admin IDs to strings for comparison
        const newAdminIdsStr = newAdminIds.map(id => id.toString());

        // Find admins to unlink (in old but not in new)
        const adminsToUnlink = oldAdminIds.filter(oldId => !newAdminIdsStr.includes(oldId));
        
        // Find admins to link (in new but not in old)
        const adminsToLink = newAdminIdsStr.filter(newId => !oldAdminIds.includes(newId));
        
        console.log(`[updateCompany] Admins to unlink:`, adminsToUnlink);
        console.log(`[updateCompany] Admins to link:`, adminsToLink);

        // Unlink admins that are no longer in the list
        if (adminsToUnlink.length > 0) {
          const adminIdsToUnlinkObj = adminsToUnlink.map(adminId => new mongoose.Types.ObjectId(adminId));
          await User.updateMany(
            { _id: { $in: adminIdsToUnlinkObj } },
            {
              $set: {
                companyId: null,
                updatedAt: new Date(),
              },
            }
          );

          // Decrement user count from this company
          // Convert string IDs to ObjectIds for $pull
          const adminIdsToRemove = adminsToUnlink.map(adminId => new mongoose.Types.ObjectId(adminId));
          await Company.findByIdAndUpdate(id, {
            $inc: { 'currentUsage.usersCount': -adminsToUnlink.length },
            $pull: { adminIds: { $in: adminIdsToRemove } },
            updatedAt: new Date(),
          });
        }

        // Link new admins
        if (adminsToLink.length > 0) {
          // Check which admins already have a company (to update old company counts)
          const adminIdsToLinkObj = adminsToLink.map(adminId => new mongoose.Types.ObjectId(adminId));
          const adminsWithCompany = await User.find({
            _id: { $in: adminIdsToLinkObj },
            companyId: { $exists: true, $ne: null }
          }).select('companyId');

          // Decrement user count from old companies - FIX: Count by company
          const oldCompanyIds = [...new Set(adminsWithCompany.map(admin => admin.companyId?.toString()).filter(Boolean))];
          if (oldCompanyIds.length > 0) {
            // Count how many admins are being removed from each old company
            const companyCountMap = {};
            adminsWithCompany.forEach(admin => {
              const compId = admin.companyId.toString();
              companyCountMap[compId] = (companyCountMap[compId] || 0) + 1;
            });

            // Decrement each company by the correct count
            for (const [compId, count] of Object.entries(companyCountMap)) {
              await Company.findByIdAndUpdate(compId, {
                $inc: { 'currentUsage.usersCount': -count },
                updatedAt: new Date(),
              });
              console.log(`[updateCompany] Decremented ${count} admin(s) from company ${compId}`);
            }

            // Remove from old companies' adminIds arrays
            for (const admin of adminsWithCompany) {
              if (admin.companyId) {
                await Company.findByIdAndUpdate(admin.companyId, {
                  $pull: { adminIds: admin._id },
                  updatedAt: new Date(),
                });
              }
            }
          }

          // Link new admins to this company
          console.log(`[updateCompany] Linking ${adminsToLink.length} new admin(s) to company ${id}`);
          console.log(`[updateCompany] Admin IDs to link:`, adminsToLink);
          
          const updateResult = await User.updateMany(
            { _id: { $in: adminIdsToLinkObj } },
            {
              $set: {
                companyId: id,
                updatedAt: new Date(),
              },
            }
          );
          
          console.log(`[updateCompany] Updated ${updateResult.modifiedCount} user records with companyId`);

          // Increment user count for this company
          await Company.findByIdAndUpdate(id, {
            $inc: { 'currentUsage.usersCount': adminsToLink.length },
            $addToSet: { adminIds: { $each: adminIdsToLinkObj } },
            updatedAt: new Date(),
          });
          
          console.log(`[updateCompany] Incremented usersCount by ${adminsToLink.length}, added to adminIds array`);
        }

        // Set primary adminId (first one) for backward compatibility
        updates.adminId = newAdminIds.length > 0 ? newAdminIds[0] : null;
        // Convert to ObjectIds for storage
        updates.adminIds = newAdminIds.map(id => new mongoose.Types.ObjectId(id));
      } else if (updates.adminId !== undefined) {
        // Handle single adminId update for backward compatibility
        if (updates.adminId) {
          const admin = await User.findById(updates.adminId);
          if (!admin) {
            throw new Error('Admin user not found');
          }
          if (admin.role !== 'Admin') {
            throw new Error('Selected user must have Admin role');
          }
        }
        // If adminId is being set to null, unlink all admins
        if (!updates.adminId) {
          const oldAdminIds = oldCompany.adminIds && oldCompany.adminIds.length > 0
            ? oldCompany.adminIds.map(id => id.toString())
            : (oldCompany.adminId ? [oldCompany.adminId.toString()] : []);

          if (oldAdminIds.length > 0) {
            await User.updateMany(
              { _id: { $in: oldAdminIds } },
              {
                $set: {
                  companyId: null,
                  updatedAt: new Date(),
                },
              }
            );

            await Company.findByIdAndUpdate(id, {
              $inc: { 'currentUsage.usersCount': -oldAdminIds.length },
              $set: { adminIds: [], adminId: null },
              updatedAt: new Date(),
            });
          }
        }
      }

      // If planId is being updated, fetch new plan limits
      if (updates.planId) {
        const newPlan = await Plan.findById(updates.planId);
        
        if (!newPlan) {
          throw new Error('Selected plan not found');
        }
        if (newPlan.status !== 'Active') {
          throw new Error('Selected plan is not active');
        }

        // Update plan limits based on new plan
        updates.planLimits = {
          salesPersonLimit: newPlan.salesPersonLimit,
          quotationLimit: newPlan.quotationLimit,
          usersLimit: newPlan.usersLimit,
        };

        // Update subscription counts
        if (oldCompany.planId) {
          await Plan.findByIdAndUpdate(oldCompany.planId, {
            $inc: { subscriptionCount: -1 },
          });
        }
        await Plan.findByIdAndUpdate(updates.planId, {
          $inc: { subscriptionCount: 1 },
        });
      }

      const company = await Company.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!company) {
        throw new Error('Company not found');
      }

      return {
        id: company._id.toString(),
        name: company.name,
        email: company.email,
        phone: company.phone || '',
        address: company.address || '',
        website: company.website || '',
        industry: company.industry || '',
        adminId: company.adminId ? company.adminId.toString() : null,
        adminIds: company.adminIds ? company.adminIds.map(id => id.toString()) : [],
        planId: company.planId ? company.planId.toString() : null,
        planLimits: company.planLimits,
        currentUsage: company.currentUsage,
        status: company.status,
        logo: company.logo || '',
        description: company.description || '',
        enabledRoles: company.enabledRoles || ['Admin', 'Customer', 'Sales Person'],
        sidebarModules: getSidebarModulesForCompany(company),
        createdAt: company.createdAt ? company.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: company.updatedAt ? company.updatedAt.toISOString() : new Date().toISOString(),
      };
    },

    deleteCompany: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can delete companies
      if (context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Super Admin access required.');
      }

      // Find the company first to get its details
      const company = await Company.findById(id);
      if (!company) {
        throw new Error('Company not found');
      }

      const companyId = company._id;
      const companyName = company.name;

      // 1. Delete all Users (Admins, Customers, Sales Persons) associated with this company
      const deletedUsers = await User.deleteMany({ companyId: companyId });
      console.log(`Deleted ${deletedUsers.deletedCount} users (including sales persons) associated with company ${companyName}`);

      // 2. Get all salesPersonIds from deleted users for quotation cleanup
      const salesPersonIds = users
        .filter(u => u.role === 'Sales Person' && u.salesPersonId)
        .map(u => u.salesPersonId)
        .filter(Boolean);

      // 3. Delete all Quotations created by these Sales Persons
      let deletedQuotations = 0;
      if (salesPersonIds.length > 0) {
        const quotationResult = await Quotation.deleteMany({
          'from.salesPersonId': { $in: salesPersonIds }
        });
        deletedQuotations = quotationResult.deletedCount;
        console.log(`Deleted ${deletedQuotations} quotations associated with company ${companyName}`);
      }

      // 5. Decrement plan subscription count
      if (company.planId) {
        await Plan.findByIdAndUpdate(company.planId, {
          $inc: { subscriptionCount: -1 },
        });
      }

      // 6. Finally, delete the company itself
      await Company.findByIdAndDelete(id);

      return {
        success: true,
        message: `Company deleted successfully. Also deleted ${deletedUsers.deletedCount} user(s) (including sales persons) and ${deletedQuotations} quotation(s) associated with this company.`,
      };
    },

    updateCompanyRoles: async (_, { id, enabledRoles }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can update company roles
      if (context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Super Admin access required.');
      }

      const company = await Company.findByIdAndUpdate(
        id,
        { enabledRoles, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!company) {
        throw new Error('Company not found');
      }

      return {
        id: company._id.toString(),
        name: company.name,
        email: company.email,
        phone: company.phone || '',
        address: company.address || '',
        website: company.website || '',
        industry: company.industry || '',
        adminId: company.adminId ? company.adminId.toString() : null,
        adminIds: company.adminIds ? company.adminIds.map(id => id.toString()) : [],
        planId: company.planId ? company.planId.toString() : null,
        planLimits: company.planLimits || {
          salesPersonLimit: 0,
          quotationLimit: 0,
          usersLimit: 0,
        },
        currentUsage: company.currentUsage || {
          salesPersonCount: 0,
          quotationCount: 0,
          usersCount: 0,
        },
        status: company.status,
        logo: company.logo || '',
        description: company.description || '',
        enabledRoles: company.enabledRoles || ['Admin', 'Customer', 'Sales Person'],
        sidebarModules: getSidebarModulesForCompany(company),
        createdAt: company.createdAt ? company.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: company.updatedAt ? company.updatedAt.toISOString() : new Date().toISOString(),
      };
    },

    updateCompanySidebarModules: async (_, { id, sidebarModules }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can update sidebar modules
      if (context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Super Admin access required.');
      }

      const company = await Company.findById(id);
      if (!company) {
        throw new Error('Company not found');
      }

      // Update the Map properly for Mongoose
      if (!company.sidebarModules) {
        company.sidebarModules = new Map();
      }

      // Clear existing entries and set new ones
      company.sidebarModules.clear();
      sidebarModules.forEach(module => {
        company.sidebarModules.set(module.path, module.enabled);
      });

      // Mark the Map as modified for Mongoose
      company.markModified('sidebarModules');
      company.updatedAt = new Date();
      
      await company.save();

      return {
        id: company._id.toString(),
        name: company.name,
        email: company.email,
        phone: company.phone || '',
        address: company.address || '',
        website: company.website || '',
        industry: company.industry || '',
        adminId: company.adminId ? company.adminId.toString() : null,
        adminIds: company.adminIds ? company.adminIds.map(id => id.toString()) : [],
        planId: company.planId ? company.planId.toString() : null,
        planLimits: company.planLimits || {
          salesPersonLimit: 0,
          quotationLimit: 0,
          usersLimit: 0,
        },
        currentUsage: company.currentUsage || {
          salesPersonCount: 0,
          quotationCount: 0,
          usersCount: 0,
        },
        status: company.status,
        logo: company.logo || '',
        description: company.description || '',
        enabledRoles: company.enabledRoles || ['Admin', 'Customer', 'Sales Person'],
        sidebarModules: getSidebarModulesForCompany(company),
        createdAt: company.createdAt ? company.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: company.updatedAt ? company.updatedAt.toISOString() : new Date().toISOString(),
      };
    },

    syncCompanyUsageCounts: async (_, { id }, context) => {
      await connectDB();

      // Check authentication
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin and Admin can sync counts
      if (!['Super Admin', 'Admin'].includes(context.user.role)) {
        throw new Error('Not authorized to sync company usage counts');
      }

      // If Admin, they can only sync their own company
      if (context.user.role === 'Admin') {
        const adminUser = await User.findById(context.user.userId);
        if (!adminUser || adminUser.companyId?.toString() !== id) {
          throw new Error('Not authorized to sync this company\'s usage counts');
        }
      }

      const { syncCompanyUsageCounts } = await import('../../lib/planLimitHelpers.js');
      const result = await syncCompanyUsageCounts(id);
      
      return result;
    },
  },
};

// Helper function to get sidebar modules for a company
function getSidebarModulesForCompany(company) {
  const allModules = [
    ...(SIDEBAR_CONFIG[ROLES.ADMIN] || []),
    ...(SIDEBAR_CONFIG[ROLES.SALES_PERSON] || []),
    ...(SIDEBAR_CONFIG[ROLES.CUSTOMER] || []),
  ];

  // Remove duplicates based on path
  const uniqueModules = [];
  const seenPaths = new Set();
  allModules.forEach(module => {
    if (!seenPaths.has(module.path)) {
      seenPaths.add(module.path);
      uniqueModules.push(module);
    }
  });

  // Get enabled status from company's sidebarModules Map
  const sidebarModulesMap = company.sidebarModules || new Map();
  
  return uniqueModules.map(module => ({
    name: module.name,
    path: module.path,
    icon: module.icon,
    enabled: sidebarModulesMap.has(module.path) 
      ? sidebarModulesMap.get(module.path) 
      : true, // Default to enabled if not set
  }));
}

