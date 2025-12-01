'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getCurrentUserFromToken } from '../../lib/auth';

export default function RequestOfferModal({ isOpen, onClose, quotation }) {
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState('');
  const [successState, setSuccessState] = useState(false);

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

      // Show success state with animation
      setSuccessState(true);
      toast.success('✅ Your offer request has been sent successfully!');
      
      // Auto-close modal after showing success for 2.5 seconds
      setTimeout(() => {
        onClose();
        setMessage('');
        setSuccessState(false);
      }, 2500);
    } catch (error) {
      console.error('Error sending offer request:', error);
      toast.error(error.message || 'Failed to send offer request');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Success Screen
  if (successState) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"></div>
        <div className="relative bg-white rounded-2xl shadow-2xl transform transition-all w-full max-w-md z-10 animate-fadeIn">
          <div className="p-8 text-center">
            {/* Success Animation */}
            <div className="mb-6 relative">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl animate-bounce">
                <svg className="w-12 h-12 text-white animate-checkmark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {/* Confetti circles */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full absolute animate-confetti-1"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full absolute animate-confetti-2"></div>
                <div className="w-3 h-3 bg-pink-400 rounded-full absolute animate-confetti-3"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full absolute animate-confetti-4"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full absolute animate-confetti-5"></div>
                <div className="w-2 h-2 bg-orange-400 rounded-full absolute animate-confetti-6"></div>
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Request Sent Successfully! 🎉</h3>
            <p className="text-gray-600 mb-2">
              Your offer request has been sent to the sales team.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              They will review your request and get back to you soon via email.
            </p>
            
            {/* Auto-closing indicator */}
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Closing automatically...</span>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes checkmark {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }
          @keyframes confetti {
            0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
            100% { transform: translate(var(--x), var(--y)) rotate(360deg); opacity: 0; }
          }
          .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
          .animate-checkmark { animation: checkmark 0.6s ease-out 0.2s backwards; }
          .animate-confetti-1 { --x: -40px; --y: -60px; animation: confetti 1s ease-out; }
          .animate-confetti-2 { --x: 50px; --y: -70px; animation: confetti 1.1s ease-out; }
          .animate-confetti-3 { --x: -60px; --y: -40px; animation: confetti 0.9s ease-out; }
          .animate-confetti-4 { --x: 70px; --y: -50px; animation: confetti 1.2s ease-out; }
          .animate-confetti-5 { --x: -30px; --y: -80px; animation: confetti 1s ease-out; }
          .animate-confetti-6 { --x: 40px; --y: -90px; animation: confetti 1.1s ease-out; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal panel */}
      <div
        className={`relative bg-white rounded-2xl shadow-2xl transform transition-all w-full max-w-2xl z-10 ${loading ? 'pointer-events-none' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent mb-4"></div>
              <p className="text-gray-700 font-semibold text-lg">Sending your request...</p>
              <p className="text-gray-500 text-sm mt-2">Please wait a moment</p>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Request for Better Offer</h3>
              <p className="text-yellow-100 text-sm mt-1">Quotation: {quotation?.quotationNo}</p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <p className="font-bold text-blue-900 mb-2 text-base">📧 About This Request</p>
                <div className="text-sm text-blue-800 space-y-2">
                  <p className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>Your message will be sent directly to <strong>{quotation?.from?.salesPersonName || 'the sales team'}</strong></span>
                  </p>
                  <p className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>You will receive a response via email within <strong>24-48 hours</strong></span>
                  </p>
                  <p className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>Feel free to customize the message below with your specific requirements</span>
                  </p>
                </div>
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
              className="relative px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="animate-pulse">Sending your request...</span>
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

