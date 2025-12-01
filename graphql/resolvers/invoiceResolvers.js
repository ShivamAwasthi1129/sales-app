import connectDB from '../../lib/mongodb.js';
import Invoice from '../../models/Invoice.js';
import Quotation from '../../models/Quotation.js';
import User from '../../models/User.js';
import { createQuotationPaymentLink } from '../../lib/stripe.js';

export const invoiceResolvers = {
  Query: {
    getInvoices: async (_, __, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      let filter = {};
      
      // Customer can only see their own invoices
      if (context.user.role === 'Customer') {
        filter.customerId = context.user.userId || context.user.id;
      } 
      // Admin and Sales Person can see their company's invoices
      else if (['Admin', 'Sales Person'].includes(context.user.role)) {
        if (!context.user.companyId) {
          throw new Error('Company information missing');
        }
        filter.companyId = context.user.companyId;
      }
      // Super Admin sees all invoices (no filter)

      const invoices = await Invoice.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      return invoices.map(invoice => ({
        ...invoice,
        id: invoice._id.toString(),
        quotationId: invoice.quotationId?.toString(),
        companyId: invoice.companyId?.toString(),
        customerId: invoice.customerId?.toString(),
        createdBy: invoice.createdBy?.toString(),
        invoiceDate: invoice.invoiceDate?.toISOString() || new Date().toISOString(),
        dueDate: invoice.dueDate?.toISOString(),
        paymentDate: invoice.paymentDate?.toISOString(),
        createdAt: invoice.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: invoice.updatedAt?.toISOString() || new Date().toISOString(),
      }));
    },

    getInvoice: async (_, { id }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const invoice = await Invoice.findById(id).lean();
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Check permissions
      const userId = context.user.userId || context.user.id;
      const isCustomer = context.user.role === 'Customer' && invoice.customerId?.toString() === userId;
      const isCompanyUser = context.user.companyId && invoice.companyId?.toString() === context.user.companyId;
      const isSuperAdmin = context.user.role === 'Super Admin';

      if (!isCustomer && !isCompanyUser && !isSuperAdmin) {
        throw new Error('Not authorized to view this invoice');
      }

      return {
        ...invoice,
        id: invoice._id.toString(),
        quotationId: invoice.quotationId?.toString(),
        companyId: invoice.companyId?.toString(),
        customerId: invoice.customerId?.toString(),
        createdBy: invoice.createdBy?.toString(),
        invoiceDate: invoice.invoiceDate?.toISOString() || new Date().toISOString(),
        dueDate: invoice.dueDate?.toISOString(),
        paymentDate: invoice.paymentDate?.toISOString(),
        createdAt: invoice.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: invoice.updatedAt?.toISOString() || new Date().toISOString(),
      };
    },

    getInvoiceByQuotation: async (_, { quotationId }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const invoice = await Invoice.findOne({ quotationId }).lean();
      
      if (!invoice) {
        return null; // Invoice doesn't exist yet
      }

      // Check permissions
      const userId = context.user.userId || context.user.id;
      const isCustomer = context.user.role === 'Customer' && invoice.customerId?.toString() === userId;
      const isCompanyUser = context.user.companyId && invoice.companyId?.toString() === context.user.companyId;
      const isSuperAdmin = context.user.role === 'Super Admin';

      if (!isCustomer && !isCompanyUser && !isSuperAdmin) {
        throw new Error('Not authorized to view this invoice');
      }

      return {
        ...invoice,
        id: invoice._id.toString(),
        quotationId: invoice.quotationId?.toString(),
        companyId: invoice.companyId?.toString(),
        customerId: invoice.customerId?.toString(),
        createdBy: invoice.createdBy?.toString(),
        invoiceDate: invoice.invoiceDate?.toISOString() || new Date().toISOString(),
        dueDate: invoice.dueDate?.toISOString(),
        paymentDate: invoice.paymentDate?.toISOString(),
        createdAt: invoice.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: invoice.updatedAt?.toISOString() || new Date().toISOString(),
      };
    },
  },

  Mutation: {
    createPaymentLinkForQuotation: async (_, { quotationId }, context) => {
      await connectDB();
      
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      // Get quotation
      const quotation = await Quotation.findById(quotationId).lean();
      
      if (!quotation) {
        throw new Error('Quotation not found');
      }

      // Check if quotation is in 'sent' status
      if (quotation.status !== 'sent') {
        throw new Error('Payment link can only be created for quotations with "sent" status');
      }

      // Check if user is authorized (customer or company user)
      const userId = context.user.userId || context.user.id;
      const isCustomer = context.user.role === 'Customer';
      const isCompanyUser = context.user.companyId && quotation.createdBy?.toString();
      
      // For customer, verify they are the recipient
      if (isCustomer) {
        const customerUser = await User.findById(userId).lean();
        if (!customerUser || customerUser.email.toLowerCase() !== quotation.to?.email?.toLowerCase()) {
          throw new Error('Not authorized to pay this quotation');
        }
      }

      // Create payment link using Stripe
      try {
        const paymentUrl = await createQuotationPaymentLink(quotation);
        
        console.log('[InvoiceResolver] Payment link created:', paymentUrl);
        
        // Update quotation with payment link
        await Quotation.findByIdAndUpdate(quotationId, {
          'payment.paymentLink': paymentUrl,
          'payment.paymentStatus': 'pending',
        });

        return paymentUrl;
      } catch (error) {
        console.error('[InvoiceResolver] Error creating payment link:', error);
        throw new Error(`Failed to create payment link: ${error.message}`);
      }
    },
  },
};

