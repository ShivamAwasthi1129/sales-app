// components/RequestOfferModal.js

"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { getCurrentUserFromToken } from "../../lib/auth";

export default function RequestOfferModal({ isOpen, onClose, quotation }) {
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState("");
  const [successState, setSuccessState] = useState(false);

  useEffect(() => {
    const user = getCurrentUserFromToken();
    setCurrentUser(user);
  }, []);

  // Set default message when modal opens
  useEffect(() => {
    if (isOpen && quotation && currentUser) {
      const defaultMessage = `Dear ${quotation.from?.businessName || "Sales Team"
        },

I am writing to request a better offer for Quotation #${quotation.quotationNo}.

After reviewing the quotation for a total amount of ${quotation.currency} ${quotation.totalAmount?.toFixed(2) || "0.00"
        }, I would appreciate if you could provide:

- Any available discounts or promotional offers
- Flexible payment terms
- Volume-based pricing (if applicable)
- Any other cost-saving options

I am very interested in proceeding with this purchase and would greatly appreciate your consideration.

Thank you for your time and assistance.

Best regards,
${currentUser.name || "Customer"}
${currentUser.email || ""}`;

      setMessage(defaultMessage);
    }
  }, [isOpen, quotation, currentUser]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setLoading(true);

    try {
      // Send offer request email
      const response = await fetch("/api/quotations/request-offer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quotationId: quotation.id,
          quotationNo: quotation.quotationNo,
          message: message,
          customerName: currentUser?.name || "Customer",
          customerEmail: currentUser?.email || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send request");
      }

      // Show success state with animation
      setSuccessState(true);
      toast.success("✅ Your offer request has been sent successfully!");

      // Auto-close modal after showing success for 2.5 seconds
      setTimeout(() => {
        onClose();
        setMessage("");
        setSuccessState(false);
      }, 2500);
    } catch (error) {
      console.error("Error sending offer request:", error);
      toast.error(error.message || "Failed to send offer request");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Success Screen
  if (successState) {
    return (
      <div
        className="fixed inset-0 z-9999 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Background overlay */}
        <div
          className="absolute inset-0 bg-gray-900 transition-opacity"
          style={{ opacity: 0.75 }}
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div
          className="relative bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all w-full max-w-md z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8 text-center">
            {/* Success Animation */}
            <div className="mb-6 relative">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center shadow-lg">
                <svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              Request Sent Successfully!
            </h3>
            <p className="text-gray-600 mb-2">
              Your offer request has been sent to the sales team.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              They will review your request and get back to you soon via email.
            </p>

            {/* Auto-closing indicator */}
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Closing automatically...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-gray-900 transition-opacity"
        style={{ opacity: 0.75 }}
        onClick={onClose}
      ></div>

      {/* Modal panel */}
      <div
        className={`relative bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all w-full max-w-2xl max-h-[90vh] flex flex-col z-10 ${loading ? "pointer-events-none" : ""
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-gray-700 font-semibold text-base">
                Sending your request...
              </p>
              <p className="text-gray-500 text-sm mt-2">Please wait a moment</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-blue-900 rounded-t-xl px-6 py-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-white">
                Request for Better Offer
              </h3>
              <p className="text-white/90 text-sm mt-1 font-medium">
                Quotation: {quotation?.quotationNo}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="bg-white p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Info Box */}
            <div className="bg-blue-50 rounded-lg p-5 border border-blue-100 shadow-sm">
              <div className="flex items-start">
                <div className="shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <p className="font-semibold text-blue-900 mb-3 text-base">
                    About This Request
                  </p>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>
                        Your message will be sent directly to{" "}
                        <strong>
                          {quotation?.from?.salesPersonName || "the sales team"}
                        </strong>
                      </span>
                    </p>
                    <p className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>
                        You will receive a response via email within{" "}
                        <strong>24-48 hours</strong>
                      </span>
                    </p>
                    <p className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>
                        Feel free to customize the message below with your
                        specific requirements
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quotation Summary */}
            <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                Quotation Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <span className="text-xs text-gray-600 uppercase tracking-wide font-semibold block mb-1">
                    Total Amount
                  </span>
                  <p className="font-bold text-gray-900">
                    {quotation?.currency}{" "}
                    {quotation?.totalAmount?.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <span className="text-xs text-gray-600 uppercase tracking-wide font-semibold block mb-1">
                    Status
                  </span>
                  <p className="font-semibold text-gray-900 capitalize">
                    {quotation?.status}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <span className="text-xs text-gray-600 uppercase tracking-wide font-semibold block mb-1">
                    Sales Person
                  </span>
                  <p className="font-semibold text-gray-900">
                    {quotation?.from?.salesPersonName || "N/A"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <span className="text-xs text-gray-600 uppercase tracking-wide font-semibold block mb-1">
                    Items
                  </span>
                  <p className="font-semibold text-gray-900">
                    {quotation?.lineItems?.length || 0} item(s)
                  </p>
                </div>
              </div>
            </div>

            {/* Message Textarea */}
            <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Your Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows="12"
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm text-gray-900 bg-white"
                placeholder="Type your message here..."
              />
              <p className="mt-2 text-xs text-gray-500">
                Feel free to edit the message above to include specific details
                about your requirements.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-900 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    Send Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
