"use client";

import { useAuth } from "../../../contexts/AuthContext";
import { useQuery } from "@apollo/client/react";
import { gql } from "graphql-tag";
import Link from "next/link";

const GET_CUSTOMER_QUOTATIONS = gql`
  query GetQuotations {
    getQuotations {
      id
      quotationNo
      status
      totalAmount
      currency
      createdAt
      to {
        businessName
        email
      }
      payment {
        paymentLink
        paymentStatus
        paymentMethod
        paidAt
      }
    }
  }
`;

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
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { data, loading } = useQuery(GET_CUSTOMER_QUOTATIONS, {
    fetchPolicy: "cache-and-network",
  });

  const quotations = data?.getQuotations || [];

  // Filter out draft quotations for customer
  const visibleQuotations = quotations.filter((q) => q.status !== "draft");

  // Calculate stats from real data
  const totalQuotations = visibleQuotations.length;
  const acceptedQuotations = visibleQuotations.filter(
    (q) => q.status === "accepted"
  ).length;
  const paidQuotations = visibleQuotations.filter(
    (q) => q.status === "paid"
  ).length;
  const pendingQuotations = visibleQuotations.filter(
    (q) => q.status === "sent"
  ).length;

  // Calculate total value of all quotations
  const totalValue = visibleQuotations.reduce(
    (sum, q) => sum + (q.totalAmount || 0),
    0
  );

  // Get recent quotations (last 5)
  const recentQuotations = [...visibleQuotations]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

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
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                  Customer Dashboard
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
                    Your Quotations
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
        {/* Total Quotations */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
                Total Quotations
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {totalQuotations}
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

        {/* Accepted */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">
                Accepted
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {acceptedQuotations}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                Quotations accepted
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

        {/* Paid */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-purple-600 font-bold uppercase tracking-wide mb-1">
                Paid
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {paidQuotations}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                Quotations paid
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
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
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
                Awaiting action
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
      </div>

      {/* Status Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100 hover:shadow-md transition-all hover:border-blue-300">
          <p className="text-xs text-blue-700 font-bold uppercase tracking-wide">
            Total Value
          </p>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            {totalValue > 0
              ? formatCurrency(
                  totalValue,
                  visibleQuotations[0]?.currency || "USD"
                )
              : "$0.00"}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-100 hover:shadow-md transition-all hover:border-green-300">
          <p className="text-xs text-green-700 font-bold uppercase tracking-wide">
            Accepted
          </p>
          <p className="text-2xl font-bold text-green-900 mt-1">
            {acceptedQuotations}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg shadow-sm border border-purple-100 hover:shadow-md transition-all hover:border-purple-300">
          <p className="text-xs text-purple-700 font-bold uppercase tracking-wide">
            Paid
          </p>
          <p className="text-2xl font-bold text-purple-900 mt-1">
            {paidQuotations}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow-sm border border-yellow-100 hover:shadow-md transition-all hover:border-yellow-300">
          <p className="text-xs text-yellow-700 font-bold uppercase tracking-wide">
            Pending
          </p>
          <p className="text-2xl font-bold text-yellow-900 mt-1">
            {pendingQuotations}
          </p>
        </div>
      </div>

      {/* Recent Quotations */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-blue-900">Recent Quotations</h2>
          <Link
            href="/customer/quotes"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            View All →
          </Link>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : recentQuotations.length === 0 ? (
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
              <p className="text-gray-500">No quotations available</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Quotation #
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Amount
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentQuotations.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {quotation.quotationNo}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                          quotation.status
                        )}`}
                      >
                        {quotation.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                      {formatCurrency(
                        quotation.totalAmount || 0,
                        quotation.currency || "USD"
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {formatDate(quotation.createdAt)}
                    </td>
                    <td className="px-4 py-2">
                      {/* Show payment link button only for sent status and not yet paid */}
                      {quotation.status === "sent" &&
                        quotation.payment?.paymentLink &&
                        quotation.payment?.paymentStatus !== "paid" && (
                          <a
                            href={quotation.payment.paymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 border border-green-600 rounded-lg hover:bg-green-700 transition-colors"
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
                                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                              />
                            </svg>
                            Pay Now
                          </a>
                        )}
                      {quotation.payment?.paymentStatus === "paid" && (
                        <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 border border-purple-300 rounded-lg">
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
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Paid
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300">
        <h2 className="text-lg font-bold text-blue-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link
            href="/customer/quotes"
            className="group p-5 border border-gray-200 bg-linear-to-br from-blue-50 to-white rounded-xl hover:shadow-lg hover:border-blue-300 transition-all duration-300"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
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
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">
                  View Quotations
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Access all your quotations
                </p>
              </div>
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-all group-hover:translate-x-1 mt-0.5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>

          <Link
            href="/customer/invoices"
            className="group p-5 border border-gray-200 bg-linear-to-br from-green-50 to-white rounded-xl hover:shadow-lg hover:border-green-300 transition-all duration-300"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
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
                    d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-green-900 transition-colors">
                  Invoices
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  View billing documents
                </p>
              </div>
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-all group-hover:translate-x-1 mt-0.5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>

          <Link
            href="/customer/settings"
            className="group p-5 border border-gray-200 bg-linear-to-br from-purple-50 to-white rounded-xl hover:shadow-lg hover:border-purple-300 transition-all duration-300"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-900 transition-colors">
                  Settings
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Manage your profile
                </p>
              </div>
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-all group-hover:translate-x-1 mt-0.5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
