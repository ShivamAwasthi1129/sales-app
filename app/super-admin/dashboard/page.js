// super-admin/dashboard/page.js

"use client";

import { useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useQuery } from "@apollo/client/react";
import { gql } from "graphql-tag";
import Link from "next/link";
import PieChartComponent from "../../components/charts/PieChartComponent";
import BarChartComponent from "../../components/charts/BarChartComponent";
import AreaChartComponent from "../../components/charts/AreaChartComponent";

const GET_DASHBOARD_ANALYTICS = gql`
  query GetDashboardAnalytics($timeRange: String) {
    getDashboardAnalytics(timeRange: $timeRange) {
      stats {
        totalUsers
        activeUsers
        totalCompanies
        activeCompanies
        totalQuotations
        totalRevenue
        averageQuotationValue
        conversionRate
        paidQuotations
        pendingQuotations
        draftQuotations
        acceptedQuotations
        rejectedQuotations
      }
      roleDistribution {
        role
        count
        percentage
      }
      quotationStatusBreakdown {
        status
        count
        totalValue
        percentage
      }
      monthlyRevenue {
        month
        revenue
        quotationCount
      }
      recentUsers {
        id
        name
        email
        role
        status
        createdAt
      }
      recentQuotations {
        id
        quotationNo
        totalAmount
        status
        businessName
        createdAt
      }
      companyRevenues {
        companyId
        companyName
        totalRevenue
        paidQuotations
        pendingQuotations
        totalQuotations
        conversionRate
        averageValue
        status
      }
      subscriptionAnalytics {
        companyId
        companyName
        activeSubscriptions
        totalSubscriptionRevenue
        monthlyRecurring
        yearlyRecurring
        subscriptionsByProduct {
          productId
          productName
          count
          revenue
        }
        recentSubscriptions {
          quotationNo
          companyName
          clientName
          productName
          amount
          billingType
          status
          startDate
        }
      }
    }
  }
`;

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [hoveredStatus, setHoveredStatus] = useState(null);

  const { data, loading, error } = useQuery(GET_DASHBOARD_ANALYTICS, {
    variables: { timeRange },
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatCurrencyCompact = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      paid: "bg-green-100 text-green-800 border-green-300",
      accepted: "bg-blue-100 text-blue-800 border-blue-300",
      sent: "bg-yellow-100 text-yellow-800 border-yellow-300",
      viewed: "bg-purple-100 text-purple-800 border-purple-300",
      draft: "bg-gray-100 text-gray-800 border-gray-300",
      rejected: "bg-red-100 text-red-800 border-red-300",
      expired: "bg-orange-100 text-orange-800 border-orange-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
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
        <p className="font-semibold">Error loading analytics</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  const analytics = data?.getDashboardAnalytics;

  // Prepare chart data
  const statusChartData =
    analytics?.quotationStatusBreakdown.map((item) => ({
      name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
      value: item.count,
      percentage: item.percentage,
      totalValue: item.totalValue,
      status: item.status,
    })) || [];

  const roleChartData =
    analytics?.roleDistribution.map((item) => ({
      name: item.role,
      value: item.count,
      percentage: item.percentage,
    })) || [];

  const revenueChartData =
    analytics?.monthlyRevenue.map((item) => ({
      name: item.month,
      revenue: item.revenue,
      quotations: item.quotationCount,
    })) || [];

  // Filter data based on selections
  const filteredQuotations = selectedStatus
    ? analytics?.recentQuotations.filter((q) => q.status === selectedStatus)
    : analytics?.recentQuotations;

  const filteredUsers = selectedRole
    ? analytics?.recentUsers.filter((u) => u.role === selectedRole)
    : analytics?.recentUsers;

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
                  Super Admin Dashboard
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
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <p className="text-sm text-gray-400 font-semibold">
                    System-wide Analytics
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

          {/* Right Section - Time Period Filter */}
          <div className="w-full sm:w-auto bg-blue-50 rounded-lg p-4 border border-blue-100 shadow-md">
            <label className="text-xs font-bold text-blue-900 mb-2 block">
              TIME PERIOD
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full bg-white text-gray-800 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 hover:border-gray-400 transition-all duration-300 cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="monthly">This Month</option>
              <option value="3months">Last 3 Months</option>
              <option value="quarterly">This Quarter</option>
              <option value="yearly">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
                Total Users
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {analytics?.stats.totalUsers || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                {analytics?.stats.activeUsers || 0} active
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Companies */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">
                Companies
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {analytics?.stats.totalCompanies || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                {analytics?.stats.activeCompanies || 0} active
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">
                Total Revenue
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatCurrency(analytics?.stats.totalRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                {analytics?.stats.paidQuotations || 0} paid
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
              <p className="text-xs text-yellow-600 font-bold uppercase tracking-wide mb-1">
                Conversion Rate
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {analytics?.stats.conversionRate?.toFixed(1) || 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                Avg: {formatCurrency(analytics?.stats.averageQuotationValue)}
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
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Status Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all hover:border-gray-300">
          <p className="text-xs text-gray-700 font-bold uppercase tracking-wide">
            Total Quotations
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {analytics?.stats.totalQuotations || 0}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-100 hover:shadow-md transition-all hover:border-green-300">
          <p className="text-xs text-green-700 font-bold uppercase tracking-wide">
            Paid
          </p>
          <p className="text-2xl font-bold text-green-900 mt-1">
            {analytics?.stats.paidQuotations || 0}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100 hover:shadow-md transition-all hover:border-blue-300">
          <p className="text-xs text-blue-700 font-bold uppercase tracking-wide">
            Accepted
          </p>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            {analytics?.stats.acceptedQuotations || 0}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow-sm border border-yellow-100 hover:shadow-md transition-all hover:border-yellow-300">
          <p className="text-xs text-yellow-700 font-bold uppercase tracking-wide">
            Pending
          </p>
          <p className="text-2xl font-bold text-yellow-900 mt-1">
            {analytics?.stats.pendingQuotations || 0}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all hover:border-gray-300">
          <p className="text-xs text-gray-700 font-bold uppercase tracking-wide">
            Draft
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {analytics?.stats.draftQuotations || 0}
          </p>
        </div>
      </div>

      {/* Charts Row: Status Distribution and Role Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quotation Status Distribution */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-blue-900">
              Quotation Status Distribution
            </h2>
            {selectedStatus && (
              <button
                onClick={() => setSelectedStatus(null)}
                className="text-xs text-white px-3 py-1 bg-gray-500 hover:bg-gray-600 rounded-full font-medium transition-all"
              >
                Clear Filter
              </button>
            )}
          </div>

          {statusChartData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <PieChartComponent data={statusChartData} height={280} />
              </div>

              <div className="space-y-2 relative">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">
                  Click to Filter • Hover for Details
                </h3>
                {statusChartData.map((item, index) => {
                  const avgValue =
                    item.value > 0 ? item.totalValue / item.value : 0;
                  return (
                    <div
                      key={index}
                      className="relative"
                      onMouseEnter={() => setHoveredStatus(item.status)}
                      onMouseLeave={() => setHoveredStatus(null)}
                    >
                      <div
                        onClick={() => setSelectedStatus(item.status)}
                        className={`p-2 rounded-lg border transition-all cursor-pointer ${selectedStatus === item.status
                          ? "border-gray-400 bg-gray-50 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                              item.status
                            )}`}
                          >
                            {item.name}
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {item.value}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {item.percentage.toFixed(1)}% of total
                        </div>
                        <div className="text-xs text-emerald-600 font-semibold mt-1">
                          {formatCurrency(item.totalValue)}
                        </div>
                      </div>

                      {/* Hover Tooltip */}
                      {hoveredStatus === item.status && (
                        <div className="absolute left-full ml-2 top-0 z-50 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-100 transition-opacity duration-300">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                            <h4 className="font-semibold text-gray-900">
                              {item.name} Quotations
                            </h4>
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                                item.status
                              )}`}
                            >
                              {item.name}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                Total Count:
                              </span>
                              <span className="font-bold text-gray-900">
                                {item.value} quotations
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                Total Value:
                              </span>
                              <span className="font-bold text-green-900">
                                {formatCurrency(item.totalValue)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                Average Deal:
                              </span>
                              <span className="font-bold text-blue-900">
                                {formatCurrency(avgValue)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Percentage:</span>
                              <span className="font-bold text-gray-900">
                                {item.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* User Role Distribution */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-blue-900">
              User Role Distribution
            </h2>
            {selectedRole && (
              <button
                onClick={() => setSelectedRole(null)}
                className="text-xs text-white px-3 py-1 bg-gray-500 hover:bg-gray-600 rounded-full font-medium transition-all"
              >
                Clear Filter
              </button>
            )}
          </div>
          {roleChartData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <PieChartComponent data={roleChartData} height={280} />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">
                  Detailed Breakdown
                </h3>
                {roleChartData.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedRole(item.name)}
                    className={`p-2 rounded-lg border transition-all cursor-pointer ${selectedRole === item.name
                      ? "border-gray-400 bg-gray-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {item.name}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {item.value}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {item.percentage.toFixed(1)}% of all users
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>
      {/* Recent Users and Quotations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Users */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-blue-900">
              Recent Users
              {selectedRole && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  (Filtered)
                </span>
              )}
            </h2>
            <span className="text-sm text-gray-600">
              {filteredUsers?.length || 0} shown
            </span>
          </div>
          <div
            className={`space-y-2 ${selectedRole && filteredUsers?.length > 5
              ? "max-h-96 overflow-y-auto pr-2"
              : ""
              }`}
          >
            {filteredUsers && filteredUsers.length > 0 ? (
              (selectedRole ? filteredUsers : filteredUsers.slice(0, 5)).map(
                (recentUser) => (
                  <div
                    key={recentUser.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600">
                          {recentUser.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {recentUser.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {recentUser.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                        {recentUser.role}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(recentUser.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              )
            ) : (
              <div className="text-center py-8 text-gray-500">
                {selectedRole
                  ? `No ${selectedRole} users found`
                  : "No users available"}
              </div>
            )}
          </div>
        </div>

        {/* Recent Quotations */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-blue-900">
              Recent Quotations
              {selectedStatus && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  (Filtered)
                </span>
              )}
            </h2>
            <span className="text-sm text-gray-600">
              {filteredQuotations?.length || 0} shown
            </span>
          </div>
          <div className="space-y-2">
            {filteredQuotations && filteredQuotations.length > 0 ? (
              filteredQuotations.slice(0, 5).map((quotation) => (
                <div
                  key={quotation.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {quotation.quotationNo}
                    </p>
                    <p className="text-xs text-gray-500">
                      {quotation.businessName}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(quotation.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(quotation.totalAmount)}
                    </p>
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(
                        quotation.status
                      )}`}
                    >
                      {quotation.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                {selectedStatus
                  ? `No ${selectedStatus} quotations found`
                  : "No quotations available"}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Monthly Revenue Trend */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-blue-900">
            Monthly Revenue Trend
          </h2>
          <Link
            href="/super-admin/analytics"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            View Details →
          </Link>
        </div>
        {revenueChartData.length > 0 ? (
          <AreaChartComponent
            data={revenueChartData}
            dataKey="revenue"
            xAxisKey="name"
            height={300}
            gradientFrom="#3B82F6"
            gradientTo="#60A5FA"
            formatYAxis={formatCurrencyCompact}
            formatTooltip={formatCurrency}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            No revenue data available
          </div>
        )}
      </div>

      {/* Quotation Status Breakdown */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
        <h2 className="text-lg font-bold text-blue-900 mb-3">
          Quotation Status Breakdown
        </h2>
        {analytics?.quotationStatusBreakdown &&
          analytics.quotationStatusBreakdown.length > 0 ? (
          <BarChartComponent
            data={analytics.quotationStatusBreakdown.map((item) => ({
              name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
              Quotations: item.count,
              Revenue: item.totalValue,
            }))}
            dataKey={[
              { key: "Quotations", color: "#4F46E5", name: "Quotations" },
              { key: "Revenue", color: "#10B981", name: "Revenue ($)" },
            ]}
            xAxisKey="name"
            height={300}
            formatTooltip={(value, index) => {
              return index === 1 ? formatCurrency(value) : value;
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            No data available
          </div>
        )}
      </div>

      {/* Top Company Performance */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-blue-900">
            Top Company Performance
          </h2>
          <Link
            href="/super-admin/analytics"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            View All Analytics →
          </Link>
        </div>

        {analytics?.companyRevenues && analytics.companyRevenues.length > 0 ? (
          <div className="space-y-3">
            {analytics.companyRevenues.slice(0, 5).map((company, index) => {
              const maxRevenue = Math.max(
                ...analytics.companyRevenues.map((c) => c.totalRevenue),
                1
              );
              const percentage = (company.totalRevenue / maxRevenue) * 100;

              return (
                <div
                  key={company.companyId}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-700 font-bold text-sm">
                          #{index + 1}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {company.companyName}
                        </h3>
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${company.status === "Active"
                            ? "bg-green-100 text-green-800 border-green-300"
                            : "bg-gray-100 text-gray-800 border-gray-300"
                            }`}
                        >
                          {company.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(company.totalRevenue)}
                      </p>
                      <p className="text-xs text-gray-500">Total Revenue</p>
                    </div>
                  </div>

                  {/* Revenue Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                    <div
                      className="bg-green-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gray-50 px-2 py-1 rounded border border-gray-200">
                      <p className="text-xs text-gray-600">Total Quotes:</p>
                      <p className="text-sm font-bold text-gray-900">
                        {company.totalQuotations}
                      </p>
                    </div>
                    <div className="bg-gray-50 px-2 py-1 rounded border border-gray-200">
                      <p className="text-xs text-gray-600">Paid:</p>
                      <p className="text-sm font-bold text-gray-900">
                        {company.paidQuotations}
                      </p>
                    </div>
                    <div className="bg-gray-50 px-2 py-1 rounded border border-gray-200">
                      <p className="text-xs text-gray-600">Conversion:</p>
                      <p className="text-sm font-bold text-gray-900">
                        {company.conversionRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-gray-50 px-2 py-1 rounded border border-gray-200">
                      <p className="text-xs text-gray-600">Avg Value:</p>
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(company.averageValue)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <p className="text-gray-500">No revenue data available yet</p>
          </div>
        )}
      </div>

      {/* Recent Activity Grid - Filtered */}

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300">
        <h2 className="text-lg font-bold text-blue-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/super-admin/analytics"
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">
                  Super Analytics
                </h3>
                <p className="text-xs text-gray-500 mt-1">In-depth insights</p>
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
            href="/super-admin/users"
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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-green-900 transition-colors">
                  Manage Users
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  View and edit accounts
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
            href="/super-admin/companies"
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
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-900 transition-colors">
                  Manage Companies
                </h3>
                <p className="text-xs text-gray-500 mt-1">Configure settings</p>
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

          <Link
            href="/super-admin/control"
            className="group p-5 border border-gray-200 bg-linear-to-br from-orange-50 to-white rounded-xl hover:shadow-lg hover:border-orange-300 transition-all duration-300"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                <svg
                  className="w-5 h-5 text-orange-600"
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
                <h3 className="font-semibold text-gray-900 group-hover:text-orange-900 transition-colors">
                  Control Center
                </h3>
                <p className="text-xs text-gray-500 mt-1">System controls</p>
              </div>
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-orange-600 transition-all group-hover:translate-x-1 mt-0.5 shrink-0"
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
