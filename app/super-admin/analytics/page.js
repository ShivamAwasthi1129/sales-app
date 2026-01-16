// super-admin/analytics/page.js

"use client";

import { useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useQuery } from "@apollo/client/react";
import { gql } from "graphql-tag";
import PieChartComponent from "../../components/charts/PieChartComponent";
import BarChartComponent from "../../components/charts/BarChartComponent";
import LineChartComponent from "../../components/charts/LineChartComponent";
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

export default function SuperAnalytics() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedStatus, setSelectedStatus] = useState(null);

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
      active: "bg-green-100 text-green-800 border-green-300",
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

  // Prepare enhanced chart data
  const statusChartData =
    analytics?.quotationStatusBreakdown.map((item) => ({
      name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
      value: item.count,
      percentage: item.percentage,
      revenue: item.totalValue,
      status: item.status,
    })) || [];

  // Filter quotations based on selection
  const filteredQuotations = selectedStatus
    ? analytics?.recentQuotations.filter((q) => q.status === selectedStatus)
    : analytics?.recentQuotations;

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

  // Calculate financial metrics
  const totalPotentialRevenue =
    analytics?.quotationStatusBreakdown?.reduce(
      (sum, item) => sum + item.totalValue,
      0
    ) || 0;

  const pendingRevenue =
    analytics?.quotationStatusBreakdown
      ?.filter((item) => item.status === "sent" || item.status === "accepted")
      ?.reduce((sum, item) => sum + item.totalValue, 0) || 0;

  const lostRevenue =
    analytics?.quotationStatusBreakdown
      ?.filter((item) => item.status === "rejected")
      ?.reduce((sum, item) => sum + item.totalValue, 0) || 0;

  // Calculate upcoming quotations (sent and accepted)
  const upcomingQuotations =
    (analytics?.stats.pendingQuotations || 0) +
    (analytics?.stats.acceptedQuotations || 0);

  // Prepare company performance data for bar chart
  const companyPerformanceData =
    analytics?.companyRevenues?.slice(0, 10).map((company) => ({
      name:
        company.companyName.length > 15
          ? company.companyName.substring(0, 15) + "..."
          : company.companyName,
      Revenue: company.totalRevenue,
      Quotations: company.totalQuotations,
      ConversionRate: company.conversionRate,
    })) || [];

  // Prepare subscription revenue data
  const subscriptionRevenueData =
    analytics?.subscriptionAnalytics?.map((sub) => ({
      name:
        sub.companyName.length > 15
          ? sub.companyName.substring(0, 15) + "..."
          : sub.companyName,
      Monthly: sub.monthlyRecurring,
      Yearly: sub.yearlyRecurring,
    })) || [];

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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                  Super Analytics
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
              Comprehensive Business Intelligence & Insights
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

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 hover:shadow-md transition-all">
        <div className="flex space-x-2 overflow-x-auto">
          {[
            "overview",
            "financial",
            "quotations",
            "companies",
            "subscriptions",
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === tab
                ? "bg-blue-900 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    {analytics?.stats.paidQuotations} paid quotations
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

            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
                    Pending Revenue
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {formatCurrency(pendingRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">
                    {upcomingQuotations} upcoming quotations
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-purple-600 font-bold uppercase tracking-wide mb-1">
                    Avg Deal Size
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {formatCurrency(analytics?.stats.averageQuotationValue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">
                    Per quotation
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
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-red-600 font-bold uppercase tracking-wide mb-1">
                    Lost Opportunities
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {formatCurrency(lostRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">
                    {analytics?.stats.rejectedQuotations} rejected
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue Trend */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <h3 className="text-lg font-bold text-blue-900 mb-3">
                Revenue Trend
              </h3>
              <LineChartComponent
                data={revenueChartData}
                lines={[{ key: "revenue", color: "#10B981", name: "Revenue" }]}
                xAxisKey="name"
                height={300}
                formatYAxis={formatCurrencyCompact}
                formatTooltip={formatCurrency}
              />
            </div>

            {/* Quotation Pipeline */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <h3 className="text-lg font-bold text-blue-900 mb-3">
                Quotation Pipeline
              </h3>
              <BarChartComponent
                data={statusChartData.map((item) => ({
                  name: item.name,
                  Count: item.value,
                  Value: item.revenue,
                }))}
                dataKey={[
                  { key: "Count", color: "#4F46E5", name: "Count" },
                  { key: "Value", color: "#10B981", name: "Value" },
                ]}
                height={300}
                formatTooltip={(value, index) =>
                  index === 1 ? formatCurrency(value) : value
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Financial Tab */}
      {activeTab === "financial" && (
        <div className="space-y-4">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 relative">
              <div className="absolute top-5 right-5 p-3 bg-green-100 rounded-lg flex items-center justify-center">
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
              <div className="pr-16">
                <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-2">
                  Realized Revenue
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatCurrency(analytics?.stats.totalRevenue)}
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paid Quotations:</span>
                    <span className="font-semibold text-gray-900">
                      {analytics?.stats.paidQuotations}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avg per deal:</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(
                        analytics?.stats.totalRevenue /
                        (analytics?.stats.paidQuotations || 1)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 relative">
              <div className="absolute top-5 right-5 p-3 bg-blue-100 rounded-lg flex items-center justify-center">
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
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="pr-16">
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-2">
                  Pipeline Revenue
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatCurrency(pendingRevenue)}
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">In Progress:</span>
                    <span className="font-semibold text-gray-900">
                      {upcomingQuotations}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Conversion Rate:</span>
                    <span className="font-semibold text-gray-900">
                      {analytics?.stats.conversionRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 relative">
              <div className="absolute top-5 right-5 p-3 bg-purple-100 rounded-lg flex items-center justify-center">
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
              <div className="pr-16">
                <p className="text-xs text-purple-600 font-bold uppercase tracking-wide mb-2">
                  Total Potential
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatCurrency(totalPotentialRevenue)}
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">All Quotations:</span>
                    <span className="font-semibold text-gray-900">
                      {analytics?.stats.totalQuotations}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Lost Value:</span>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(lostRevenue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Revenue Breakdown */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-blue-900">
                Monthly Revenue Analysis
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
                <span>Revenue Trend</span>
              </div>
            </div>
            <AreaChartComponent
              data={revenueChartData}
              dataKey="revenue"
              xAxisKey="name"
              height={350}
              gradientFrom="#3B82F6"
              gradientTo="#60A5FA"
              formatYAxis={formatCurrencyCompact}
              formatTooltip={formatCurrency}
            />
          </div>

          {/* Revenue by Status */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-blue-900 mb-4">
              Revenue Distribution by Status
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <PieChartComponent
                  data={statusChartData.map((item) => ({
                    name: item.name,
                    value: item.revenue,
                  }))}
                  height={350}
                />
              </div>
              <div className="space-y-3">
                {statusChartData.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">
                        {item.name}
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(item.revenue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{item.value} quotations</span>
                      <span>{item.percentage.toFixed(1)}% of total</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quotations Tab */}
      {activeTab === "quotations" && (
        <div className="space-y-4">
          {/* Quotation Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all hover:border-gray-300">
              <p className="text-xs text-gray-700 font-bold uppercase tracking-wide">
                Total
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {analytics?.stats.totalQuotations}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-100 hover:shadow-md transition-all hover:border-green-300">
              <p className="text-xs text-green-700 font-bold uppercase tracking-wide">
                Paid
              </p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {analytics?.stats.paidQuotations}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100 hover:shadow-md transition-all hover:border-blue-300">
              <p className="text-xs text-blue-700 font-bold uppercase tracking-wide">
                Accepted
              </p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {analytics?.stats.acceptedQuotations}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg shadow-sm border border-yellow-100 hover:shadow-md transition-all hover:border-yellow-300">
              <p className="text-xs text-yellow-700 font-bold uppercase tracking-wide">
                Pending
              </p>
              <p className="text-2xl font-bold text-yellow-900 mt-1">
                {analytics?.stats.pendingQuotations}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-100 hover:shadow-md transition-all hover:border-red-300">
              <p className="text-xs text-red-700 font-bold uppercase tracking-wide">
                Rejected
              </p>
              <p className="text-2xl font-bold text-red-900 mt-1">
                {analytics?.stats.rejectedQuotations}
              </p>
            </div>
          </div>

          {/* Quotation Status Visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-blue-900">
                  Status Distribution
                </h3>
                {selectedStatus && (
                  <button
                    onClick={() => setSelectedStatus(null)}
                    className="text-xs text-white px-3 py-1 bg-gray-500 hover:bg-gray-600 rounded-full font-medium transition-all"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              <PieChartComponent data={statusChartData} height={300} />

              {/* Interactive Status List */}
              <div className="mt-4 space-y-2">
                {statusChartData.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedStatus(item.status)}
                    className={`p-2 rounded-lg border cursor-pointer transition-all ${selectedStatus === item.status
                      ? "border-gray-400 bg-gray-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-gray-900">
                          {item.value}
                        </span>
                        <span className="text-gray-500">|</span>
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(item.revenue)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <h3 className="text-lg font-bold text-blue-900 mb-3">
                Conversion Funnel
              </h3>
              <div className="space-y-4 mt-6">
                {[
                  {
                    label: "Total Quotations",
                    value: analytics?.stats.totalQuotations,
                    color: "bg-gray-500",
                    width: 100,
                  },
                  {
                    label: "Sent to Clients",
                    value:
                      analytics?.stats.totalQuotations -
                      analytics?.stats.draftQuotations,
                    color: "bg-blue-500",
                    width: 85,
                  },
                  {
                    label: "Accepted",
                    value:
                      analytics?.stats.acceptedQuotations +
                      analytics?.stats.paidQuotations,
                    color: "bg-indigo-500",
                    width: 60,
                  },
                  {
                    label: "Paid (Converted)",
                    value: analytics?.stats.paidQuotations,
                    color: "bg-green-500",
                    width: analytics?.stats.conversionRate,
                  },
                ].map((stage, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">
                        {stage.label}
                      </span>
                      <span className="font-bold text-gray-900">
                        {stage.value}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden">
                      <div
                        className={`${stage.color} h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-semibold transition-all duration-500`}
                        style={{ width: `${stage.width}%` }}
                      >
                        {stage.width > 20 && `${stage.width.toFixed(0)}%`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Quotations Table - Filtered */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-blue-900">
                Recent Quotations
                {selectedStatus && (
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    (Filtered: {selectedStatus})
                  </span>
                )}
              </h3>
              <span className="text-sm text-gray-600">
                {filteredQuotations?.length || 0} shown
              </span>
            </div>
            <div className="overflow-x-auto">
              {filteredQuotations && filteredQuotations.length > 0 ? (
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
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                        Date
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
                          {quotation.businessName}
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                          {formatCurrency(quotation.totalAmount)}
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
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {formatDate(quotation.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-gray-500">
                    {selectedStatus
                      ? `No ${selectedStatus} quotations found`
                      : "No quotations available"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Companies Tab */}
      {activeTab === "companies" && (
        <div className="space-y-4">
          {/* Company Performance Chart */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-blue-900 mb-3">
              Top Company Performance
            </h3>
            <BarChartComponent
              data={companyPerformanceData}
              dataKey={[
                { key: "Revenue", color: "#10B981", name: "Revenue ($)" },
                { key: "Quotations", color: "#4F46E5", name: "Quotations" },
              ]}
              xAxisKey="name"
              height={400}
              formatTooltip={(value, index) =>
                index === 0 ? formatCurrency(value) : value
              }
            />
          </div>

          {/* Company Details Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-blue-900 mb-3">
              Company Analytics
            </h3>
            <div className="space-y-3">
              {analytics?.companyRevenues?.map((company, index) => (
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
                        <h4 className="font-semibold text-gray-900">
                          {company.companyName}
                        </h4>
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

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="bg-gray-50 px-2 py-1 rounded border border-gray-200">
                      <p className="text-xs text-gray-600">Quotations:</p>
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
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === "subscriptions" && (
        <div className="space-y-4">
          {/* Subscription Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-purple-600 font-bold uppercase tracking-wide mb-1">
                    Active Subscriptions
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {analytics?.subscriptionAnalytics?.reduce(
                      (sum, sub) => sum + sub.activeSubscriptions,
                      0
                    ) || 0}
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
                    Monthly Recurring
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {formatCurrency(
                      analytics?.subscriptionAnalytics?.reduce(
                        (sum, sub) => sum + sub.monthlyRecurring,
                        0
                      ) || 0
                    )}
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
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-indigo-600 font-bold uppercase tracking-wide mb-1">
                    Yearly Recurring
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {formatCurrency(
                      analytics?.subscriptionAnalytics?.reduce(
                        (sum, sub) => sum + sub.yearlyRecurring,
                        0
                      ) || 0
                    )}
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
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Revenue Chart */}
          {subscriptionRevenueData.length > 0 && (
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <h3 className="text-lg font-bold text-blue-900 mb-3">
                Subscription Revenue by Company
              </h3>
              <BarChartComponent
                data={subscriptionRevenueData}
                dataKey={[
                  { key: "Monthly", color: "#3B82F6", name: "Monthly MRR" },
                  { key: "Yearly", color: "#8B5CF6", name: "Yearly ARR" },
                ]}
                xAxisKey="name"
                height={350}
                formatTooltip={formatCurrency}
              />
            </div>
          )}

          {/* Subscription Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-blue-900 mb-3">
              Subscription Details
            </h3>
            {analytics?.subscriptionAnalytics &&
              analytics.subscriptionAnalytics.length > 0 ? (
              <div className="space-y-3">
                {analytics.subscriptionAnalytics.map((sub) => (
                  <div
                    key={sub.companyId}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {sub.companyName}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {sub.activeSubscriptions} Active Subscription
                          {sub.activeSubscriptions !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(sub.totalSubscriptionRevenue)}
                        </p>
                        <p className="text-xs text-gray-500">Total Revenue</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-gray-50 px-2 py-1 rounded border border-gray-200">
                        <p className="text-xs text-gray-600">
                          Monthly Recurring:
                        </p>
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(sub.monthlyRecurring)}/mo
                        </p>
                      </div>
                      <div className="bg-gray-50 px-2 py-1 rounded border border-gray-200">
                        <p className="text-xs text-gray-600">
                          Yearly Recurring:
                        </p>
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(sub.yearlyRecurring)}/yr
                        </p>
                      </div>
                    </div>

                    {sub.subscriptionsByProduct &&
                      sub.subscriptionsByProduct.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-2">
                            Products
                          </h5>
                          <div className="space-y-2">
                            {sub.subscriptionsByProduct.map((product) => (
                              <div
                                key={product.productId}
                                className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {product.productName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                                    {product.count} sub
                                    {product.count !== 1 ? "s" : ""}
                                  </span>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {formatCurrency(product.revenue)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                ))}
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <p className="text-gray-500">No active subscriptions yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
