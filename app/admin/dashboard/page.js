// dashboard/page.js

'use client';

import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import Link from 'next/link';
import PieChartComponent from '../../components/charts/PieChartComponent';
import BarChartComponent from '../../components/charts/BarChartComponent';
import LineChartComponent from '../../components/charts/LineChartComponent';
import AreaChartComponent from '../../components/charts/AreaChartComponent';

const GET_COMPANY_ANALYTICS = gql`
  query GetCompanyAnalytics($timeRange: String) {
    getCompanyAnalytics(timeRange: $timeRange) {
      companyName
      stats {
        totalQuotations
        wonQuotations
        lostQuotations
        pendingQuotations
        draftQuotations
        paidQuotations
        totalRevenue
        averageQuotationValue
        conversionRate
      }
      monthlyRevenue {
        month
        revenue
        quotationCount
        won
        lost
        pending
      }
      topSalespeople {
        salesPersonId
        name
        revenue
        quotationCount
        wonCount
      }
      recentQuotations {
        id
        quotationNo
        totalAmount
        status
        clientName
        salesPerson
        createdAt
      }
      quotationStatusBreakdown {
        status
        count
        percentage
      }
    }
  }
`;

export default function AdminDashboard() {
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState(null);
  const [hoveredStatus, setHoveredStatus] = useState(null);
  const [timeRange, setTimeRange] = useState('all');

  const { data, loading, error } = useQuery(GET_COMPANY_ANALYTICS, {
    variables: { timeRange },
    fetchPolicy: 'network-only',
  });

  const analytics = data?.getCompanyAnalytics;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      paid: 'bg-green-100 text-green-800 border-green-300',
      accepted: 'bg-blue-100 text-blue-800 border-blue-300',
      sent: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      viewed: 'bg-purple-100 text-purple-800 border-purple-300',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      draft: 'bg-gray-100 text-gray-800 border-gray-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
      won: 'bg-green-100 text-green-800 border-green-300',
      lost: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Map business status (won/lost/pending/draft) to actual quotation statuses
  const getStatusMapping = (businessStatus) => {
    const mappings = {
      'won': ['paid', 'accepted', 'won'],
      'lost': ['rejected', 'lost'],
      'pending': ['sent', 'pending'],
      'draft': ['draft']
    };
    return mappings[businessStatus.toLowerCase()] || [businessStatus.toLowerCase()];
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

  // Prepare chart data
  const statusChartData = analytics?.quotationStatusBreakdown.map(item => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    percentage: item.percentage,
    status: item.status
  })) || [];

  const monthlyChartData = analytics?.monthlyRevenue.map(item => ({
    name: item.month,
    Revenue: item.revenue,
    Won: item.won,
    Lost: item.lost,
    Pending: item.pending
  })) || [];

  const salesPerformanceData = analytics?.topSalespeople?.map(sp => ({
    name: sp.name.length > 12 ? sp.name.substring(0, 12) + '...' : sp.name,
    Revenue: sp.revenue,
    Quotations: sp.quotationCount,
    Won: sp.wonCount
  })) || [];

  // Filter quotations
  const filteredQuotations = analytics?.recentQuotations?.filter(q => {
    if (selectedStatus) {
      const allowedStatuses = getStatusMapping(selectedStatus);
      if (!allowedStatuses.includes(q.status.toLowerCase())) return false;
    }
    if (selectedSalesPerson && q.salesPerson !== selectedSalesPerson) return false;
    return true;
  }) || [];

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
                <svg className="w-6 h-6 text-blue-600 animate-lightning" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                  Admin Dashboard
                </h1>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="text-sm text-gray-400 font-semibold">{analytics?.companyName || 'Company'}</p>
                </div>
              </div>
            </div>
            <p className="text-base mt-4 text-gray-700">Welcome back, <span className="font-bold text-blue-900">{user?.name || user?.email}</span></p>
          </div>

          {/* Right Section - Time Period Filter */}
          <div className="w-full sm:w-auto bg-blue-50 rounded-lg p-4 border border-blue-100 shadow-md">
            <label className="text-xs font-bold text-blue-900 mb-2 block">TIME PERIOD</label>
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
        {/* Quotations */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
                Quotations
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{analytics?.stats.totalQuotations || 0}</p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">Company-wide</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Won Deals */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-red-600 font-bold uppercase tracking-wide mb-1">
                Won Deals
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{analytics?.stats.wonQuotations || 0}</p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">{analytics?.stats.conversionRate?.toFixed(1) || 0}% success rate</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">
                Revenue
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatCurrency(analytics?.stats.totalRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">{analytics?.stats.paidQuotations || 0} paid</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Avg Deal Value */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-yellow-600 font-bold uppercase tracking-wide mb-1">
                Avg Deal Value
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatCurrency(analytics?.stats.averageQuotationValue)}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">Per quotation</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Status Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100 hover:shadow-md transition-all hover:border-gray-300">
          <p className="text-xs text-blue-700 font-bold uppercase tracking-wide">Draft</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{analytics?.stats.draftQuotations || 0}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-100 hover:shadow-md transition-all hover:border-red-300">
          <p className="text-xs text-red-700 font-bold uppercase tracking-wide">Lost</p>
          <p className="text-2xl font-bold text-red-900 mt-1">{analytics?.stats.lostQuotations || 0}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-100 hover:shadow-md transition-all hover:border-green-300">
          <p className="text-xs text-green-700 font-bold uppercase tracking-wide">Paid</p>
          <p className="text-2xl font-bold text-green-900 mt-1">{analytics?.stats.paidQuotations || 0}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow-sm border border-yellow-100 hover:shadow-md transition-all hover:border-yellow-300">
          <p className="text-xs text-yellow-700 font-bold uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-bold text-yellow-900 mt-1">{analytics?.stats.pendingQuotations || 0}</p>
        </div>
      </div>

      {/* Charts Row: Status Distribution and Sales Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quotation Status Distribution */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-blue-900">Quotation Status Distribution</h2>
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
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Click to Filter • Hover for Details</h3>
                {statusChartData.map((item, index) => {
                  const allowedStatuses = getStatusMapping(item.status);
                  const statusQuotations = analytics?.recentQuotations?.filter(q =>
                    allowedStatuses.includes(q.status.toLowerCase())
                  ) || [];

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
                          ? 'border-gray-400 bg-gray-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                            {item.name}
                          </span>
                          <span className="text-sm font-bold text-gray-900">{item.value}</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {item.percentage.toFixed(1)}% of total
                        </div>
                      </div>

                      {/* Hover Tooltip */}
                      {hoveredStatus === item.status && (
                        <div className="absolute left-full ml-2 top-0 z-50 w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4 animate-fadeIn">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {item.name} Quotations
                              </h4>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Showing {statusQuotations.length} of {item.value} total
                              </p>
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                              {item.name}
                            </span>
                          </div>
                          {statusQuotations.length > 0 ? (
                            <div className="max-h-64 overflow-y-auto space-y-2">
                              {statusQuotations.slice(0, 5).map((quotation) => (
                                <div key={quotation.id} className="p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-gray-900">{quotation.quotationNo}</span>
                                    <span className="text-xs font-bold text-gray-900">{formatCurrency(quotation.totalAmount)}</span>
                                  </div>
                                  <div className="text-xs text-gray-600 truncate">{quotation.clientName}</div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-gray-500">{quotation.salesPerson}</span>
                                    <span className="text-xs text-gray-400">{formatDate(quotation.createdAt)}</span>
                                  </div>
                                </div>
                              ))}
                              {statusQuotations.length > 5 && (
                                <div className="text-center text-xs text-gray-500 pt-2">
                                  + {statusQuotations.length - 5} more recent
                                </div>
                              )}
                              {statusQuotations.length < item.value && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStatus(item.status);
                                    setHoveredStatus(null);
                                  }}
                                  className="mt-3 w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-center hover:bg-gray-100 transition-colors cursor-pointer"
                                >
                                  <p className="text-xs text-gray-700">
                                    <span className="font-semibold">Click to view all {item.value} quotations</span>
                                  </p>
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <p className="text-sm">No recent {item.name.toLowerCase()} quotations</p>
                              {item.value > 0 && (
                                <p className="text-xs mt-2">
                                  ({item.value} total - click to view all)
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">No data available</div>
          )}
        </div>

        {/* Top Sales Team Performance */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
          <h2 className="text-lg font-bold text-blue-900 mb-3">Top Sales Team Performance</h2>
          {salesPerformanceData.length > 0 ? (
            <div className="space-y-2">
              {analytics?.topSalespeople?.slice(0, 5).map((sp, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedSalesPerson(sp.name)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${selectedSalesPerson === sp.name
                    ? 'border-gray-400 bg-gray-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-700 font-bold text-sm">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{sp.name}</p>
                        <p className="text-xs text-gray-500">{sp.salesPersonId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(sp.revenue)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 px-2 py-1 rounded border border-gray-200">
                      <span className="text-gray-600">Quotes: </span>
                      <span className="font-bold text-gray-900">{sp.quotationCount}</span>
                    </div>
                    <div className="bg-gray-50 px-2 py-1 rounded border border-gray-200">
                      <span className="text-gray-600">Won: </span>
                      <span className="font-bold text-gray-900">{sp.wonCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">No sales data available</div>
          )}
        </div>
      </div>

      {/* Recent Quotations - Filtered */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-blue-900">
            Recent Quotations
            {(selectedStatus || selectedSalesPerson) && (
              <span className="ml-2 text-sm font-normal text-gray-600">
                (Filtered)
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {(selectedStatus || selectedSalesPerson) && (
              <button
                onClick={() => {
                  setSelectedStatus(null);
                  setSelectedSalesPerson(null);
                }}
                className="text-xs text-gray-700 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-full font-medium"
              >
                Clear All Filters
              </button>
            )}
            <span className="text-sm text-gray-600">
              {filteredQuotations?.length || 0} shown
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          {filteredQuotations && filteredQuotations.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Quotation #</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Client</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Sales Person</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQuotations.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{quotation.quotationNo}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{quotation.clientName || 'N/A'}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{quotation.salesPerson || 'N/A'}</td>
                    <td className="px-4 py-2 text-sm font-semibold text-gray-900">{formatCurrency(quotation.totalAmount)}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(quotation.status)}`}>
                        {quotation.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{formatDate(quotation.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">No quotations match the current filter</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Performance Chart */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-blue-900">Monthly Revenue Trend</h2>
          <Link
            href="/admin/analytics"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            View Details →
          </Link>
        </div>
        {monthlyChartData.length > 0 ? (
          <AreaChartComponent
            data={monthlyChartData}
            dataKey="Revenue"
            xAxisKey="name"
            height={300}
            gradientFrom="#3B82F6"
            gradientTo="#60A5FA"
            formatYAxis={formatCurrencyCompact}
            formatTooltip={formatCurrency}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">No revenue data available</div>
        )}
      </div>

      {/* Win/Loss Trend */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
        <h2 className="text-lg font-bold text-blue-900 mb-3">Quotation Outcome Trend</h2>
        {monthlyChartData.length > 0 ? (
          <LineChartComponent
            data={monthlyChartData}
            lines={[
              { key: 'Won', color: '#10B981', name: 'Won' },
              { key: 'Lost', color: '#F87171', name: 'Lost' },
              { key: 'Pending', color: '#3B82F6', name: 'Pending' }
            ]}
            xAxisKey="name"
            height={300}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">No data available</div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300">
        <h2 className="text-lg font-bold text-blue-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/admin/analytics" className="group p-5 border border-gray-200 bg-linear-to-br from-blue-50 to-white rounded-xl hover:shadow-lg hover:border-blue-300 transition-all duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">Admin Analytics</h3>
                <p className="text-xs text-gray-500 mt-1">In-depth insights</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-all group-hover:translate-x-1 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link href="/admin/quotes" className="group p-5 border border-gray-200 bg-linear-to-br from-green-50 to-white rounded-xl hover:shadow-lg hover:border-green-300 transition-all duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-green-900 transition-colors">Manage Quotation</h3>
                <p className="text-xs text-gray-500 mt-1">Create and edit</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-all group-hover:translate-x-1 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link href="/admin/sales-person-management" className="group p-5 border border-gray-200 bg-linear-to-br from-purple-50 to-white rounded-xl hover:shadow-lg hover:border-purple-300 transition-all duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-900 transition-colors">Sales Management</h3>
                <p className="text-xs text-gray-500 mt-1">Manage team</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-all group-hover:translate-x-1 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link href="/admin/tracking" className="group p-5 border border-gray-200 bg-linear-to-br from-orange-50 to-white rounded-xl hover:shadow-lg hover:border-orange-300 transition-all duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-orange-900 transition-colors">Quotation Tracking</h3>
                <p className="text-xs text-gray-500 mt-1">Monitor status</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-orange-600 transition-all group-hover:translate-x-1 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
