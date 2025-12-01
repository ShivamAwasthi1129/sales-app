import connectDB from '../../lib/mongodb.js';
import Quotation from '../../models/Quotation.js';
import QuotationChange from '../../models/QuotationChange.js';
import QuotationStatusHistory from '../../models/QuotationStatusHistory.js';
import User from '../../models/User.js';
import Company from '../../models/Company.js';

export const quotationResolvers = {
  Query: {
    getQuotations: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Build filter based on user role and company
      let filter = {};
      
      if (context.user.role === 'Super Admin') {
        // Super Admin can see all quotations
        filter = {};
      } else if (context.user.role === 'Admin' || context.user.role === 'Sales Person') {
        // Admin and Sales Person can only see quotations from their company's users
        if (context.user.companyId) {
          const companyUsers = await User.find({ companyId: context.user.companyId }).select('_id').lean();
          const userIds = companyUsers.map(u => u._id);
          filter = { createdBy: { $in: userIds } };
        } else {
          // If no company, return empty
          return [];
        }
      } else if (context.user.role === 'Customer' || context.user.role === 'Client') {
        const userId = context.user.userId || context.user.id;
        
        // Get client email from User model
        let clientEmail = null;
        if (userId) {
          try {
            const clientUser = await User.findById(userId).lean();
            if (clientUser && clientUser.email) {
              clientEmail = clientUser.email.toLowerCase();
            }
          } catch (err) {
            console.error('Error fetching client email:', err);
          }
        }
        
        // Match by clientId OR by email (to handle cases where clientId might not be set)
        if (clientEmail) {
          filter = {
            $or: [
              { clientId: userId },
              { 'to.email': clientEmail }
            ]
          };
        } else {
          // Fallback to just clientId if email not found
          filter = { clientId: userId };
        }
      } else {
        // Others can only see their own created quotations
        filter = { createdBy: context.user.userId || context.user.id };
      }

      const quotations = await Quotation.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      return quotations.map(quotation => ({
        ...quotation,
        id: quotation._id.toString(),
        quotationDate: quotation.quotationDate?.toISOString() || new Date().toISOString(),
        dueDate: quotation.dueDate?.toISOString(),
        createdAt: quotation.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: quotation.updatedAt?.toISOString() || new Date().toISOString(),
        invoiceNo: quotation.invoiceNo || null,
        invoiceId: quotation.invoiceId?.toString() || null,
        lineItems: (quotation.lineItems || []).map(item => ({
          ...item,
          id: item._id?.toString() || item.id,
        })),
        payment: quotation.payment ? {
          ...quotation.payment,
          paidAt: quotation.payment.paidAt?.toISOString(),
        } : null,
      }));
    },

    getQuotation: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const quotation = await Quotation.findById(id).lean();
      
      if (!quotation) {
        throw new Error('Quotation not found');
      }

      const userId = context.user.userId || context.user.id;
      
      // Check permissions
      // Super Admin, Admin, and Sales Person can view all quotations
      const isAdmin = ['Super Admin', 'Admin'].includes(context.user.role);
      const isSalesPerson = context.user.type === 'salesPerson' || context.user.role === 'Sales Person';
      
      if (isAdmin || isSalesPerson) {
        // Allow access
      }
      // Customer/Client can view quotations where they are the client (clientId OR email matches)
      else if (context.user.role === 'Customer' || context.user.role === 'Client') {
        // Get client email from User model
        let clientEmail = null;
        if (userId) {
          try {
            const clientUser = await User.findById(userId).lean();
            if (clientUser && clientUser.email) {
              clientEmail = clientUser.email.toLowerCase();
            }
          } catch (err) {
            console.error('Error fetching client email:', err);
          }
        }
        
        // Check if clientId matches OR email matches
        const clientIdMatches = quotation.clientId && quotation.clientId.toString() === userId;
        const emailMatches = clientEmail && quotation.to?.email && quotation.to.email.toLowerCase() === clientEmail;
        
        if (!clientIdMatches && !emailMatches) {
          throw new Error('Not authorized to view this quotation');
        }
      }
      // Others can only view quotations they created
      else if (quotation.createdBy?.toString() !== userId) {
        throw new Error('Not authorized to view this quotation');
      }

      return {
        ...quotation,
        id: quotation._id.toString(),
        quotationDate: quotation.quotationDate?.toISOString() || new Date().toISOString(),
        dueDate: quotation.dueDate?.toISOString(),
        createdAt: quotation.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: quotation.updatedAt?.toISOString() || new Date().toISOString(),
        invoiceNo: quotation.invoiceNo || null,
        invoiceId: quotation.invoiceId?.toString() || null,
        lineItems: (quotation.lineItems || []).map(item => ({
          ...item,
          id: item._id?.toString() || item.id,
        })),
        payment: quotation.payment ? {
          ...quotation.payment,
          paidAt: quotation.payment.paidAt?.toISOString(),
        } : null,
      };
    },

    getQuotationByNo: async (_, { quotationNo }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const quotation = await Quotation.findOne({ quotationNo }).lean();
      
      if (!quotation) {
        throw new Error('Quotation not found');
      }

      // Check permissions
      if (!['Super Admin', 'Admin'].includes(context.user.role) && 
          quotation.createdBy?.toString() !== context.user.id) {
        throw new Error('Not authorized to view this quotation');
      }

      return {
        ...quotation,
        id: quotation._id.toString(),
        quotationDate: quotation.quotationDate?.toISOString() || new Date().toISOString(),
        dueDate: quotation.dueDate?.toISOString(),
        createdAt: quotation.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: quotation.updatedAt?.toISOString() || new Date().toISOString(),
        lineItems: (quotation.lineItems || []).map(item => ({
          ...item,
          id: item._id?.toString() || item.id,
        })),
        payment: quotation.payment ? {
          ...quotation.payment,
          paidAt: quotation.payment.paidAt?.toISOString(),
        } : null,
      };
    },

    getQuotationChanges: async (_, { quotationId }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const quotation = await Quotation.findById(quotationId).lean();
      
      if (!quotation) {
        throw new Error('Quotation not found');
      }

      // Check permissions
      const userId = context.user.userId || context.user.id;
      
      // Super Admin and Admin can view all change history
      if (['Super Admin', 'Admin'].includes(context.user.role)) {
        // Allow access
      }
      // Client can view change history for quotations where they are the client (by clientId OR email)
      else if (context.user.role === 'Client') {
        // Get client email from User model
        let clientEmail = null;
        if (userId) {
          try {
            const clientUser = await User.findById(userId).lean();
            if (clientUser && clientUser.email) {
              clientEmail = clientUser.email.toLowerCase();
            }
          } catch (err) {
            console.error('Error fetching client email:', err);
          }
        }
        
        // Check if clientId matches OR email matches
        const clientIdMatches = quotation.clientId && quotation.clientId.toString() === userId;
        const emailMatches = clientEmail && quotation.to?.email && quotation.to.email.toLowerCase() === clientEmail;
        
        if (!clientIdMatches && !emailMatches) {
          throw new Error('Not authorized to view change history');
        }
      }
      // Others can only view change history for quotations they created
      else if (quotation.createdBy?.toString() !== userId) {
        throw new Error('Not authorized to view change history');
      }

      const changes = await QuotationChange.find({ quotationId })
        .populate('changedBy', 'email name')
        .sort({ version: -1 })
        .lean();

      return changes.map(change => ({
        ...change,
        id: change._id.toString(),
        quotationId: change.quotationId.toString(),
        changedBy: change.changedBy ? {
          id: change.changedBy._id.toString(),
          email: change.changedBy.email,
          name: change.changedBy.name,
        } : null,
        createdAt: change.createdAt?.toISOString() || new Date().toISOString(),
        changes: change.changes || [],
        lineItemChanges: (change.lineItemChanges || []).map(item => {
          const mapItem = (lineItem) => {
            if (!lineItem) return null;
            return {
              id: lineItem._id?.toString() || lineItem.id || null,
              productId: lineItem.productId || null,
              itemName: lineItem.itemName || '',
              description: lineItem.description || '',
              imageUrl: lineItem.imageUrl || '',
              quantity: lineItem.quantity || 0,
              rate: lineItem.rate || 0,
              amount: lineItem.amount || 0,
              total: lineItem.total || 0,
              isSubscription: lineItem.isSubscription || false,
              subscriptionDetails: lineItem.subscriptionDetails ? {
                billingType: lineItem.subscriptionDetails.billingType || null,
                interval: lineItem.subscriptionDetails.interval || null,
                intervalCount: lineItem.subscriptionDetails.intervalCount || null,
              } : null,
              subscriptionPrice: lineItem.subscriptionPrice || null,
              selectedOptions: (lineItem.selectedOptions || []).map(opt => ({
                attributeName: opt.attributeName || '',
                optionLabel: opt.optionLabel || '',
                optionValue: opt.optionValue || '',
                price: typeof opt.price === 'number' ? opt.price : (opt.price?.amount ? opt.price.amount / 100 : 0),
              })),
            };
          };
          
          return {
            ...item,
            oldItem: mapItem(item.oldItem),
            newItem: mapItem(item.newItem),
          };
        }),
      }));
    },

    getQuotationStatusHistory: async (_, { quotationId }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const quotation = await Quotation.findById(quotationId).lean();
      
      if (!quotation) {
        throw new Error('Quotation not found');
      }

      // Check permissions (same as getQuotationChanges)
      const userId = context.user.userId || context.user.id;
      
      if (['Super Admin', 'Admin'].includes(context.user.role)) {
        // Allow access
      } else if (context.user.role === 'Client') {
        let clientEmail = null;
        if (userId) {
          try {
            const clientUser = await User.findById(userId).lean();
            if (clientUser && clientUser.email) {
              clientEmail = clientUser.email.toLowerCase();
            }
          } catch (err) {
            console.error('Error fetching client email:', err);
          }
        }
        
        const clientIdMatches = quotation.clientId && quotation.clientId.toString() === userId;
        const emailMatches = clientEmail && quotation.to?.email && quotation.to.email.toLowerCase() === clientEmail;
        
        if (!clientIdMatches && !emailMatches) {
          throw new Error('Not authorized to view status history');
        }
      } else if (quotation.createdBy?.toString() !== userId) {
        throw new Error('Not authorized to view status history');
      }

      const statusHistory = await QuotationStatusHistory.find({ quotationId })
        .populate('changedBy', 'email name')
        .sort({ createdAt: -1 })
        .lean();

      return statusHistory.map(history => ({
        ...history,
        id: history._id.toString(),
        quotationId: history.quotationId.toString(),
        updateType: history.updateType || 'status_change',
        changedByRole: history.changedByRole || null,
        changedBy: history.changedBy ? {
          id: history.changedBy._id.toString(),
          email: history.changedBy.email || history.changedByEmail,
          name: history.changedBy.name || history.changedByName,
        } : {
          id: history.changedBy?.toString() || '',
          email: history.changedByEmail || '',
          name: history.changedByName || 'System',
        },
        createdAt: history.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: history.updatedAt?.toISOString() || new Date().toISOString(),
      }));
    },

    getQuotationsWithStatusHistory: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Admin and Sales Person can access this
      if (!['Admin', 'Sales Person'].includes(context.user.role)) {
        throw new Error('Not authorized to view quotation tracking');
      }

      const userId = context.user.userId || context.user.id;
      const companyId = context.user.companyId;

      if (!companyId) {
        throw new Error('Company ID not found');
      }

      // Get all quotations for the company
      // Find quotations by checking the 'from' section which contains company info
      // We need to find quotations created by users from this company
      const companyUsers = await User.find({ companyId: companyId }).select('_id').lean();
      const companyUserIds = companyUsers.map(u => u._id);

      // Find quotations created by users from this company
      const quotations = await Quotation.find({
        createdBy: { $in: companyUserIds }
      })
        .sort({ createdAt: -1 })
        .lean();

      // Get status history for all quotations
      const quotationIds = quotations.map(q => q._id);
      const allStatusHistory = await QuotationStatusHistory.find({
        quotationId: { $in: quotationIds }
      })
        .populate('changedBy', 'email name')
        .sort({ createdAt: -1 })
        .lean();

      // Group status history by quotationId
      const statusHistoryMap = {};
      allStatusHistory.forEach(history => {
        const qId = history.quotationId.toString();
        if (!statusHistoryMap[qId]) {
          statusHistoryMap[qId] = [];
        }
        statusHistoryMap[qId].push({
          ...history,
          id: history._id.toString(),
          quotationId: history.quotationId.toString(),
          updateType: history.updateType || 'status_change',
          changedByRole: history.changedByRole || null,
          changedBy: history.changedBy ? {
            id: history.changedBy._id.toString(),
            email: history.changedBy.email || history.changedByEmail,
            name: history.changedBy.name || history.changedByName,
          } : {
            id: '',
            email: history.changedByEmail || '',
            name: history.changedByName || 'System',
          },
          createdAt: history.createdAt.toISOString(),
          updatedAt: history.updatedAt.toISOString(),
        });
      });

      // Map quotations with their status history
      return quotations.map(quotation => ({
        quotation: {
          ...quotation,
          id: quotation._id.toString(),
          quotationDate: quotation.quotationDate?.toISOString() || new Date().toISOString(),
          dueDate: quotation.dueDate?.toISOString(),
          createdAt: quotation.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: quotation.updatedAt?.toISOString() || new Date().toISOString(),
          lineItems: (quotation.lineItems || []).map(item => ({
            ...item,
            id: item._id?.toString() || item.id,
          })),
          payment: quotation.payment ? {
            ...quotation.payment,
            paidAt: quotation.payment.paidAt?.toISOString(),
          } : null,
        },
        statusHistory: statusHistoryMap[quotation._id.toString()] || [],
      }));
    },
  },

  Mutation: {
    createQuotation: async (_, { input, sendEmail = true }, context) => {
      try {
        await connectDB();
        
        console.log('[QuotationResolver] ==================== START ====================');
        console.log('[QuotationResolver] createQuotation called with sendEmail:', sendEmail);
        console.log('[QuotationResolver] User:', {
          userId: context.user?.userId || context.user?.id,
          role: context.user?.role,
          email: context.user?.email,
          companyId: context.user?.companyId
        });
        
        if (!context.user) {
          console.error('[QuotationResolver] ERROR: Not authenticated');
          throw new Error('Not authenticated');
        }

        // Only allow certain roles to create quotations
        const allowedRoles = ['Super Admin', 'Admin', 'Sales Person'];
        const isSalesPerson = context.user.type === 'salesPerson' || context.user.role === 'Sales Person';
        
        if (!allowedRoles.includes(context.user.role) && !isSalesPerson) {
          console.error('[QuotationResolver] ERROR: Not authorized - Role:', context.user.role);
          throw new Error('Not authorized to create quotations');
        }

        // Get creator's company ID for multi-tenancy
        const creatorCompanyId = context.user.companyId;
        console.log('[QuotationResolver] Creator company ID:', creatorCompanyId);
        
        if (!creatorCompanyId && context.user.role !== 'Super Admin') {
          console.error('[QuotationResolver] ERROR: User must be associated with a company');
          throw new Error('User must be associated with a company to create quotations');
        }

      // AUTO-POPULATE FROM SECTION
      let fromSection = input.from || {};
      const userId = context.user.userId || context.user.id;
      let creatorUser = null;
      let creatorCompany = null;

      if (context.user.role === 'Admin' || context.user.role === 'Customer') {
        // Get admin/customer user details
        creatorUser = await User.findById(userId).lean();
        if (creatorUser && creatorUser.companyId) {
          creatorCompany = await Company.findById(creatorUser.companyId).lean();
        }
      } else if (isSalesPerson) {
        // Get sales person details
        const salesPerson = await User.findOne({
          role: 'Sales Person',
          $or: [
            { _id: userId },
            { email: context.user.email }
          ]
        }).lean();
        
        if (salesPerson) {
          creatorUser = salesPerson;
          if (salesPerson.companyId) {
            creatorCompany = await Company.findById(salesPerson.companyId).lean();
          }
        }
      }

      // Auto-populate from section with company/user details
      if (!fromSection.businessName && creatorCompany) {
        fromSection.businessName = creatorCompany.name;
      }
      if (!fromSection.email && (creatorCompany?.email || creatorUser?.email)) {
        fromSection.email = creatorCompany?.email || creatorUser?.email;
      }
      if (!fromSection.phone && (creatorCompany?.phone || creatorUser?.phone)) {
        fromSection.phone = creatorCompany?.phone || creatorUser?.phone;
      }
      if (!fromSection.address && (creatorCompany?.address || creatorUser?.address)) {
        fromSection.address = creatorCompany?.address || creatorUser?.address;
      }
      if (isSalesPerson && creatorUser) {
        fromSection.salesPersonName = creatorUser.name;
        fromSection.salesPersonId = creatorUser.salesPersonId || creatorUser._id.toString();
      } else if (context.user.role === 'Admin' && creatorUser) {
        fromSection.salesPersonName = creatorUser.name;
        fromSection.salesPersonId = 'ADMIN';
      }

      // AUTO-CREATE OR FIND CUSTOMER - ONLY WHEN EMAIL IS SENT (NOT DRAFT)
      let customerId = null;
      const clientEmail = input.to?.email?.toLowerCase();
      const clientName = input.to?.businessName || input.to?.name || 'Customer';
      let customerPassword = null; // Store password to send in email

      // Only create customer if quotation is being sent (not saved as draft)
      if (sendEmail && clientEmail && creatorCompanyId) {
        // Check if customer already exists (by email + company)
        let existingCustomer = await User.findOne({
          email: clientEmail,
          companyId: creatorCompanyId,
          role: 'Customer'
        }).lean();

        if (existingCustomer) {
          // Customer exists, use it
          customerId = existingCustomer._id;
          console.log('[Quotation] Using existing customer:', existingCustomer.email);
        } else {
          // Create new customer only when sending email
          try {
            // Generate random password
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
            customerPassword = randomPassword; // Store for email
            
            const newCustomer = await User.create({
              name: clientName,
              email: clientEmail,
              password: randomPassword,
              role: 'Customer',
              companyId: creatorCompanyId,
              status: 'Active',
              phone: input.to?.phone || '',
              address: input.to?.address || '',
            });

            customerId = newCustomer._id;
            console.log('[Quotation] Created new customer:', newCustomer.email);
          } catch (createError) {
            console.error('[Quotation] Error creating customer:', createError);
            // If customer creation fails, continue without linking
          }
        }
      } else if (!sendEmail) {
        console.log('[Quotation] Quotation saved as draft - customer will be created when quotation is sent');
      }

      // Generate quotation number
      const quotationDate = input.quotationDate ? new Date(input.quotationDate) : new Date();
      const dateStr = quotationDate.toISOString().slice(0, 10).replace(/-/g, '');
      
      const lastQuotation = await Quotation
        .findOne({ quotationNo: new RegExp(`^QT-${dateStr}`) })
        .sort({ quotationNo: -1 })
        .lean();
      
      let sequence = 1;
      if (lastQuotation && lastQuotation.quotationNo) {
        const parts = lastQuotation.quotationNo.split('-');
        if (parts.length === 3) {
          const lastSequence = parseInt(parts[2]);
          if (!isNaN(lastSequence)) {
            sequence = lastSequence + 1;
          }
        }
      }
      
      const quotationNo = `QT-${dateStr}-${sequence.toString().padStart(4, '0')}`;

      // Prepare quotation data with auto-populated fields
      // Ensure status is set correctly based on sendEmail flag (override input.status if needed)
      const finalStatus = sendEmail ? 'sent' : 'draft';
      
      const quotationData = {
        ...input,
        quotationNo: quotationNo,
        from: fromSection,
        to: {
          ...input.to,
          businessName: clientName,
          email: clientEmail,
        },
        clientId: customerId, // Link to customer
        createdBy: userId,
        companyId: creatorCompanyId, // Link to company for tracking and counts
        quotationDate: quotationDate,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        status: finalStatus, // Always set status based on sendEmail flag, not input.status
      };

      console.log('[QuotationResolver] Saving quotation with status:', quotationData.status);
      console.log('[QuotationResolver] Quotation data:', JSON.stringify({
        quotationNo: quotationData.quotationNo,
        status: quotationData.status,
        clientId: quotationData.clientId,
        from: quotationData.from,
        to: quotationData.to,
        lineItemsCount: quotationData.lineItems?.length
      }, null, 2));

      const quotation = new Quotation(quotationData);
      await quotation.save();
      console.log('[QuotationResolver] Quotation saved successfully with ID:', quotation._id);

      // Increment quotation count for the company
      if (creatorCompanyId) {
        try {
          const { incrementQuotationCount } = await import('../../lib/planLimitHelpers.js');
          await incrementQuotationCount(creatorCompanyId);
          console.log('[QuotationResolver] Quotation count incremented for company:', creatorCompanyId);
        } catch (countError) {
          console.error('[QuotationResolver] Error incrementing quotation count:', countError);
          // Don't fail the mutation if count increment fails
        }
      }

      const savedQuotation = await Quotation.findById(quotation._id).lean();
      console.log('[QuotationResolver] Retrieved saved quotation:', savedQuotation?.quotationNo);

      // Record status history for initial status
      try {
        const creatorEmail = creatorUser?.email || context.user?.email || '';
        const creatorName = creatorUser?.name || context.user?.name || 'System';
        
        const creatorRole = creatorUser?.role || context.user?.role || 'Unknown';
        await QuotationStatusHistory.create({
          quotationId: quotation._id,
          status: quotationData.status,
          changedBy: userId,
          changedByEmail: creatorEmail,
          changedByName: creatorName,
          changedByRole: creatorRole,
          updateType: 'created',
          reason: quotationData.status === 'draft' ? 'Quotation created as draft' : 'Quotation created and sent',
          notes: quotationData.status === 'draft' ? `Created by ${creatorRole} - Saved as draft` : `Created by ${creatorRole} - Email sent to customer`,
          quotationSnapshot: JSON.stringify(savedQuotation),
        });
        console.log('[QuotationResolver] Status history recorded for initial status:', quotationData.status);
      } catch (statusHistoryError) {
        console.error('[QuotationResolver] Error recording status history:', statusHistoryError);
        // Don't fail the mutation if status history fails
      }

      // SEND EMAIL if sendEmail is true and has client email
      if (sendEmail && savedQuotation.status === 'sent' && clientEmail) {
        try {
          // Try to import and use email service
          const { sendQuotationEmail, sendWelcomeEmail } = await import('../../lib/email.js');
          
          // Send welcome email with password if customer was just created
          if (customerPassword && customerId) {
            try {
              await sendWelcomeEmail({
                name: clientName,
                email: clientEmail,
                password: customerPassword,
                role: 'Customer',
                phone: input.to?.phone || '',
                address: input.to?.address || '',
                status: 'Active',
              });
              console.log('[Quotation] Welcome email with password sent to new customer:', clientEmail);
            } catch (welcomeEmailError) {
              console.error('[Quotation] Error sending welcome email:', welcomeEmailError);
              // Don't fail if welcome email fails
            }
          }
          
          // Send quotation email
          if (typeof sendQuotationEmail === 'function') {
            const emailBody = `Dear ${clientName},\n\nThank you for your interest in our products and services.\n\nPlease find attached the quotation ${savedQuotation.quotationNo}.\n\nTotal Amount: $${savedQuotation.totalAmount?.toFixed(2) || '0.00'}\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\n${fromSection.businessName}`;
            
            await sendQuotationEmail(savedQuotation, emailBody);
            console.log('[Quotation] Quotation email sent to:', clientEmail);
          } else {
            console.log('[Quotation] Email function not available, skipping email');
          }
        } catch (emailError) {
          console.error('[Quotation] Error sending email:', emailError);
          // Don't fail the mutation if email fails
        }
      }

      const result = {
        ...savedQuotation,
        id: savedQuotation._id.toString(),
        quotationDate: savedQuotation.quotationDate?.toISOString() || new Date().toISOString(),
        dueDate: savedQuotation.dueDate?.toISOString(),
        createdAt: savedQuotation.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: savedQuotation.updatedAt?.toISOString() || new Date().toISOString(),
        lineItems: (savedQuotation.lineItems || []).map(item => ({
          ...item,
          id: item._id?.toString() || item.id,
        })),
      };
      
      console.log('[QuotationResolver] Returning result:', {
        id: result.id,
        quotationNo: result.quotationNo,
        status: result.status
      });
      console.log('[QuotationResolver] ==================== END ====================');
      
      return result;
      
      } catch (error) {
        console.error('[QuotationResolver] ==================== ERROR ====================');
        console.error('[QuotationResolver] Error creating quotation:', error.message);
        console.error('[QuotationResolver] Error stack:', error.stack);
        console.error('[QuotationResolver] ==================== ERROR END ====================');
        throw error;
      }
    },

    updateQuotation: async (_, { id, input, sendEmail = false }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const existingQuotation = await Quotation.findById(id).lean();
      
      if (!existingQuotation) {
        throw new Error('Quotation not found');
      }

      // Check permissions
      const userId = context.user.userId || context.user.id;
      const isAdmin = ['Super Admin', 'Admin'].includes(context.user.role);
      const isSalesPerson = context.user.type === 'salesPerson' || context.user.role === 'Sales Person';
      const isCreator = existingQuotation.createdBy?.toString() === userId;
      
      // Check if customer can update (by clientId OR email match)
      let isCustomer = false;
      if (context.user.role === 'Customer') {
        // Get client email from User model
        let clientEmail = null;
        if (userId) {
          try {
            const clientUser = await User.findById(userId).lean();
            if (clientUser && clientUser.email) {
              clientEmail = clientUser.email.toLowerCase();
            }
          } catch (err) {
            console.error('Error fetching client email:', err);
          }
        }
        
        // Check if clientId matches OR email matches
        const clientIdMatches = existingQuotation.clientId && existingQuotation.clientId.toString() === userId;
        const emailMatches = clientEmail && existingQuotation.to?.email && existingQuotation.to.email.toLowerCase() === clientEmail;
        
        isCustomer = clientIdMatches || emailMatches;
      }
      
      if (!isAdmin && !isSalesPerson && !isCreator && !isCustomer) {
        throw new Error('Not authorized to update this quotation');
      }

      // Track changes - Track ALL field changes and line item changes
      const lineItemChanges = [];
      const fieldChanges = [];

      // Track status change
      const oldStatus = existingQuotation.status;
      const newStatus = input.status || oldStatus;
      if (oldStatus !== newStatus) {
        fieldChanges.push({
          field: 'status',
          oldValue: oldStatus,
          newValue: newStatus,
          changeType: 'updated',
        });
      }

      // Track all other field changes
      const fieldsToTrack = [
        'quotationDate', 'dueDate', 'currency', 'subtotal', 'totalTax', 
        'couponCode', 'couponDiscount', 'totalAmount', 'notes', 'terms', 
        'businessLogo'
      ];

      fieldsToTrack.forEach(field => {
        const oldValue = existingQuotation[field];
        const newValue = input[field];
        
        // Handle date fields
        if (field === 'quotationDate' || field === 'dueDate') {
          const oldDate = oldValue ? new Date(oldValue).toISOString() : null;
          const newDate = newValue ? new Date(newValue).toISOString() : null;
          if (oldDate !== newDate) {
            fieldChanges.push({
              field: field,
              oldValue: oldDate,
              newValue: newDate,
              changeType: 'updated',
            });
          }
        } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue) && newValue !== undefined) {
          fieldChanges.push({
            field: field,
            oldValue: oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
            newValue: newValue !== null && newValue !== undefined ? String(newValue) : null,
            changeType: 'updated',
          });
        }
      });

      // Track 'to' and 'from' section changes
      if (input.to) {
        const toFields = ['businessName', 'email', 'phone', 'address', 'country'];
        toFields.forEach(field => {
          const oldValue = existingQuotation.to?.[field];
          const newValue = input.to[field];
          if (oldValue !== newValue && newValue !== undefined) {
            fieldChanges.push({
              field: `to.${field}`,
              oldValue: oldValue || null,
              newValue: newValue || null,
              changeType: 'updated',
            });
          }
        });
      }

      if (input.from) {
        const fromFields = ['businessName', 'email', 'phone', 'address', 'country', 'salesPersonName', 'salesPersonId'];
        fromFields.forEach(field => {
          const oldValue = existingQuotation.from?.[field];
          const newValue = input.from[field];
          if (oldValue !== newValue && newValue !== undefined) {
            fieldChanges.push({
              field: `from.${field}`,
              oldValue: oldValue || null,
              newValue: newValue || null,
              changeType: 'updated',
            });
          }
        });
      }

      // Track line item changes
      const existingItems = existingQuotation.lineItems || [];
      const newItems = input.lineItems || [];
      const existingItemMap = new Map(existingItems.map(item => [item._id?.toString() || item.id, item]));
      const newItemMap = new Map(newItems.map((item, idx) => [item.id || `new_${idx}`, item]));

      // Find deleted items
      existingItemMap.forEach((item, itemId) => {
        if (!newItemMap.has(itemId)) {
          lineItemChanges.push({
            itemId: itemId,
            changeType: 'deleted',
            oldItem: item,
            newItem: null,
          });
        }
      });

      // Find added and updated items
      newItemMap.forEach((newItem, itemId) => {
        const existingItem = existingItemMap.get(itemId);
        if (!existingItem) {
          lineItemChanges.push({
            itemId: itemId,
            changeType: 'added',
            oldItem: null,
            newItem: newItem,
          });
        } else {
          // Check if item was updated
          const itemChanged = JSON.stringify(existingItem) !== JSON.stringify(newItem);
          if (itemChanged) {
            lineItemChanges.push({
              itemId: itemId,
              changeType: 'updated',
              oldItem: existingItem,
              newItem: newItem,
            });
          }
        }
      });

      // Get next version number
      const lastChange = await QuotationChange
        .findOne({ quotationId: id })
        .sort({ version: -1 })
        .lean();
      const nextVersion = lastChange ? lastChange.version + 1 : 1;

      // Save change record if there are any changes (line items or status)
      if (lineItemChanges.length > 0 || fieldChanges.length > 0) {
        // Get user ID from context - JWT token has userId field
        const userId = context.user?.userId || context.user?.id || undefined;
        
        const changeType = fieldChanges.some(c => c.field === 'status') ? 'status_changed' : 'updated';
        let summary = '';
        
        const fieldChangeCount = fieldChanges.length;
        const lineItemChangeCount = lineItemChanges.length;
        
        if (fieldChangeCount > 0 && lineItemChangeCount > 0) {
          const statusChange = fieldChanges.find(c => c.field === 'status');
          const otherFieldChanges = fieldChanges.filter(c => c.field !== 'status');
          let summaryParts = [];
          
          if (statusChange) {
            summaryParts.push(`Status changed from ${statusChange.oldValue} to ${statusChange.newValue}`);
          }
          if (otherFieldChanges.length > 0) {
            summaryParts.push(`${otherFieldChanges.length} field(s) updated: ${otherFieldChanges.map(c => c.field).join(', ')}`);
          }
          summaryParts.push(`${lineItemChangeCount} line item change(s): ${lineItemChanges.filter(c => c.changeType === 'added').length} added, ${lineItemChanges.filter(c => c.changeType === 'updated').length} updated, ${lineItemChanges.filter(c => c.changeType === 'deleted').length} deleted`);
          summary = summaryParts.join('. ');
        } else if (fieldChangeCount > 0) {
          const statusChange = fieldChanges.find(c => c.field === 'status');
          const otherFieldChanges = fieldChanges.filter(c => c.field !== 'status');
          let summaryParts = [];
          
          if (statusChange) {
            summaryParts.push(`Status changed from ${statusChange.oldValue} to ${statusChange.newValue}`);
          }
          if (otherFieldChanges.length > 0) {
            summaryParts.push(`${otherFieldChanges.length} field(s) updated: ${otherFieldChanges.map(c => c.field).join(', ')}`);
          }
          summary = summaryParts.join('. ') || 'Quotation updated';
        } else if (lineItemChangeCount > 0) {
          summary = `${lineItemChangeCount} line item change(s): ${lineItemChanges.filter(c => c.changeType === 'added').length} added, ${lineItemChanges.filter(c => c.changeType === 'updated').length} updated, ${lineItemChanges.filter(c => c.changeType === 'deleted').length} deleted`;
        } else {
          summary = 'Quotation updated';
        }
        
        const changeRecordData = {
          quotationId: id,
          version: nextVersion,
          changeType: changeType,
          changes: fieldChanges,
          lineItemChanges: lineItemChanges,
          summary: summary,
        };
        
        // Only include changedBy if we have a valid user ID
        if (userId) {
          changeRecordData.changedBy = userId;
        }
        
        const changeRecord = new QuotationChange(changeRecordData);
        await changeRecord.save();
      }

      // Handle customer creation if sending email for the first time
      let customerId = existingQuotation.clientId;
      const clientEmail = input.to?.email?.toLowerCase();
      const clientName = input.to?.businessName || input.to?.name || 'Customer';
      let customerPassword = null;
      
      // Get creator's company ID (userId already declared above)
      let creatorCompanyId = null;
      if (context.user.companyId) {
        creatorCompanyId = context.user.companyId;
      } else {
        const creatorUser = await User.findById(userId).lean();
        if (creatorUser && creatorUser.companyId) {
          creatorCompanyId = creatorUser.companyId;
        }
      }
      
      // Create customer if sending email and customer doesn't exist yet
      if (sendEmail && clientEmail && creatorCompanyId && !customerId) {
        console.log('[UpdateQuotation] Checking for customer creation...');
        // Check if customer already exists
        let existingCustomer = await User.findOne({
          email: clientEmail,
          companyId: creatorCompanyId,
          role: 'Customer'
        }).lean();
        
        if (existingCustomer) {
          customerId = existingCustomer._id;
          console.log('[UpdateQuotation] Using existing customer:', existingCustomer.email);
        } else {
          // Create new customer when sending email for the first time
          try {
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
            customerPassword = randomPassword;
            
            const newCustomer = await User.create({
              name: clientName,
              email: clientEmail,
              password: randomPassword,
              role: 'Customer',
              companyId: creatorCompanyId,
              status: 'Active',
              phone: input.to?.phone || '',
              address: input.to?.address || '',
            });
            
            customerId = newCustomer._id;
            console.log('[UpdateQuotation] Created new customer:', newCustomer.email);
          } catch (createError) {
            console.error('[UpdateQuotation] Error creating customer:', createError);
          }
        }
      }

      const updateData = {
        ...input,
        quotationDate: input.quotationDate ? new Date(input.quotationDate) : existingQuotation.quotationDate,
        dueDate: input.dueDate ? new Date(input.dueDate) : existingQuotation.dueDate,
        clientId: customerId || existingQuotation.clientId,
      };

      // Check if status changed (using variables already declared above)
      const statusChanged = oldStatus !== newStatus;
      
      // Check if there are any content changes (not just status)
      const hasContentChanges = fieldChanges.length > 0 || lineItemChanges.length > 0;

      const quotation = await Quotation.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).lean();

      // Get user details for history
      const creatorUser = await User.findById(userId).lean();
      const creatorEmail = creatorUser?.email || context.user?.email || '';
      const creatorName = creatorUser?.name || context.user?.name || 'System';
      const creatorRole = creatorUser?.role || context.user?.role || 'Unknown';

      // Record status history if status changed
      if (statusChanged) {
        try {
          await QuotationStatusHistory.create({
            quotationId: id,
            status: newStatus,
            changedBy: userId,
            changedByEmail: creatorEmail,
            changedByName: creatorName,
            changedByRole: creatorRole,
            updateType: 'status_change',
            reason: `Status changed from ${oldStatus} to ${newStatus}`,
            notes: `Quotation status updated by ${creatorRole}`,
            quotationSnapshot: JSON.stringify(quotation),
          });
          console.log('[QuotationResolver] Status history recorded:', oldStatus, '->', newStatus);
        } catch (statusHistoryError) {
          console.error('[QuotationResolver] Error recording status history:', statusHistoryError);
        }
      }
      
      // Record content update history if content changed (but status didn't change)
      if (!statusChanged && hasContentChanges) {
        try {
          const changeSummary = [];
          if (fieldChanges.length > 0) {
            changeSummary.push(`${fieldChanges.length} field(s) updated`);
          }
          if (lineItemChanges.length > 0) {
            changeSummary.push(`${lineItemChanges.length} line item(s) modified`);
          }
          
          // Create proper status label based on role
          let statusLabel = 'updated';
          if (creatorRole === 'Sales Person') {
            statusLabel = 'Updated by Sales Person';
          } else if (creatorRole === 'Customer') {
            statusLabel = 'Updated by Customer';
          } else if (creatorRole === 'Admin') {
            statusLabel = 'Updated by Admin';
          }
          
          await QuotationStatusHistory.create({
            quotationId: id,
            status: 'updated', // Use 'updated' status for content changes
            changedBy: userId,
            changedByEmail: creatorEmail,
            changedByName: creatorName,
            changedByRole: creatorRole,
            updateType: 'content_update',
            reason: statusLabel,
            notes: `${creatorName}: ${changeSummary.join(', ')}`,
            quotationSnapshot: JSON.stringify(quotation),
          });
          console.log('[QuotationResolver] Content update history recorded:', statusLabel);
        } catch (contentHistoryError) {
          console.error('[QuotationResolver] Error recording content update history:', contentHistoryError);
        }
      }

      // Regenerate payment link if quotation content changed and status is 'sent'
      if (quotation.status === 'sent' && quotation.payment?.paymentStatus !== 'paid') {
        const needsPaymentLinkUpdate = lineItemChanges.length > 0 || 
                                       fieldChanges.some(c => ['totalAmount', 'subtotal', 'couponDiscount'].includes(c.field));
        
        if (needsPaymentLinkUpdate) {
          console.log('[UpdateQuotation] Quotation content changed - regenerating payment link');
          try {
            const { createQuotationPaymentLink } = await import('../../lib/stripe.js');
            
            const quotationDataForPayment = {
              id: quotation._id.toString(),
              quotationNo: quotation.quotationNo,
              currency: quotation.currency,
              totalAmount: quotation.totalAmount,
              to: quotation.to,
              lineItems: quotation.lineItems.map(item => ({
                itemName: item.itemName,
                description: item.description,
                imageUrl: item.imageUrl,
                quantity: item.quantity,
                rate: item.rate,
                total: item.total,
                isSubscription: item.isSubscription,
                subscriptionDetails: item.subscriptionDetails,
                selectedOptions: item.selectedOptions,
              })),
            };
            
            const newPaymentLink = await createQuotationPaymentLink(quotationDataForPayment);
            
            // Update quotation with new payment link
            await Quotation.findByIdAndUpdate(
              id,
              { 
                'payment.paymentLink': newPaymentLink,
                'payment.paymentMethod': 'Stripe',
              },
              { new: false }
            );
            
            console.log('[UpdateQuotation] Payment link regenerated successfully');
          } catch (paymentError) {
            console.error('[UpdateQuotation] Error regenerating payment link:', paymentError);
            // Don't throw error - quotation was updated successfully
          }
        }
      }
      
      // Send email if sendEmail is true
      if (sendEmail && clientEmail) {
        console.log('[UpdateQuotation] Sending email to:', clientEmail);
        try {
          const { sendQuotationEmail, sendWelcomeEmail } = await import('../../lib/email.js');
          
          // Send welcome email if customer was just created
          if (customerPassword && customerId) {
            try {
              await sendWelcomeEmail({
                name: clientName,
                email: clientEmail,
                password: customerPassword,
                role: 'Customer',
                phone: input.to?.phone || '',
                address: input.to?.address || '',
                status: 'Active',
              });
              console.log('[UpdateQuotation] Welcome email sent to new customer');
            } catch (welcomeError) {
              console.error('[UpdateQuotation] Error sending welcome email:', welcomeError);
            }
          }
          
          // Send quotation email
          if (typeof sendQuotationEmail === 'function') {
            const fromSection = quotation.from || {};
            const emailBody = `Dear ${clientName},\n\nYour quotation has been updated.\n\nQuotation Number: ${quotation.quotationNo}\nTotal Amount: $${quotation.totalAmount?.toFixed(2) || '0.00'}\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\n${fromSection.businessName}`;
            
            await sendQuotationEmail(quotation, emailBody);
            console.log('[UpdateQuotation] Quotation email sent to:', clientEmail);
          }
        } catch (emailError) {
          console.error('[UpdateQuotation] Error sending email:', emailError);
          // Don't throw error - quotation was updated successfully
        }
      }

      return {
        ...quotation,
        id: quotation._id.toString(),
        quotationDate: quotation.quotationDate?.toISOString() || new Date().toISOString(),
        dueDate: quotation.dueDate?.toISOString(),
        createdAt: quotation.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: quotation.updatedAt?.toISOString() || new Date().toISOString(),
        lineItems: (quotation.lineItems || []).map(item => ({
          ...item,
          id: item._id?.toString() || item.id,
        })),
        payment: quotation.payment ? {
          ...quotation.payment,
          paidAt: quotation.payment.paidAt?.toISOString(),
        } : null,
      };
    },

    deleteQuotation: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const quotation = await Quotation.findById(id);
      
      if (!quotation) {
        throw new Error('Quotation not found');
      }

      // Check permissions
      const userId = context.user.userId || context.user.id;
      if (!['Super Admin', 'Admin'].includes(context.user.role) && 
          quotation.createdBy?.toString() !== userId) {
        throw new Error('Not authorized to delete this quotation');
      }

      await Quotation.findByIdAndDelete(id);

      return {
        success: true,
        message: 'Quotation deleted successfully',
      };
    },

    updateQuotationStatus: async (_, { id, status }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const quotation = await Quotation.findById(id);
      
      if (!quotation) {
        throw new Error('Quotation not found');
      }

      // Check permissions
      const userId = context.user.userId || context.user.id;
      if (!['Super Admin', 'Admin'].includes(context.user.role) && 
          quotation.createdBy?.toString() !== userId) {
        throw new Error('Not authorized to update this quotation');
      }

      const validStatuses = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'paid'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status value');
      }

      const oldStatus = quotation.status;
      quotation.status = status;
      await quotation.save();

      const updatedQuotation = await Quotation.findById(id).lean();

      // Record status history
      try {
        const creatorUser = await User.findById(userId).lean();
        const creatorEmail = creatorUser?.email || context.user?.email || '';
        const creatorName = creatorUser?.name || context.user?.name || 'System';
        
        const creatorRole = creatorUser?.role || context.user?.role || 'Unknown';
        await QuotationStatusHistory.create({
          quotationId: id,
          status: status,
          changedBy: userId,
          changedByEmail: creatorEmail,
          changedByName: creatorName,
          changedByRole: creatorRole,
          updateType: 'status_change',
          reason: `Status updated from ${oldStatus} to ${status}`,
          notes: `Quotation status manually updated by ${creatorRole}`,
          quotationSnapshot: JSON.stringify(updatedQuotation),
        });
        console.log('[QuotationResolver] Status history recorded:', oldStatus, '->', status);
      } catch (statusHistoryError) {
        console.error('[QuotationResolver] Error recording status history:', statusHistoryError);
      }

      return {
        ...updatedQuotation,
        id: updatedQuotation._id.toString(),
        quotationDate: updatedQuotation.quotationDate?.toISOString() || new Date().toISOString(),
        dueDate: updatedQuotation.dueDate?.toISOString(),
        createdAt: updatedQuotation.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: updatedQuotation.updatedAt?.toISOString() || new Date().toISOString(),
        lineItems: (updatedQuotation.lineItems || []).map(item => ({
          ...item,
          id: item._id?.toString() || item.id,
        })),
        payment: updatedQuotation.payment ? {
          ...updatedQuotation.payment,
          paidAt: updatedQuotation.payment.paidAt?.toISOString(),
        } : null,
      };
    },

    updateQuotationPayment: async (_, { id, payment, status }, context) => {
      await connectDB();
      
      // This mutation can be called without authentication (from payment webhook or success page)
      // But we should validate the payment data
      if (!payment || !payment.sessionId) {
        throw new Error('Payment information is required');
      }

      const quotation = await Quotation.findById(id);
      
      if (!quotation) {
        throw new Error('Quotation not found');
      }

      // Update payment information
      quotation.payment = {
        sessionId: payment.sessionId,
        paymentStatus: payment.paymentStatus || 'paid',
        amount: payment.amount || quotation.totalAmount,
        currency: payment.currency || quotation.currency,
        customerEmail: payment.customerEmail || quotation.to?.email,
        paymentMode: payment.paymentMode || 'payment',
        subscriptionId: payment.subscriptionId || null,
        paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date(),
      };

      // Update status if provided, otherwise set to 'paid' if payment is successful
      const oldStatus = quotation.status;
      let newStatus = oldStatus;
      
      if (status) {
        const validStatuses = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'paid'];
        if (validStatuses.includes(status)) {
          newStatus = status;
          quotation.status = status;
        }
      } else if (payment.paymentStatus === 'paid') {
        newStatus = 'paid';
        quotation.status = 'paid';
      }

      await quotation.save();

      const updatedQuotation = await Quotation.findById(id).lean();

      // Record status history if status changed
      if (oldStatus !== newStatus) {
        try {
          const userId = context.user?.userId || context.user?.id || null;
          let creatorUser = null;
          let creatorEmail = '';
          let creatorName = 'System';
          
          if (userId) {
            try {
              creatorUser = await User.findById(userId).lean();
              if (creatorUser) {
                creatorEmail = creatorUser.email || '';
                creatorName = creatorUser.name || 'System';
              }
            } catch (err) {
              console.error('Error fetching user for status history:', err);
            }
          }
          
          await QuotationStatusHistory.create({
            quotationId: id,
            status: newStatus,
            changedBy: userId,
            changedByEmail: creatorEmail || payment.customerEmail || '',
            changedByName: creatorName,
            reason: `Payment processed - status changed from ${oldStatus} to ${newStatus}`,
            notes: `Payment status: ${payment.paymentStatus || 'paid'}`,
            quotationSnapshot: JSON.stringify(updatedQuotation),
          });
          console.log('[QuotationResolver] Status history recorded for payment:', oldStatus, '->', newStatus);
        } catch (statusHistoryError) {
          console.error('[QuotationResolver] Error recording status history:', statusHistoryError);
        }
      }

      return {
        ...updatedQuotation,
        id: updatedQuotation._id.toString(),
        quotationDate: updatedQuotation.quotationDate?.toISOString() || new Date().toISOString(),
        dueDate: updatedQuotation.dueDate?.toISOString(),
        createdAt: updatedQuotation.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: updatedQuotation.updatedAt?.toISOString() || new Date().toISOString(),
        lineItems: (updatedQuotation.lineItems || []).map(item => ({
          ...item,
          id: item._id?.toString() || item.id,
        })),
        payment: updatedQuotation.payment ? {
          ...updatedQuotation.payment,
          paidAt: updatedQuotation.payment.paidAt?.toISOString(),
        } : null,
      };
    },

    deleteQuotation: async (_, { id }, context) => {
      await connectDB();

      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only allow Super Admin, Admin, and Sales Person to delete quotations
      const allowedRoles = ['Super Admin', 'Admin', 'Sales Person'];
      if (!allowedRoles.includes(context.user.role)) {
        throw new Error('Not authorized to delete quotations');
      }

      // Find the quotation first
      const quotation = await Quotation.findById(id).lean();
      if (!quotation) {
        throw new Error('Quotation not found');
      }

      // Authorization check: only allow deletion from same company (except Super Admin)
      if (context.user.role !== 'Super Admin') {
        const userCompanyId = context.user.companyId;
        if (!userCompanyId || quotation.companyId?.toString() !== userCompanyId) {
          throw new Error('Not authorized to delete this quotation');
        }
      }

      // Store company ID before deletion for count decrement
      const quotationCompanyId = quotation.companyId;

      // Delete the quotation
      await Quotation.findByIdAndDelete(id);

      // Decrement quotation count for the company
      if (quotationCompanyId) {
        try {
          const { decrementQuotationCount } = await import('../../lib/planLimitHelpers.js');
          await decrementQuotationCount(quotationCompanyId.toString());
          console.log('[QuotationResolver] Quotation count decremented for company:', quotationCompanyId.toString());
        } catch (countError) {
          console.error('[QuotationResolver] Error decrementing quotation count:', countError);
          // Don't fail the mutation if count decrement fails
        }
      }

      return {
        success: true,
        message: 'Quotation deleted successfully',
      };
    },

    migrateQuotationCompanyIds: async (_, __, context) => {
      await connectDB();

      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only Super Admin can run migration
      if (context.user.role !== 'Super Admin') {
        throw new Error('Not authorized. Only Super Admin can run migration.');
      }

      console.log('[Migration API] Starting migration requested by:', context.user.email);

      try {
        const { runCompleteMigration } = await import('../../lib/migrateQuotations.js');
        const result = await runCompleteMigration();

        if (result.success) {
          return {
            success: true,
            message: 'Migration completed successfully',
            updated: result.migration?.updated || 0,
            failed: result.migration?.failed || 0,
            synced: result.sync?.synced || 0,
            errors: result.migration?.errors || null,
          };
        } else {
          throw new Error(result.message || 'Migration failed');
        }
      } catch (error) {
        console.error('[Migration API] Error:', error);
        throw new Error(`Migration failed: ${error.message}`);
      }
    },
  },
};

