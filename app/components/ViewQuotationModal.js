'use client';

import { useEffect, useState } from 'react';
import ChangeHistory from './ChangeHistory';
import { downloadQuotationPDF } from '../../lib/pdfGenerator';
import { getCurrentUserFromToken } from '../../lib/auth';
import RequestOfferModal from './RequestOfferModal';
import { useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';

const CREATE_PAYMENT_LINK = gql`
  mutation CreatePaymentLinkForQuotation($quotationId: ID!) {
    createPaymentLinkForQuotation(quotationId: $quotationId)
  }
`;

const MARK_QUOTATION_AS_VIEWED = gql`
  mutation MarkQuotationAsViewed($quotationId: ID!, $viewerEmail: String) {
    markQuotationAsViewed(quotationId: $quotationId, viewerEmail: $viewerEmail) {
      id
      status
      viewedAt
      viewedBy
    }
  }
`;

export default function ViewQuotationModal({ isOpen, onClose, quotation }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [showRequestOfferModal, setShowRequestOfferModal] = useState(false);
  const [isCreatingPaymentLink, setIsCreatingPaymentLink] = useState(false);
  
  const [createPaymentLink] = useMutation(CREATE_PAYMENT_LINK);
  const [markAsViewed] = useMutation(MARK_QUOTATION_AS_VIEWED);

  useEffect(() => {
    const user = getCurrentUserFromToken();
    setCurrentUser(user);
  }, []);

  // Mark quotation as viewed when customer opens it
  useEffect(() => {
    const markQuotationViewed = async () => {
      if (isOpen && quotation && currentUser?.role === 'Customer' && quotation.status === 'sent') {
        try {
          await markAsViewed({
            variables: {
              quotationId: quotation.id,
              viewerEmail: currentUser.email
            }
          });
          console.log('[ViewQuotationModal] Marked quotation as viewed');
        } catch (error) {
          console.error('[ViewQuotationModal] Error marking as viewed:', error);
          // Don't show error to user - this is a background operation
        }
      }
    };
    
    markQuotationViewed();
  }, [isOpen, quotation, currentUser, markAsViewed]);
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

  const handlePayNow = async () => {
    try {
      setIsCreatingPaymentLink(true);
      const { data } = await createPaymentLink({
        variables: { quotationId: quotation.id }
      });
      
      if (data?.createPaymentLinkForQuotation) {
        // Open payment link in new tab
        window.open(data.createPaymentLinkForQuotation, '_blank');
        toast.success('Opening payment page...');
      }
    } catch (error) {
      console.error('Error creating payment link:', error);
      toast.error(error.message || 'Failed to create payment link');
    } finally {
      setIsCreatingPaymentLink(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'viewed':
        return 'bg-purple-100 text-purple-800';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in-up" onClick={onClose}>
      {/* Background overlay with blur */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/60 via-indigo-900/40 to-purple-900/60 backdrop-blur-md" onClick={onClose}></div>

      {/* Modal panel with 3D effect */}
      <div
        className="relative glass-effect rounded-3xl shadow-2xl transform transition-all duration-500 w-full max-w-5xl max-h-[90vh] overflow-hidden z-10 border-2 border-white/30 card-3d animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-8 py-6 flex items-center justify-between relative overflow-hidden">
          {/* Animated background orbs */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <h3 className="text-3xl font-black text-white drop-shadow-lg">📄 Quotation Details</h3>
            <p className="text-white/90 text-sm mt-2 font-bold">{quotation.quotationNo}</p>
          </div>
          <div className="flex items-center space-x-3 relative z-10">
            {/* Download Quotation PDF */}
            <button
              onClick={() => downloadQuotationPDF(quotation)}
              className="glass-effect hover:bg-white/40 text-white px-4 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center space-x-2 text-sm border border-white/30 hover:scale-105 hover:shadow-xl"
              title="Download Quotation PDF"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Quotation</span>
            </button>
            
            {/* Pay Now Button - Only for customers with 'sent' or 'viewed' status and not yet paid */}
            {currentUser?.role === 'Customer' && ['sent', 'viewed'].includes(quotation.status) && quotation.payment?.paymentStatus !== 'paid' && (
              <button
                onClick={handlePayNow}
                disabled={isCreatingPaymentLink}
                className={`${
                  isCreatingPaymentLink ? 'bg-green-400' : 'bg-green-500 hover:bg-green-600'
                } text-white px-5 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center space-x-2 text-sm shadow-lg hover:scale-105 hover:shadow-xl border border-green-400/50 ${
                  isCreatingPaymentLink ? 'cursor-not-allowed' : ''
                }`}
                title="Pay Now"
              >
                {isCreatingPaymentLink ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Pay Now</span>
                  </>
                )}
              </button>
            )}
            
            {/* Download Invoice PDF - Only if invoice exists and user is customer */}
            {currentUser?.role === 'Customer' && quotation.invoiceNo && quotation.invoiceId && (
              <button
                onClick={async () => {
                  try {
                    const token = Cookies.get('token');
                    if (!token) {
                      toast.error('Authentication token not found. Please log in again.');
                      return;
                    }
                    const response = await fetch(`/api/invoice/download?id=${quotation.invoiceId}`, {
                      headers: {
                        'Authorization': `Bearer ${token}`,
                      },
                    });

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(errorData.error || 'Failed to download invoice');
                    }

                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Invoice-${quotation.invoiceNo}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    toast.success('Invoice downloaded successfully');
                  } catch (error) {
                    console.error('Error downloading invoice:', error);
                    toast.error(error.message || 'Failed to download invoice');
                  }
                }}
                className="bg-green-500/90 hover:bg-green-600 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 text-sm"
                title="Download Invoice PDF"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Invoice</span>
              </button>
            )}
            
            {/* Request for Offer - Only for customers and not for paid quotations */}
            {currentUser?.role === 'Customer' && quotation.status !== 'paid' && (
              <button
                onClick={() => setShowRequestOfferModal(true)}
                className="bg-yellow-500/90 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 text-sm"
                title="Request for Better Offer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span>Request Offer</span>
              </button>
            )}
            
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
                {quotation.couponCode && quotation.couponDiscount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Coupon Discount ({quotation.couponCode}):</span>
                    <span className="font-medium">
                      -{getCurrencySymbol(quotation.currency)}{quotation.couponDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
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
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <p className="text-sm font-semibold text-blue-900">Active Subscription</p>
                  </div>
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Subscription ID:</strong> <span className="font-mono text-xs">{quotation.payment.subscriptionId}</span>
                  </p>
                  {quotation.lineItems?.some(item => item.isSubscription) && (
                    <div className="mt-2 space-y-1">
                      {quotation.lineItems
                        .filter(item => item.isSubscription)
                        .map((item, idx) => (
                          <div key={idx} className="text-xs text-blue-700 bg-white/50 p-2 rounded">
                            <strong>{item.itemName}</strong> - {getCurrencySymbol(quotation.currency)}{item.subscriptionPrice?.toFixed(2) || item.total.toFixed(2)}/{item.subscriptionDetails?.interval || 'month'}
                          </div>
                        ))}
                    </div>
                  )}
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
      
      {/* Request for Offer Modal */}
      <RequestOfferModal 
        isOpen={showRequestOfferModal}
        onClose={() => setShowRequestOfferModal(false)}
        quotation={quotation}
      />
    </div>
  );
}

