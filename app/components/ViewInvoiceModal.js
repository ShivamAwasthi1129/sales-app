// components/ViewInvoiceModal.js

"use client";

import { useEffect, useState } from "react";
import ChangeHistory from "./ChangeHistory";
import { downloadInvoicePDF } from "../../lib/pdfGenerator";
import { getCurrentUserFromToken } from "../../lib/auth";
import RequestOfferModal from "./RequestOfferModal";
import { useMutation } from "@apollo/client/react";
import { gql } from "graphql-tag";
import { toast } from "react-toastify";
import Cookies from "js-cookie";

const CREATE_PAYMENT_LINK = gql`
  mutation CreatePaymentLinkForInvoice($invoiceId: ID!) {
    createPaymentLinkForInvoice(invoiceId: $invoiceId)
  }
`;

const MARK_QUOTATION_AS_VIEWED = gql`
  mutation MarkInvoiceAsViewed($invoiceId: ID!, $viewerEmail: String) {
    markInvoiceAsViewed(
      invoiceId: $invoiceId
      viewerEmail: $viewerEmail
    ) {
      id
      status
      viewedAt
      viewedBy
    }
  }
`;

export default function ViewInvoiceModal({ isOpen, onClose, invoice }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [showRequestOfferModal, setShowRequestOfferModal] = useState(false);
  const [isCreatingPaymentLink, setIsCreatingPaymentLink] = useState(false);

  const [createPaymentLink] = useMutation(CREATE_PAYMENT_LINK);
  const [markAsViewed] = useMutation(MARK_QUOTATION_AS_VIEWED);

  useEffect(() => {
    const user = getCurrentUserFromToken();
    setCurrentUser(user);
  }, []);

  // Mark invoice as viewed when customer opens it
  useEffect(() => {
    const markInvoiceViewed = async () => {
      if (
        isOpen &&
        invoice &&
        currentUser?.role === "Customer" &&
        invoice.status === "sent"
      ) {
        try {
          await markAsViewed({
            variables: {
              invoiceId: invoice.id,
              viewerEmail: currentUser.email,
            },
          });
          console.log("[ViewInvoiceModal] Marked invoice as viewed");
        } catch (error) {
          console.error("[ViewInvoiceModal] Error marking as viewed:", error);
          // Don't show error to user - this is a background operation
        }
      }
    };

    markInvoiceViewed();
  }, [isOpen, invoice, currentUser, markAsViewed]);
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

  if (!isOpen || !invoice) return null;

  const handlePayNow = async () => {
    try {
      setIsCreatingPaymentLink(true);
      const { data } = await createPaymentLink({
        variables: { invoiceId: invoice.id },
      });

      if (data?.createPaymentLinkForInvoice) {
        // Open payment link in new tab
        window.open(data.createPaymentLinkForInvoice, "_blank");
        toast.success("Opening payment page...");
      }
    } catch (error) {
      console.error("Error creating payment link:", error);
      toast.error(error.message || "Failed to create payment link");
    } finally {
      setIsCreatingPaymentLink(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      paid: "bg-green-100 text-green-800 border-green-300",
      accepted: "bg-blue-100 text-blue-800 border-blue-300",
      sent: "bg-yellow-100 text-yellow-800 border-yellow-300",
      viewed: "bg-purple-100 text-purple-800 border-purple-300",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      draft: "bg-gray-100 text-gray-800 border-gray-300",
      rejected: "bg-red-100 text-red-800 border-red-300",
      expired: "bg-orange-100 text-orange-800 border-orange-300",
      won: "bg-green-100 text-green-800 border-green-300",
      lost: "bg-red-100 text-red-800 border-red-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const getCurrencySymbol = (currency) => {
    const symbols = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
      CAD: "$",
      AUD: "$",
    };
    return symbols[currency] || "$";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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
        className="relative bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all w-full max-w-5xl max-h-[90vh] flex flex-col z-10"
        onClick={(e) => e.stopPropagation()}
      >
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-white">
                Invoice Details
              </h3>
              <p className="text-white/90 text-sm mt-1 font-medium">
                {invoice.invoiceNo}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Download Invoice PDF */}
            <button
              onClick={() => downloadInvoicePDF(invoice)}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 text-sm border border-white/20"
              title="Download Invoice PDF"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Invoice</span>
            </button>

            {/* Pay Now Button - Only for customers with 'sent' or 'viewed' status and not yet paid */}
            {currentUser?.role === "Customer" &&
              ["sent", "viewed"].includes(invoice.status) &&
              invoice.payment?.paymentStatus !== "paid" && (
                <button
                  onClick={handlePayNow}
                  disabled={isCreatingPaymentLink}
                  className={`${isCreatingPaymentLink
                    ? "bg-green-400 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600"
                    } text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 text-sm border border-green-400/50`}
                  title="Pay Now"
                >
                  {isCreatingPaymentLink ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
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
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span>Pay Now</span>
                    </>
                  )}
                </button>
              )}

            {/* Download Invoice PDF - Only if invoice exists and user is customer */}
            {currentUser?.role === "Customer" &&
              invoice.invoiceNo &&
              invoice.invoiceId && (
                <button
                  onClick={async () => {
                    try {
                      const token = Cookies.get("token");
                      if (!token) {
                        toast.error(
                          "Authentication token not found. Please log in again."
                        );
                        return;
                      }
                      const response = await fetch(
                        `/api/invoice/download?id=${invoice.invoiceId}`,
                        {
                          headers: {
                            Authorization: `Bearer ${token}`,
                          },
                        }
                      );

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(
                          errorData.error || "Failed to download invoice"
                        );
                      }

                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `Invoice-${invoice.invoiceNo}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                      toast.success("Invoice downloaded successfully");
                    } catch (error) {
                      console.error("Error downloading invoice:", error);
                      toast.error(
                        error.message || "Failed to download invoice"
                      );
                    }
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 text-sm border border-white/20"
                  title="Download Invoice PDF"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>Invoice</span>
                </button>
              )}

            {/* Request for Offer - Only for customers and not for paid invoices */}
            {currentUser?.role === "Customer" &&
              invoice.status !== "paid" && (
                <button
                  onClick={() => setShowRequestOfferModal(true)}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 text-sm border border-white/20"
                  title="Request for Better Offer"
                >
                  <svg
                    className="w-4 h-4"
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
                  <span>Request Offer</span>
                </button>
              )}

            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                invoice.status
              )}`}
            >
              {invoice.status.charAt(0).toUpperCase() +
                invoice.status.slice(1)}
            </span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
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
        </div>

        {/* Content */}
        <div className="bg-white p-6 overflow-y-auto flex-1">
          {/* Header Section */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                  Invoice
                </h2>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium text-gray-700">
                      Invoice Date:
                    </span>{" "}
                    <span className="text-gray-900">
                      {formatDate(invoice.invoiceDate)}
                    </span>
                  </div>
                  {invoice.dueDate && (
                    <div>
                      <span className="font-medium text-gray-700">
                        Due Date:
                      </span>{" "}
                      <span className="text-gray-900">
                        {formatDate(invoice.dueDate)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {invoice.businessLogo && (
                <div className="w-32 h-32 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <img
                    src={invoice.businessLogo}
                    alt="Business Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* From and To Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Invoice From */}
            <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Invoice From
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">
                    Business Name:
                  </span>
                  <p className="text-gray-900 mt-1">
                    {invoice.billFrom.businessName}
                  </p>
                </div>
                {invoice.billFrom.country && (
                  <div>
                    <span className="font-medium text-gray-700">Country:</span>
                    <p className="text-gray-900 mt-1">
                      {invoice.billFrom.country}
                    </p>
                  </div>
                )}
                {invoice.billFrom.phone && (
                  <div>
                    <span className="font-medium text-gray-700">Phone:</span>
                    <p className="text-gray-900 mt-1">{invoice.billFrom.phone}</p>
                  </div>
                )}
                {invoice.billFrom.email && (
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <p className="text-gray-900 mt-1">{invoice.billFrom.email}</p>
                  </div>
                )}
                {invoice.billFrom.address && (
                  <div>
                    <span className="font-medium text-gray-700">Address:</span>
                    <p className="text-gray-900 mt-1">
                      {invoice.billFrom.address}
                    </p>
                  </div>
                )}
                {invoice.billFrom.salesPersonName && (
                  <div>
                    <span className="font-medium text-gray-700">
                      Sales Person Name:
                    </span>
                    <p className="text-gray-900 mt-1">
                      {invoice.billFrom.salesPersonName}
                    </p>
                  </div>
                )}
                {invoice.billFrom.salesPersonId && (
                  <div>
                    <span className="font-medium text-gray-700">
                      Sales Person ID:
                    </span>
                    <p className="text-gray-900 mt-1">
                      {invoice.billFrom.salesPersonId}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Invoice For */}
            <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Invoice For
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">
                    Business Name:
                  </span>
                  <p className="text-gray-900 mt-1">
                    {invoice.billTo.businessName}
                  </p>
                </div>
                {invoice.billTo.country && (
                  <div>
                    <span className="font-medium text-gray-700">Country:</span>
                    <p className="text-gray-900 mt-1">{invoice.billTo.country}</p>
                  </div>
                )}
                {invoice.billTo.phone && (
                  <div>
                    <span className="font-medium text-gray-700">Phone:</span>
                    <p className="text-gray-900 mt-1">{invoice.billTo.phone}</p>
                  </div>
                )}
                {invoice.billTo.email && (
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <p className="text-gray-900 mt-1">{invoice.billTo.email}</p>
                  </div>
                )}
                {invoice.billTo.address && (
                  <div>
                    <span className="font-medium text-gray-700">Address:</span>
                    <p className="text-gray-900 mt-1">{invoice.billTo.address}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">
                  Line Items
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Rate
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoice.lineItems && invoice.lineItems.length > 0 ? (
                      invoice.lineItems.map((item, index) => (
                        <tr
                          key={item.id || index}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-start space-x-3">
                              {item.imageUrl && (
                                <img
                                  src={item.imageUrl}
                                  alt={item.itemName}
                                  className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                              )}
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {item.itemName}
                                </div>
                                {item.description && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {item.description}
                                  </div>
                                )}
                                {item.isSubscription && (
                                  <div className="mt-1 flex items-center space-x-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                                      Subscription
                                    </span>
                                    {item.subscriptionPrice && (
                                      <span className="text-xs text-gray-600">
                                        {getCurrencySymbol(invoice.currency)}
                                        {item.subscriptionPrice.toFixed(2)}/
                                        {item.subscriptionDetails?.interval ||
                                          "month"}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {item.selectedOptions &&
                                  item.selectedOptions.length > 0 && (
                                    <div className="mt-1 text-xs text-gray-600">
                                      {item.selectedOptions.map((opt, i) => (
                                        <div key={i}>
                                          • {opt.attributeName}:{" "}
                                          {opt.optionLabel}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-900">
                            {getCurrencySymbol(invoice.currency)}
                            {item.rate.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                            {getCurrencySymbol(invoice.currency)}
                            {item.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">
                            {getCurrencySymbol(invoice.currency)}
                            {item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          No items in this invoice
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="flex justify-end mb-6">
            <div className="w-full sm:w-96 bg-white rounded-lg p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all">
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-gray-900">
                    {getCurrencySymbol(invoice.currency)}
                    {invoice.subtotal.toFixed(2)}
                  </span>
                </div>
                {invoice.couponCode && invoice.couponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Coupon Discount ({invoice.couponCode}):</span>
                    <span className="font-semibold">
                      -{getCurrencySymbol(invoice.currency)}
                      {invoice.couponDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-300 pt-3 flex justify-between text-lg font-bold text-gray-900">
                  <span>Total Amount:</span>
                  <span>
                    {getCurrencySymbol(invoice.currency)}
                    {invoice.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          {invoice.payment && invoice.payment.paymentStatus === "paid" && (
            <div className="mb-6 bg-white rounded-lg p-5 border border-green-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Payment Completed
                  </h3>
                  <p className="text-sm text-gray-600">
                    This invoice has been paid successfully
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-1 font-semibold">
                    Amount Paid
                  </p>
                  <p className="text-lg font-bold text-green-700">
                    {invoice.payment.currency?.toUpperCase() ||
                      invoice.currency}{" "}
                    {invoice.payment.amount?.toFixed(2) ||
                      invoice.totalAmount.toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-1 font-semibold">
                    Payment Date
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {invoice.payment.paidAt
                      ? formatDate(invoice.payment.paidAt)
                      : "N/A"}
                  </p>
                </div>
                {invoice.payment.paymentMode && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-1 font-semibold">
                      Payment Type
                    </p>
                    <p className="text-lg font-semibold text-gray-900 capitalize">
                      {invoice.payment.paymentMode === "subscription"
                        ? "Subscription"
                        : "One-time Payment"}
                    </p>
                  </div>
                )}
                {invoice.payment.sessionId && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-1 font-semibold">
                      Transaction ID
                    </p>
                    <p className="text-sm font-mono text-gray-700 break-all">
                      {invoice.payment.sessionId}
                    </p>
                  </div>
                )}
              </div>
              {invoice.payment.subscriptionId && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
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
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    <p className="text-sm font-semibold text-blue-900">
                      Active Subscription
                    </p>
                  </div>
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Subscription ID:</strong>{" "}
                    <span className="font-mono text-xs">
                      {invoice.payment.subscriptionId}
                    </span>
                  </p>
                  {invoice.lineItems?.some((item) => item.isSubscription) && (
                    <div className="mt-2 space-y-1">
                      {invoice.lineItems
                        .filter((item) => item.isSubscription)
                        .map((item, idx) => (
                          <div
                            key={idx}
                            className="text-xs text-blue-700 bg-white p-2 rounded border border-blue-200"
                          >
                            <strong>{item.itemName}</strong> -{" "}
                            {getCurrencySymbol(invoice.currency)}
                            {item.subscriptionPrice?.toFixed(2) ||
                              item.total.toFixed(2)}
                            /{item.subscriptionDetails?.interval || "month"}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes and Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {invoice.notes && (
                <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Notes
                  </h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {invoice.notes}
                  </p>
                </div>
              )}
              {invoice.terms && (
                <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Terms & Conditions
                  </h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {invoice.terms}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Change History */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">
                Change History
              </h3>
            </div>
            <div className="p-5">
              <ChangeHistory invoiceId={invoice.id} />
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-xs text-gray-600">
            <p className="font-medium text-gray-700">
              Created:{" "}
              <span className="text-gray-900">
                {formatDate(invoice.createdAt)}
              </span>
            </p>
            {invoice.updatedAt &&
              invoice.updatedAt !== invoice.createdAt && (
                <p className="mt-1 font-medium text-gray-700">
                  Last Updated:{" "}
                  <span className="text-gray-900">
                    {formatDate(invoice.updatedAt)}
                  </span>
                </p>
              )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Request for Offer Modal */}
      <RequestOfferModal
        isOpen={showRequestOfferModal}
        onClose={() => setShowRequestOfferModal(false)}
        invoice={invoice}
      />
    </div>
  );
}
