'use client';

import { useEffect } from 'react';
import ChangeHistory from './ChangeHistory';
import { downloadQuotationPDF } from '../../lib/pdfGenerator';

export default function ViewQuotationModal({ isOpen, onClose, quotation }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !quotation) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-orange-100 text-orange-800';
      case 'paid':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCurrencySymbol = (currency) => {
    const symbols = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': '$',
      'AUD': '$',
    };
    return symbols[currency] || '$';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal panel */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl transform transition-all w-full max-w-5xl max-h-[90vh] overflow-hidden z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">Quotation Details</h3>
            <p className="text-indigo-100 text-sm mt-1">{quotation.quotationNo}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => downloadQuotationPDF(quotation)}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download PDF</span>
            </button>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(quotation.status)}`}>
              {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
            </span>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/20 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-8rem)] p-6">
          {/* Header Section */}
          <div className="border-b border-gray-200 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Quotation</h2>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Quotation Date:</span> {formatDate(quotation.quotationDate)}
                  </div>
                  {quotation.dueDate && (
                    <div>
                      <span className="font-medium">Due Date:</span> {formatDate(quotation.dueDate)}
                    </div>
                  )}
                </div>
              </div>
              {quotation.businessLogo && (
                <div className="w-32 h-32 border-2 border-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={quotation.businessLogo}
                    alt="Business Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* From and To Section */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Quotation From */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quotation From
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Business Name:</span>
                  <p className="text-gray-900">{quotation.from.businessName}</p>
                </div>
                {quotation.from.country && (
                  <div>
                    <span className="font-medium text-gray-700">Country:</span>
                    <p className="text-gray-900">{quotation.from.country}</p>
                  </div>
                )}
                {quotation.from.phone && (
                  <div>
                    <span className="font-medium text-gray-700">Phone:</span>
                    <p className="text-gray-900">{quotation.from.phone}</p>
                  </div>
                )}
                {quotation.from.email && (
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <p className="text-gray-900">{quotation.from.email}</p>
                  </div>
                )}
                {quotation.from.address && (
                  <div>
                    <span className="font-medium text-gray-700">Address:</span>
                    <p className="text-gray-900">{quotation.from.address}</p>
                  </div>
                )}
                {quotation.from.salesPersonName && (
                  <div>
                    <span className="font-medium text-gray-700">Sales Person Name:</span>
                    <p className="text-gray-900">{quotation.from.salesPersonName}</p>
                  </div>
                )}
                {quotation.from.salesPersonId && (
                  <div>
                    <span className="font-medium text-gray-700">Sales Person ID:</span>
                    <p className="text-gray-900">{quotation.from.salesPersonId}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quotation For */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quotation For
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Business Name:</span>
                  <p className="text-gray-900">{quotation.to.businessName}</p>
                </div>
                {quotation.to.country && (
                  <div>
                    <span className="font-medium text-gray-700">Country:</span>
                    <p className="text-gray-900">{quotation.to.country}</p>
                  </div>
                )}
                {quotation.to.phone && (
                  <div>
                    <span className="font-medium text-gray-700">Phone:</span>
                    <p className="text-gray-900">{quotation.to.phone}</p>
                  </div>
                )}
                {quotation.to.email && (
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <p className="text-gray-900">{quotation.to.email}</p>
                  </div>
                )}
                {quotation.to.address && (
                  <div>
                    <span className="font-medium text-gray-700">Address:</span>
                    <p className="text-gray-900">{quotation.to.address}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-indigo-600 text-white">
                    <th className="px-4 py-3 text-left text-sm font-semibold">Item</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Quantity</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Rate</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Amount</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.lineItems && quotation.lineItems.length > 0 ? (
                    quotation.lineItems.map((item, index) => (
                      <tr key={item.id || index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-start space-x-3">
                            {item.imageUrl && (
                              <img
                                src={item.imageUrl}
                                alt={item.itemName}
                                className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{item.itemName}</div>
                              {item.description && (
                                <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                              )}
                              {item.isSubscription && (
                                <div className="mt-1 flex items-center space-x-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                    Subscription
                                  </span>
                                  {item.subscriptionPrice && (
                                    <span className="text-xs text-gray-600">
                                      {getCurrencySymbol(quotation.currency)}{item.subscriptionPrice.toFixed(2)}/{item.subscriptionDetails?.interval || 'month'}
                                    </span>
                                  )}
                                </div>
                              )}
                              {item.selectedOptions && item.selectedOptions.length > 0 && (
                                <div className="mt-1 text-xs text-gray-600">
                                  {item.selectedOptions.map((opt, i) => (
                                    <div key={i}>• {opt.attributeName}: {opt.optionLabel}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-3 text-center text-gray-900">
                          {getCurrencySymbol(quotation.currency)}{item.rate.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-900 font-medium">
                          {getCurrencySymbol(quotation.currency)}{item.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-900 font-bold">
                          {getCurrencySymbol(quotation.currency)}{item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                        No items in this quotation
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="flex justify-end mb-8">
            <div className="w-96 bg-gray-50 rounded-lg p-6">
              <div className="space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-medium">
                    {getCurrencySymbol(quotation.currency)}{quotation.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-gray-300 pt-3 flex justify-between text-lg font-bold text-gray-900">
                  <span>Total Amount:</span>
                  <span>
                    {getCurrencySymbol(quotation.currency)}{quotation.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          {quotation.payment && quotation.payment.paymentStatus === 'paid' && (
            <div className="mb-8 p-6 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-900">Payment Completed</h3>
                  <p className="text-sm text-emerald-700">This quotation has been paid successfully</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white rounded-lg p-4 border border-emerald-200">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Amount Paid</p>
                  <p className="text-lg font-bold text-emerald-700">
                    {quotation.payment.currency?.toUpperCase() || quotation.currency} {quotation.payment.amount?.toFixed(2) || quotation.totalAmount.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-emerald-200">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Payment Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {quotation.payment.paidAt ? formatDate(quotation.payment.paidAt) : 'N/A'}
                  </p>
                </div>
                {quotation.payment.paymentMode && (
                  <div className="bg-white rounded-lg p-4 border border-emerald-200">
                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Payment Type</p>
                    <p className="text-lg font-semibold text-gray-900 capitalize">
                      {quotation.payment.paymentMode === 'subscription' ? 'Subscription' : 'One-time Payment'}
                    </p>
                  </div>
                )}
                {quotation.payment.sessionId && (
                  <div className="bg-white rounded-lg p-4 border border-emerald-200">
                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Transaction ID</p>
                    <p className="text-sm font-mono text-gray-700 break-all">
                      {quotation.payment.sessionId}
                    </p>
                  </div>
                )}
              </div>
              {quotation.payment.subscriptionId && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Subscription ID:</strong> <span className="font-mono">{quotation.payment.subscriptionId}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Notes and Terms */}
          {(quotation.notes || quotation.terms) && (
            <div className="grid grid-cols-2 gap-6 mb-8">
              {quotation.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{quotation.notes}</p>
                </div>
              )}
              {quotation.terms && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Terms & Conditions</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{quotation.terms}</p>
                </div>
              )}
            </div>
          )}

          {/* Change History */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <ChangeHistory quotationId={quotation.id} />
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-4 mt-6 text-xs text-gray-500">
            <p>Created: {formatDate(quotation.createdAt)}</p>
            {quotation.updatedAt && quotation.updatedAt !== quotation.createdAt && (
              <p>Last Updated: {formatDate(quotation.updatedAt)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

