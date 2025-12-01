import Invoice from '../models/Invoice.js';
import Quotation from '../models/Quotation.js';
import Company from '../models/Company.js';
import User from '../models/User.js';
import connectDB from './mongodb.js';

/**
 * Generate Invoice from Quotation after successful payment
 * @param {Object} params - Parameters
 * @param {string} params.quotationId - Quotation ID
 * @param {string} params.paymentTransactionId - Payment transaction ID from Stripe
 * @param {string} params.paymentMethod - Payment method (e.g., 'Stripe')
 * @param {Date} params.paymentDate - Payment date
 * @returns {Promise<Object>} Created invoice
 */
export async function generateInvoiceFromQuotation({
  quotationId,
  paymentTransactionId,
  paymentMethod = 'Stripe',
  paymentDate = new Date(),
}) {
  try {
    await connectDB();

    // Fetch the quotation with all details
    const quotation = await Quotation.findById(quotationId).lean();
    
    if (!quotation) {
      throw new Error('Quotation not found');
    }

    // Check if invoice already exists for this quotation
    const existingInvoice = await Invoice.findOne({ quotationId }).lean();
    if (existingInvoice) {
      console.log('[InvoiceGenerator] Invoice already exists for quotation:', quotationId);
      return existingInvoice;
    }

    // Fetch company details
    let company = null;
    if (quotation.from?.businessName) {
      // Try to find company by name
      company = await Company.findOne({ name: quotation.from.businessName }).lean();
    }

    // Fetch customer details
    let customer = null;
    if (quotation.clientId) {
      customer = await User.findById(quotation.clientId).lean();
    }

    // Calculate due date (30 days from invoice date)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Create invoice data
    const invoiceData = {
      quotationId: quotation._id,
      quotationNo: quotation.quotationNo,
      companyId: company?._id || quotation.companyId,
      customerId: customer?._id || quotation.clientId,
      invoiceDate: paymentDate,
      dueDate: dueDate,
      
      // Bill To (Customer)
      billTo: {
        businessName: quotation.to.businessName || customer?.name || 'Customer',
        email: quotation.to.email || customer?.email || '',
        phone: quotation.to.phone || customer?.phone || '',
        address: quotation.to.address || customer?.address || '',
        country: quotation.to.country || 'United States of America (USA)',
      },
      
      // Bill From (Company)
      billFrom: {
        businessName: quotation.from?.businessName || company?.name || 'Company',
        email: quotation.from?.email || company?.email || '',
        phone: quotation.from?.phone || company?.phone || '',
        address: quotation.from?.address || company?.address || '',
        country: quotation.from?.country || 'United States of America (USA)',
      },
      
      // Line Items (copy from quotation)
      lineItems: quotation.lineItems.map(item => ({
        productId: item.productId || null,
        itemName: item.itemName,
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        total: item.total,
        isSubscription: item.isSubscription || false,
        subscriptionDetails: item.subscriptionDetails || null,
        selectedOptions: item.selectedOptions || [],
      })),
      
      // Financial Details
      currency: quotation.currency || 'USD',
      subtotal: quotation.subtotal || 0,
      taxRate: 0,
      totalTax: quotation.totalTax || 0,
      discount: quotation.couponDiscount || 0,
      totalAmount: quotation.totalAmount || 0,
      
      // Payment Information
      paymentStatus: 'paid',
      paymentMethod: paymentMethod,
      paymentDate: paymentDate,
      paymentTransactionId: paymentTransactionId,
      
      // Additional Details
      notes: quotation.notes || '',
      terms: quotation.terms || '',
      status: 'paid',
      
      // Created by
      createdBy: quotation.createdBy || null,
    };

    // Create the invoice
    const invoice = await Invoice.create(invoiceData);
    
    console.log('[InvoiceGenerator] ✅ Invoice created successfully:', invoice.invoiceNo);

    // Update quotation to link the invoice
    await Quotation.findByIdAndUpdate(
      quotationId,
      { 
        invoiceId: invoice._id,
        invoiceNo: invoice.invoiceNo,
      },
      { new: false }
    );

    return invoice;
  } catch (error) {
    console.error('[InvoiceGenerator] Error generating invoice:', error);
    throw new Error(`Failed to generate invoice: ${error.message}`);
  }
}

/**
 * Get invoice by quotation ID
 * @param {string} quotationId - Quotation ID
 * @returns {Promise<Object|null>} Invoice or null
 */
export async function getInvoiceByQuotationId(quotationId) {
  try {
    await connectDB();
    const invoice = await Invoice.findOne({ quotationId }).lean();
    return invoice;
  } catch (error) {
    console.error('[InvoiceGenerator] Error fetching invoice:', error);
    return null;
  }
}

/**
 * Get all invoices for a customer
 * @param {string} customerId - Customer ID
 * @returns {Promise<Array>} Array of invoices
 */
export async function getInvoicesByCustomerId(customerId) {
  try {
    await connectDB();
    const invoices = await Invoice.find({ customerId })
      .populate('quotationId')
      .sort({ createdAt: -1 })
      .lean();
    return invoices;
  } catch (error) {
    console.error('[InvoiceGenerator] Error fetching customer invoices:', error);
    return [];
  }
}

/**
 * Get all invoices for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of invoices
 */
export async function getInvoicesByCompanyId(companyId) {
  try {
    await connectDB();
    const invoices = await Invoice.find({ companyId })
      .populate('quotationId')
      .populate('customerId')
      .sort({ createdAt: -1 })
      .lean();
    return invoices;
  } catch (error) {
    console.error('[InvoiceGenerator] Error fetching company invoices:', error);
    return [];
  }
}

