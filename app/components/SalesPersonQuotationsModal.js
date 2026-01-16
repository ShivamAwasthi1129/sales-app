// components/SalesPersonQuotationsModal.js

"use client";

import { useQuery } from "@apollo/client/react";
import { gql } from "graphql-tag";
import { useState } from "react";

const GET_SALESPERSON_QUOTATIONS = gql`
  query GetQuotations {
    getQuotations {
      id
      quotationNo
      quotationDate
      to {
        businessName
        email
      }
      status
      totalAmount
      currency
      payment {
        paymentStatus
      }
      createdBy
      createdAt
    }
  }
`;

export default function SalesPersonQuotationsModal({
  isOpen,
  onClose,
  salesPerson,
}) {
  const [activeTab, setActiveTab] = useState("all");
  const { data, loading, error } = useQuery(GET_SALESPERSON_QUOTATIONS, {
    skip: !isOpen || !salesPerson,
    fetchPolicy: "network-only",
  });

  if (!isOpen) return null;

  // Filter quotations for this specific salesperson
  const allQuotations =
    data?.getQuotations?.filter((q) => q.createdBy === salesPerson?.id) || [];

  // Calculate stats
  const totalQuotations = allQuotations.length;
  const wonQuotations = allQuotations.filter(
    (q) => q.payment?.paymentStatus === "paid"
  ).length;
  const lostQuotations = allQuotations.filter(
    (q) => q.status === "lost" || q.status === "rejected"
  ).length;
  const pendingQuotations = allQuotations.filter(
    (q) => q.status === "sent" && q.payment?.paymentStatus !== "paid"
  ).length;
  const draftQuotations = allQuotations.filter(
    (q) => q.status === "draft"
  ).length;

  // Calculate total revenue
  const totalRevenue = allQuotations
    .filter((q) => q.payment?.paymentStatus === "paid")
    .reduce((sum, q) => sum + (q.totalAmount || 0), 0);

  // Calculate conversion rate
  const conversionRate =
    totalQuotations > 0
      ? ((wonQuotations / totalQuotations) * 100).toFixed(1)
      : "0.0";

  // Filter quotations based on active tab
  const getFilteredQuotations = () => {
    switch (activeTab) {
      case "won":
        return allQuotations.filter((q) => q.payment?.paymentStatus === "paid");
      case "lost":
        return allQuotations.filter(
          (q) => q.status === "lost" || q.status === "rejected"
        );
      case "pending":
        return allQuotations.filter(
          (q) => q.status === "sent" && q.payment?.paymentStatus !== "paid"
        );
      case "draft":
        return allQuotations.filter((q) => q.status === "draft");
      default:
        return allQuotations;
    }
  };

  const filteredQuotations = getFilteredQuotations();

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStatusColor = (quotation) => {
    if (quotation.payment?.paymentStatus === "paid") {
      return "bg-green-100 text-green-800 border-green-300";
    }
    switch (quotation.status) {
      case "sent":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "draft":
        return "bg-gray-100 text-gray-800 border-gray-300";
      case "lost":
      case "rejected":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
    }
  };

  const getStatusLabel = (quotation) => {
    if (quotation.payment?.paymentStatus === "paid") return "Won";
    switch (quotation.status) {
      case "sent":
        return "Pending";
      case "draft":
        return "Draft";
      case "lost":
        return "Lost";
      case "rejected":
        return "Rejected";
      default:
        return quotation.status;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-blue-600"
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
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  {salesPerson?.photo ? (
                    <img
                      src={salesPerson.photo}
                      alt={salesPerson.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-indigo-600 text-sm font-semibold">
                        {salesPerson?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">
                      {salesPerson?.name}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {salesPerson?.salesPersonId} • {salesPerson?.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-colors"
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

        {/* Stats Cards */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Total Quotations */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
                    Total
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {totalQuotations}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">
                    Quotations
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

            {/* Won */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">
                    Won
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {wonQuotations}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">
                    Deals closed
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

            {/* Lost */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-red-600 font-bold uppercase tracking-wide mb-1">
                    Lost
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {lostQuotations}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">
                    Not converted
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Pending */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-yellow-600 font-bold uppercase tracking-wide mb-1">
                    Pending
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {pendingQuotations}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">
                    In progress
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

            {/* Revenue */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-purple-600 font-bold uppercase tracking-wide mb-1">
                    Revenue
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(totalRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">
                    Total earned
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

            {/* Conversion Rate */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-indigo-600 font-bold uppercase tracking-wide mb-1">
                    Conv. Rate
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {conversionRate}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">
                    Success rate
                  </p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border-b border-gray-200 p-2">
          <div className="flex space-x-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === "all"
                ? "bg-blue-900 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              All ({totalQuotations})
            </button>
            <button
              onClick={() => setActiveTab("won")}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === "won"
                ? "bg-blue-900 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              Won ({wonQuotations})
            </button>
            <button
              onClick={() => setActiveTab("lost")}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === "lost"
                ? "bg-blue-900 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              Lost ({lostQuotations})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === "pending"
                ? "bg-blue-900 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              Pending ({pendingQuotations})
            </button>
            <button
              onClick={() => setActiveTab("draft")}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === "draft"
                ? "bg-blue-900 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              Draft ({draftQuotations})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              <p className="font-semibold">Error loading quotations</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <svg
                className="mx-auto h-16 w-16 text-gray-400 mb-4"
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No quotations
              </h3>
              <p className="text-sm text-gray-500">
                No quotations found in this category.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                        Quotation #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                        Client
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredQuotations.map((quotation) => (
                      <tr key={quotation.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {quotation.quotationNo}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {quotation.to?.businessName ||
                            quotation.to?.email ||
                            "N/A"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {formatDate(quotation.quotationDate)}
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                          {formatCurrency(
                            quotation.totalAmount,
                            quotation.currency
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                              quotation
                            )}`}
                          >
                            {getStatusLabel(quotation)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {filteredQuotations.length} of {totalQuotations} total
              quotations
            </div>
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
