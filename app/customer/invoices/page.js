'use client';

import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { useState } from 'react';
import { toast } from 'react-toastify';

const GET_INVOICES = gql`
  query GetInvoices {
    getInvoices {
      id
      invoiceNo
      quotationNo
      quotationId
      invoiceDate
      dueDate
      billTo {
        businessName
        email
        phone
        address
        country
      }
      billFrom {
        businessName
        email
        phone
        address
        country
      }
      lineItems {
        itemName
        description
        quantity
        rate
        amount
        total
      }
      currency
      subtotal
      taxRate
      totalTax
      discount
      totalAmount
      paymentStatus
      paymentMethod
      paymentDate
      paymentTransactionId
      notes
      terms
      status
      createdAt
      updatedAt
    }
  }
`;

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  overdue: 'bg-orange-100 text-orange-800',
};

const PAYMENT_STATUS_COLORS = {
  unpaid: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  partially_paid: 'bg-blue-100 text-blue-800',
  overdue: 'bg-red-100 text-red-800',
};

export default function CustomerInvoicesPage() {
  const { data, loading, error, refetch } = useQuery(GET_INVOICES, {
    fetchPolicy: 'cache-and-network',
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const invoices = data?.getInvoices || [];

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount, currency) => {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      CAD: '$',
      AUD: '$',
    };
    return `${symbols[currency] || currency} ${amount?.toFixed(2) || '0.00'}`;
  };

  const handleDownloadInvoice = (invoice) => {
    // TODO: Implement PDF download
    toast.info('Invoice download will be available soon');
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        <p className="font-semibold">Error loading invoices</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Invoices & Contracts</h1>
            <p className="text-purple-100 text-lg">View all your invoices and payment history</p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/20 backdrop-blur-lg rounded-xl p-4">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Total Invoices</p>
          <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Paid Invoices</p>
          <p className="text-2xl font-bold text-green-600">
            {invoices.filter(inv => inv.paymentStatus === 'paid').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">
            {invoices.filter(inv => inv.paymentStatus === 'unpaid').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Total Amount Paid</p>
          <p className="text-2xl font-bold text-gray-900">
            ${invoices
              .filter(inv => inv.paymentStatus === 'paid')
              .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
              .toFixed(2)}
          </p>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Recent Invoices</h2>
        </div>
        
        {invoices.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-lg">No invoices found</p>
            <p className="text-sm text-gray-400 mt-2">Invoices will appear here after payment</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{invoice.invoiceNo}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        PAYMENT_STATUS_COLORS[invoice.paymentStatus] || 'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.paymentStatus.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_COLORS[invoice.status] || 'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Quotation:</span> {invoice.quotationNo}
                      </div>
                      <div>
                        <span className="font-medium">Invoice Date:</span> {formatDate(invoice.invoiceDate)}
                      </div>
                      {invoice.paymentDate && (
                        <div>
                          <span className="font-medium">Paid On:</span> {formatDate(invoice.paymentDate)}
                        </div>
                      )}
                      {invoice.dueDate && !invoice.paymentDate && (
                        <div>
                          <span className="font-medium">Due Date:</span> {formatDate(invoice.dueDate)}
                        </div>
                      )}
                      {invoice.paymentMethod && (
                        <div>
                          <span className="font-medium">Method:</span> {invoice.paymentMethod}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right mr-4">
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(invoice.totalAmount, invoice.currency)}
                      </p>
                      {invoice.discount > 0 && (
                        <p className="text-sm text-green-600">
                          Saved: {formatCurrency(invoice.discount, invoice.currency)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => handleDownloadInvoice(invoice)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedInvoice(null)}>
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"></div>
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="text-2xl font-bold text-white">Invoice Details</h3>
                <p className="text-purple-100 text-sm mt-1">{selectedInvoice.invoiceNo}</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/20 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Bill From</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p className="font-medium text-gray-900">{selectedInvoice.billFrom.businessName}</p>
                    <p>{selectedInvoice.billFrom.email}</p>
                    {selectedInvoice.billFrom.phone && <p>{selectedInvoice.billFrom.phone}</p>}
                    {selectedInvoice.billFrom.address && <p>{selectedInvoice.billFrom.address}</p>}
                    {selectedInvoice.billFrom.country && <p>{selectedInvoice.billFrom.country}</p>}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Bill To</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p className="font-medium text-gray-900">{selectedInvoice.billTo.businessName}</p>
                    <p>{selectedInvoice.billTo.email}</p>
                    {selectedInvoice.billTo.phone && <p>{selectedInvoice.billTo.phone}</p>}
                    {selectedInvoice.billTo.address && <p>{selectedInvoice.billTo.address}</p>}
                    {selectedInvoice.billTo.country && <p>{selectedInvoice.billTo.country}</p>}
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Line Items</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedInvoice.lineItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <p className="font-medium">{item.itemName}</p>
                            {item.description && (
                              <p className="text-xs text-gray-500">{item.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {formatCurrency(item.rate, selectedInvoice.currency)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                            {formatCurrency(item.total, selectedInvoice.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(selectedInvoice.subtotal, selectedInvoice.currency)}
                      </span>
                    </div>
                    {selectedInvoice.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount:</span>
                        <span className="font-medium">
                          -{formatCurrency(selectedInvoice.discount, selectedInvoice.currency)}
                        </span>
                      </div>
                    )}
                    {selectedInvoice.totalTax > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax ({selectedInvoice.taxRate}%):</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(selectedInvoice.totalTax, selectedInvoice.currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-indigo-600">
                        {formatCurrency(selectedInvoice.totalAmount, selectedInvoice.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              {selectedInvoice.paymentDate && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="font-semibold text-green-900">Payment Received</h4>
                  </div>
                  <div className="text-sm text-green-800 space-y-1">
                    <p><span className="font-medium">Paid On:</span> {formatDate(selectedInvoice.paymentDate)}</p>
                    <p><span className="font-medium">Method:</span> {selectedInvoice.paymentMethod}</p>
                    {selectedInvoice.paymentTransactionId && (
                      <p><span className="font-medium">Transaction ID:</span> {selectedInvoice.paymentTransactionId}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes and Terms */}
              {(selectedInvoice.notes || selectedInvoice.terms) && (
                <div className="space-y-4">
                  {selectedInvoice.notes && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedInvoice.notes}</p>
                    </div>
                  )}
                  {selectedInvoice.terms && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Terms & Conditions</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedInvoice.terms}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
