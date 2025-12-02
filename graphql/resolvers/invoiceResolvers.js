import connectDB from '../../lib/mongodb.js';
import Invoice from '../../models/Invoice.js';
import Quotation from '../../models/Quotation.js';
import User from '../../models/User.js';
import Company from '../../models/Company.js';

export const invoiceResolvers = {
  Query: {
    // Get all invoices (with authorization)
    getInvoices: async (_, __, context) => {
      await connectDB();

      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const userId = context.user.userId || context.user.id;
      const userRole = context.user.role;

      let invoices = [];

      if (userRole === 'Super Admin') {
        // Super Admin can see all invoices
        invoices = await Invoice.find()
          .populate('quotationId')
          .populate('customerId')
          .sort({ createdAt: -1 })
          .lean();
      } else if (userRole === 'Admin' || userRole === 'Sales Person') {
        // Admin and Sales Person can see invoices from their company
        const user = await User.findById(userId).lean();
        if (!user || !user.companyId) {
          throw new Error('User company not found');
        }

        invoices = await Invoice.find({ companyId: user.companyId })
          .populate('quotationId')
          .populate('customerId')
          .sort({ createdAt: -1 })
          .lean();
      } else if (userRole === 'Customer') {
        // Customers can only see their own invoices
        // First get the user's email for fallback matching
        const customer = await User.findById(userId).lean();
        const customerEmail = customer?.email?.toLowerCase();
        
        // Escape special regex characters in email
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedEmail = customerEmail ? escapeRegex(customerEmail) : null;
        
        // Try to find invoices by customerId OR by email in billTo
        invoices = await Invoice.find({
          $or: [
            { customerId: userId },
            ...(escapedEmail ? [{ 'billTo.email': { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }] : [])
          ]
        })
          .populate('quotationId')
          .sort({ createdAt: -1 })
          .lean();
          
        // Also update any invoices found by email to have the correct customerId
        if (customerEmail && invoices.length > 0) {
          const invoicesToUpdate = invoices.filter(inv => 
            (!inv.customerId || inv.customerId.toString() !== userId) && 
            inv.billTo?.email?.toLowerCase() === customerEmail
          );
          if (invoicesToUpdate.length > 0) {
            await Invoice.updateMany(
              { _id: { $in: invoicesToUpdate.map(inv => inv._id) } },
              { $set: { customerId: userId } }
            );
            console.log(`[InvoiceResolver] Updated ${invoicesToUpdate.length} invoices with correct customerId`);
          }
        }
      } else {
        throw new Error('Not authorized to view invoices');
      }

      return invoices.map(invoice => ({
        ...invoice,
        id: invoice._id.toString(),
        quotationId: invoice.quotationId?._id?.toString() || invoice.quotationId?.toString() || null,
        companyId: invoice.companyId?.toString() || null,
        customerId: invoice.customerId?._id?.toString() || invoice.customerId?.toString() || null,
        invoiceDate: invoice.invoiceDate?.toISOString() || new Date().toISOString(),
        dueDate: invoice.dueDate?.toISOString(),
        paymentDate: invoice.paymentDate?.toISOString(),
        createdAt: invoice.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: invoice.updatedAt?.toISOString() || new Date().toISOString(),
      }));
    },

    // Get single invoice by ID
    getInvoice: async (_, { id }, context) => {
      await connectDB();

      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const invoice = await Invoice.findById(id)
        .populate('quotationId')
        .populate('customerId')
        .lean();

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const userId = context.user.userId || context.user.id;
      const userRole = context.user.role;

      // Authorization check
      if (userRole === 'Super Admin') {
        // Super Admin can view any invoice
      } else if (userRole === 'Admin' || userRole === 'Sales Person') {
        // Check if invoice belongs to user's company
        const user = await User.findById(userId).lean();
        if (!user || !user.companyId || invoice.companyId.toString() !== user.companyId.toString()) {
          throw new Error('Not authorized to view this invoice');
        }
      } else if (userRole === 'Customer') {
        // Check if invoice belongs to customer
        if (invoice.customerId.toString() !== userId) {
          throw new Error('Not authorized to view this invoice');
        }
      } else {
        throw new Error('Not authorized to view invoices');
      }

      return {
        ...invoice,
        id: invoice._id.toString(),
        quotationId: invoice.quotationId?._id?.toString() || invoice.quotationId?.toString() || null,
        companyId: invoice.companyId?.toString() || null,
        customerId: invoice.customerId?._id?.toString() || invoice.customerId?.toString() || null,
        invoiceDate: invoice.invoiceDate?.toISOString() || new Date().toISOString(),
        dueDate: invoice.dueDate?.toISOString(),
        paymentDate: invoice.paymentDate?.toISOString(),
        createdAt: invoice.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: invoice.updatedAt?.toISOString() || new Date().toISOString(),
      };
    },

    // Get invoice by quotation ID
    getInvoiceByQuotation: async (_, { quotationId }, context) => {
      await connectDB();

      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const invoice = await Invoice.findOne({ quotationId })
        .populate('quotationId')
        .populate('customerId')
        .lean();

      if (!invoice) {
        return null;
      }

      const userId = context.user.userId || context.user.id;
      const userRole = context.user.role;

      // Authorization check
      if (userRole === 'Super Admin') {
        // Super Admin can view any invoice
      } else if (userRole === 'Admin' || userRole === 'Sales Person') {
        // Check if invoice belongs to user's company
        const user = await User.findById(userId).lean();
        if (!user || !user.companyId || invoice.companyId.toString() !== user.companyId.toString()) {
          throw new Error('Not authorized to view this invoice');
        }
      } else if (userRole === 'Customer') {
        // Check if invoice belongs to customer
        if (invoice.customerId.toString() !== userId) {
          throw new Error('Not authorized to view this invoice');
        }
      } else {
        throw new Error('Not authorized to view invoices');
      }

      return {
        ...invoice,
        id: invoice._id.toString(),
        quotationId: invoice.quotationId?._id?.toString() || invoice.quotationId?.toString() || null,
        companyId: invoice.companyId?.toString() || null,
        customerId: invoice.customerId?._id?.toString() || invoice.customerId?.toString() || null,
        invoiceDate: invoice.invoiceDate?.toISOString() || new Date().toISOString(),
        dueDate: invoice.dueDate?.toISOString(),
        paymentDate: invoice.paymentDate?.toISOString(),
        createdAt: invoice.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: invoice.updatedAt?.toISOString() || new Date().toISOString(),
      };
    },
  },
};
