"use client";

import { useQuery } from "@apollo/client/react";
import { gql } from "graphql-tag";
import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../../contexts/AuthContext";
import ViewQuotationModal from "../../components/ViewQuotationModal";

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
      }
      billFrom {
        businessName
        email
      }
      currency
      totalAmount
      paymentStatus
      paymentMethod
      paymentDate
      status
      createdAt
    }
  }
`;

const GET_QUOTATION = gql`
  query GetQuotation($id: ID!) {
    getQuotation(id: $id) {
      id
      quotationNo
      quotationDate
      dueDate
      status
      currency
      createdAt
      updatedAt
      from {
        businessName
        email
        phone
        address
        country
        salesPersonName
        salesPersonId
      }
      to {
        businessName
        email
        phone
        address
        country
      }
      lineItems {
        id
        productId
        itemName
        description
        imageUrl
        quantity
        rate
        amount
        total
        isSubscription
        subscriptionDetails {
          billingType
          interval
          intervalCount
        }
        selectedOptions {
          attributeName
          optionLabel
          optionValue
          price
        }
      }
      subtotal
      totalTax
      couponCode
      couponDiscount
      totalAmount
      notes
      terms
      businessLogo
      payment {
        paymentLink
        paymentStatus
        paymentMethod
        sessionId
        paidAt
      }
      invoiceNo
      invoiceId
    }
  }
