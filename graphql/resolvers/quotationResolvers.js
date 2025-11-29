import connectDB from '../../lib/mongodb.js';
import Quotation from '../../models/Quotation.js';
import QuotationChange from '../../models/QuotationChange.js';
import User from '../../models/User.js';
import Company from '../../models/Company.js';
import SalesPerson from '../../models/SalesPerson.js';

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
      } else if (context.user.role === 'Client') {
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
      // Client can view quotations where they are the client (clientId OR email matches)
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
        const salesPerson = await SalesPerson.findOne({
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

      // AUTO-CREATE OR FIND CUSTOMER
      let customerId = null;
      const clientEmail = input.to?.email?.toLowerCase();
      const clientName = input.to?.businessName || input.to?.name || 'Customer';

      if (clientEmail && creatorCompanyId) {
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
          // Create new customer
          try {
            // Generate random password
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
            
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
        quotationDate: quotationDate,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        status: sendEmail ? 'sent' : 'draft', // Set status based on sendEmail flag
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

      const savedQuotation = await Quotation.findById(quotation._id).lean();
      console.log('[QuotationResolver] Retrieved saved quotation:', savedQuotation?.quotationNo);

      // SEND EMAIL if sendEmail is true and has client email
      if (sendEmail && savedQuotation.status === 'sent' && clientEmail) {
        try {
          // Try to import and use email service
          const { sendQuotationEmail } = await import('../../lib/email.js');
          
          if (typeof sendQuotationEmail === 'function') {
            const emailBody = `Dear ${clientName},\n\nThank you for your interest in our products and services.\n\nPlease find attached the quotation ${savedQuotation.quotationNo}.\n\nTotal Amount: $${savedQuotation.totalAmount?.toFixed(2) || '0.00'}\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\n${fromSection.businessName}`;
            
            await sendQuotationEmail(savedQuotation, emailBody);
            console.log('[Quotation] Email sent to:', clientEmail);
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

    updateQuotation: async (_, { id, input }, context) => {
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

      // Track changes - Only track line item changes as per user requirement
      const lineItemChanges = [];

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

      // Save change record - Only save if there are line item changes
      if (lineItemChanges.length > 0) {
        // Get user ID from context - JWT token has userId field
        const userId = context.user?.userId || context.user?.id || undefined;
        
        const changeRecordData = {
          quotationId: id,
          version: nextVersion,
          changeType: 'updated',
          changes: [], // Empty array since we're only tracking line items
          lineItemChanges: lineItemChanges,
          summary: `${lineItemChanges.length} line item change(s): ${lineItemChanges.filter(c => c.changeType === 'added').length} added, ${lineItemChanges.filter(c => c.changeType === 'updated').length} updated, ${lineItemChanges.filter(c => c.changeType === 'deleted').length} deleted`,
        };
        
        // Only include changedBy if we have a valid user ID
        if (userId) {
          changeRecordData.changedBy = userId;
        }
        
        const changeRecord = new QuotationChange(changeRecordData);
        await changeRecord.save();
      }

      const updateData = {
        ...input,
        quotationDate: input.quotationDate ? new Date(input.quotationDate) : existingQuotation.quotationDate,
        dueDate: input.dueDate ? new Date(input.dueDate) : existingQuotation.dueDate,
      };

      const quotation = await Quotation.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).lean();

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

      quotation.status = status;
      await quotation.save();

      const updatedQuotation = await Quotation.findById(id).lean();

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
      if (status) {
        const validStatuses = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'paid'];
        if (validStatuses.includes(status)) {
          quotation.status = status;
        }
      } else if (payment.paymentStatus === 'paid') {
        quotation.status = 'paid';
      }

      await quotation.save();

      const updatedQuotation = await Quotation.findById(id).lean();

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
  },
};

