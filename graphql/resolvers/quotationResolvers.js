import connectDB from '../../lib/mongodb.js';
import Quotation from '../../models/Quotation.js';
import QuotationChange from '../../models/QuotationChange.js';

export const quotationResolvers = {
  Query: {
    getQuotations: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Super Admin and Admin can see all quotations
      // Client can only see quotations where they are the client (clientId matches)
      // Others can only see their own created quotations
      let filter = {};
      if (context.user.role === 'Client') {
        filter = { clientId: context.user.userId || context.user.id };
      } else if (!['Super Admin', 'Admin'].includes(context.user.role)) {
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
      // Super Admin and Admin can view all quotations
      if (['Super Admin', 'Admin'].includes(context.user.role)) {
        // Allow access
      }
      // Client can view quotations where they are the client (clientId matches)
      else if (context.user.role === 'Client') {
        if (!quotation.clientId || quotation.clientId.toString() !== userId) {
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
      // Client can view change history for quotations where they are the client
      else if (context.user.role === 'Client') {
        if (!quotation.clientId || quotation.clientId.toString() !== userId) {
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
    createQuotation: async (_, { input }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Only allow certain roles to create quotations
      if (!['Super Admin', 'Admin', 'AdminTeam'].includes(context.user.role)) {
        throw new Error('Not authorized to create quotations');
      }

      // Generate quotation number before creating the model
      const quotationDate = input.quotationDate ? new Date(input.quotationDate) : new Date();
      const dateStr = quotationDate.toISOString().slice(0, 10).replace(/-/g, '');
      
      // Find the last quotation of the day to get the sequence
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

      const quotationData = {
        ...input,
        quotationNo: quotationNo, // Set the generated quotation number
        createdBy: context.user.userId || context.user.id,
        quotationDate: quotationDate,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      };

      const quotation = new Quotation(quotationData);
      await quotation.save();

      const savedQuotation = await Quotation.findById(quotation._id).lean();

      return {
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
      const isAdmin = ['Super Admin', 'Admin', 'AdminTeam'].includes(context.user.role);
      const isCreator = existingQuotation.createdBy?.toString() === userId;
      const isClient = context.user.role === 'Client' && existingQuotation.clientId?.toString() === userId;
      
      if (!isAdmin && !isCreator && !isClient) {
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