`;

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  overdue: "bg-orange-100 text-orange-800",
};

const PAYMENT_STATUS_COLORS = {
  unpaid: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  partially_paid: "bg-blue-100 text-blue-800",
  overdue: "bg-red-100 text-red-800",
};

export default function CustomerInvoicesPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuotationId, setSelectedQuotationId] = useState(null);
  const [showQuotationModal, setShowQuotationModal] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_INVOICES, {
    fetchPolicy: "network-only",
  });

  const {
    data: quotationData,
    loading: quotationLoading,
    error: quotationError,
  } = useQuery(GET_QUOTATION, {
    variables: { id: selectedQuotationId },
    skip: !selectedQuotationId,
    fetchPolicy: "network-only",
    onError: (err) => {
      console.error("[Customer Invoices] Error loading quotation:", err);
      toast.error(err.message || "Failed to load quotation");
    },
  });

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getCurrencySymbol = (currency) => {
    const symbols = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
      CAD: "$",
      AUD: "$",
      INR: "₹",
    };
    return symbols[currency] || "$";
  };

  const handleDownload = async (invoiceId) => {
    try {
      // Get token from cookies (using js-cookie library)
      const Cookies = (await import("js-cookie")).default;
      const token = Cookies.get("token");

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const response = await fetch(`/api/invoice/download?id=${invoiceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to download invoice");
      }

      // Create blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Invoice downloaded successfully");
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error(error.message || "Failed to download invoice");
    }
  };

  const handleViewQuotation = (quotationId) => {
    setSelectedQuotationId(quotationId);
    setShowQuotationModal(true);
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

  const invoices = data?.getInvoices || [];

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.quotationNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.billFrom?.businessName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
          {/* Left Section - Title and Info */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-blue-600 animate-lightning"
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
                <h1 className="text-3xl font-semibold text-gray-900">
                  Invoices & Contracts
                </h1>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <p className="text-sm text-gray-400 font-semibold">
                    Your Invoices
                  </p>
                </div>
              </div>
            </div>
            <p className="text-base mt-4 text-gray-700">
              Welcome back,{" "}
              <span className="font-bold text-blue-900">
                {user?.name || user?.email}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoices */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
                Total Invoices
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {invoices.length}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                All time
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Paid */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">
                Paid
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {invoices.filter((i) => i.paymentStatus === "paid").length}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                Invoices paid
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Unpaid */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-yellow-600 font-bold uppercase tracking-wide mb-1">
                Unpaid
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {invoices.filter((i) => i.paymentStatus === "unpaid").length}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                Awaiting payment
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Amount */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-purple-600 font-bold uppercase tracking-wide mb-1">
                Total Amount
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {getCurrencySymbol(invoices[0]?.currency || "USD")}
                {invoices
                  .reduce((sum, i) => sum + (i.totalAmount || 0), 0)
                  .toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                All invoices
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Status Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-100 hover:shadow-md transition-all hover:border-green-300">
          <p className="text-xs text-green-700 font-bold uppercase tracking-wide">
            Paid
          </p>
          <p className="text-2xl font-bold text-green-900 mt-1">
            {invoices.filter((i) => i.paymentStatus === "paid").length}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow-sm border border-yellow-100 hover:shadow-md transition-all hover:border-yellow-300">
          <p className="text-xs text-yellow-700 font-bold uppercase tracking-wide">
            Unpaid
          </p>
          <p className="text-2xl font-bold text-yellow-900 mt-1">
            {invoices.filter((i) => i.paymentStatus === "unpaid").length}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100 hover:shadow-md transition-all hover:border-blue-300">
          <p className="text-xs text-blue-700 font-bold uppercase tracking-wide">
            Partially Paid
          </p>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            {
              invoices.filter((i) => i.paymentStatus === "partially_paid")
                .length
            }
          </p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-100 hover:shadow-md transition-all hover:border-red-300">
          <p className="text-xs text-red-700 font-bold uppercase tracking-wide">
            Overdue
          </p>
          <p className="text-2xl font-bold text-red-900 mt-1">
            {invoices.filter((i) => i.paymentStatus === "overdue").length}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice number, quotation number, or company..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
          >
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-blue-900">Invoices</h2>
          <span className="text-sm text-gray-600">
            {filteredInvoices.length}{" "}
            {filteredInvoices.length === 1 ? "invoice" : "invoices"}
          </span>
        </div>
        <div className="overflow-x-auto">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
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
              <p className="text-gray-500 mb-2">No invoices found</p>
              <p className="text-sm text-gray-400">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Invoices will appear here once payments are completed"}
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Invoice #
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Quotation #
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Company
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Amount
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Payment Status
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoiceNo}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                        {invoice.quotationNo}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {formatDate(invoice.invoiceDate)}
                      </div>
                      {invoice.paymentDate && (
                        <div className="text-xs text-green-600">
                          Paid: {formatDate(invoice.paymentDate)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-sm text-gray-900">
                        {invoice.billFrom?.businessName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {invoice.billFrom?.email}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {getCurrencySymbol(invoice.currency)}{" "}
                        {invoice.totalAmount?.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${
                          PAYMENT_STATUS_COLORS[invoice.paymentStatus] ||
                          "bg-gray-100 text-gray-800 border-gray-300"
                        }`}
                      >
                        {invoice.paymentStatus?.replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {/* View Quotation Button */}
                        <button
                          onClick={() =>
                            handleViewQuotation(invoice.quotationId)
                          }
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                          title="View Linked Quotation"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          View
                        </button>

                        {/* Download Button */}
                        <button
                          onClick={() => handleDownload(invoice.id)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Download Invoice"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
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
                          Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quotation Modal */}
      {showQuotationModal && (
        <>
          {quotationLoading ? (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-8 shadow-2xl">
                <div className="flex items-center space-x-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="text-gray-700 font-medium">
                    Loading quotation...
                  </p>
                </div>
              </div>
            </div>
          ) : quotationData?.getQuotation ? (
            <ViewQuotationModal
              isOpen={showQuotationModal}
              onClose={() => {
                setShowQuotationModal(false);
                setSelectedQuotationId(null);
              }}
              quotation={quotationData.getQuotation}
            />
          ) : (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-8 shadow-2xl max-w-md">
                <div className="text-center">
                  <svg
                    className="w-12 h-12 text-red-500 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-gray-700 font-medium mb-2">
                    Could not load quotation details
                  </p>
                  {quotationError && (
                    <p className="text-sm text-red-600 mb-4">
                      {quotationError.message}
                    </p>
                  )}
                  <button
                    onClick={() => {
                      setShowQuotationModal(false);
                      setSelectedQuotationId(null);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
