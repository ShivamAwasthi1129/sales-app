'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getCurrentUserFromToken } from '../../lib/auth';

export default function RequestOfferModal({ isOpen, onClose, quotation }) {
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const user = getCurrentUserFromToken();
    setCurrentUser(user);
  }, []);

  // Set default message when modal opens
  useEffect(() => {
    if (isOpen && quotation && currentUser) {
      const defaultMessage = `Dear ${quotation.from?.businessName || 'Sales Team'},

I am writing to request a better offer for Quotation #${quotation.quotationNo}.

After reviewing the quotation for a total amount of ${quotation.currency} ${quotation.totalAmount?.toFixed(2) || '0.00'}, I would appreciate if you could provide:

- Any available discounts or promotional offers
- Flexible payment terms
- Volume-based pricing (if applicable)
- Any other cost-saving options

I am very interested in proceeding with this purchase and would greatly appreciate your consideration.

Thank you for your time and assistance.

Best regards,
${currentUser.name || 'Customer'}
${currentUser.email || ''}`;

      setMessage(defaultMessage);
    }
  }, [isOpen, quotation, currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setLoading(true);

    try {
      // Send offer request email
      const response = await fetch('/api/quotations/request-offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quotationId: quotation.id,
          quotationNo: quotation.quotationNo,
          message: message,
          customerName: currentUser?.name || 'Customer',
          customerEmail: currentUser?.email || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send request');
      }

      toast.success('✅ Your offer request has been sent successfully!');
      onClose();
      setMessage('');
    } catch (error) {
      console.error('Error sending offer request:', error);
      toast.error(error.message || 'Failed to send offer request');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal panel */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl transform transition-all w-full max-w-2xl z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Request for Better Offer</h3>
              <p className="text-yellow-100 text-sm mt-1">Quotation: {quotation?.quotationNo}</p>
            </div>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">About This Request:</p>
                <p>
                  Your message will be sent directly to the sales person assigned to this quotation.
                  They will review your request and get back to you as soon as possible.
                </p>
              </div>
            </div>
          </div>

          {/* Quotation Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-gray-900 mb-2">Quotation Summary:</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Total Amount:</span>
                <p className="font-semibold text-gray-900">
                  {quotation?.currency} {quotation?.totalAmount?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <p className="font-semibold text-gray-900 capitalize">{quotation?.status}</p>
              </div>
              <div>
                <span className="text-gray-600">Sales Person:</span>
                <p className="font-semibold text-gray-900">{quotation?.from?.salesPersonName || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600">Items:</span>
                <p className="font-semibold text-gray-900">{quotation?.lineItems?.length || 0} item(s)</p>
              </div>
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows="12"
              required
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none"
              placeholder="Type your message here..."
            />
            <p className="mt-2 text-xs text-gray-500">
              Feel free to edit the message above to include specific details about your requirements.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-colors disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

