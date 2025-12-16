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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl p-8 border border-gray-200 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">Admin Dashboard</h1>
            <p className="text-gray-700 text-lg font-medium">Welcome back, {user?.name || user?.email}!</p>
            {analytics?.companyName && (
              <p className="text-gray-500 text-sm mt-1">{analytics.companyName}</p>
            )}
          </div>
          
          {/* Time Range Filter */}
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Time Period</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-gradient-to-r from-emerald-50 to-cyan-50 text-gray-900 rounded-lg px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 cursor-pointer border border-gray-200"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-2xl shadow-md border border-blue-100 hover:shadow-xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Total Quotations</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mt-2">{analytics?.stats.totalQuotations || 0}</p>
              <p className="text-sm text-gray-500 mt-1 font-medium">Company-wide</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-green-50 p-6 rounded-2xl shadow-md border border-green-100 hover:shadow-xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Won Deals</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mt-2">{analytics?.stats.wonQuotations || 0}</p>
              <p className="text-sm text-emerald-600 mt-1 font-medium">Success rate: {analytics?.stats.conversionRate?.toFixed(1) || 0}%</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-emerald-50 p-6 rounded-2xl shadow-md border border-emerald-100 hover:shadow-xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Total Revenue</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mt-2">
                {formatCurrency(analytics?.stats.totalRevenue)}
              </p>
              <p className="text-sm text-gray-600 mt-1 font-medium">
                {analytics?.stats.paidQuotations || 0} paid
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-purple-50 p-6 rounded-2xl shadow-md border border-purple-100 hover:shadow-xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Avg Deal Value</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mt-2">
                {formatCurrency(analytics?.stats.averageQuotationValue)}
              </p>
              <p className="text-sm text-gray-600 mt-1 font-medium">Per quotation</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Status Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-yellow-50 to-amber-100 p-4 rounded-2xl shadow-md border border-yellow-200 hover:shadow-lg transition-all">
          <p className="text-xs text-yellow-700 font-semibold uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{analytics?.stats.pendingQuotations || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-slate-100 p-4 rounded-2xl shadow-md border border-gray-300 hover:shadow-lg transition-all">
          <p className="text-xs text-gray-700 font-semibold uppercase tracking-wide">Draft</p>
          <p className="text-2xl font-bold text-gray-700 mt-1">{analytics?.stats.draftQuotations || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-100 p-4 rounded-2xl shadow-md border border-red-200 hover:shadow-lg transition-all">
          <p className="text-xs text-red-700 font-semibold uppercase tracking-wide">Lost</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{analytics?.stats.lostQuotations || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-fuchsia-100 p-4 rounded-2xl shadow-md border border-purple-200 hover:shadow-lg transition-all">
          <p className="text-xs text-purple-700 font-semibold uppercase tracking-wide">Paid</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">{analytics?.stats.paidQuotations || 0}</p>
        </div>
      </div>

      {/* Charts Row: Status Distribution and Sales Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quotation Status Distribution */}
        <div className="bg-gradient-to-br from-white to-indigo-50 p-6 rounded-2xl shadow-lg border border-indigo-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Quotation Status Distribution</h2>
            {selectedStatus && (
              <button
                onClick={() => setSelectedStatus(null)}
                className="text-xs text-white px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-full font-medium transition-all shadow-md"
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
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Click to Filter • Hover for Details</h3>
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
                        className={`p-2 rounded-lg border-2 transition-all cursor-pointer ${
                          selectedStatus === item.status
                            ? 'border-indigo-500 bg-indigo-50 shadow-md'
                            : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
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
                        <div className="absolute left-full ml-2 top-0 z-50 w-96 bg-white border-2 border-indigo-500 rounded-lg shadow-2xl p-4 animate-fadeIn">
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
                                <div key={quotation.id} className="p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-indigo-50 transition-colors">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-gray-900">{quotation.quotationNo}</span>
                                    <span className="text-xs font-bold text-indigo-600">{formatCurrency(quotation.totalAmount)}</span>
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
                                  className="mt-3 w-full p-2 bg-blue-50 border border-blue-200 rounded-lg text-center hover:bg-blue-100 transition-colors cursor-pointer"
                                >
                                  <p className="text-xs text-blue-700">
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
        <div className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-2xl shadow-lg border border-blue-100 hover:shadow-xl transition-all">
          <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">Top Sales Team Performance</h2>
          {salesPerformanceData.length > 0 ? (
            <div className="space-y-3">
              {analytics?.topSalespeople?.slice(0, 5).map((sp, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedSalesPerson(sp.name)}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedSalesPerson === sp.name
                      ? 'border-indigo-500 bg-indigo-50 shadow-md'
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-teal-100 to-teal-200 rounded-full flex items-center justify-center">
                        <span className="text-teal-700 font-bold text-sm">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{sp.name}</p>
                        <p className="text-xs text-gray-500">{sp.salesPersonId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600">{formatCurrency(sp.revenue)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-blue-50 px-2 py-1 rounded">
                      <span className="text-blue-600">Quotes: </span>
                      <span className="font-bold text-blue-900">{sp.quotationCount}</span>
                    </div>
                    <div className="bg-green-50 px-2 py-1 rounded">
                      <span className="text-green-600">Won: </span>
                      <span className="font-bold text-green-900">{sp.wonCount}</span>
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
      <div className="bg-gradient-to-br from-white to-emerald-50 p-6 rounded-2xl shadow-lg border border-emerald-100 hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Recent Quotations
            {(selectedStatus || selectedSalesPerson) && (
              <span className="ml-2 text-sm font-normal text-indigo-600">
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
                className="text-xs text-black px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-full font-medium"
              >
                Clear All Filters
              </button>
            )}
            <span className="text-sm text-gray-500">
              {filteredQuotations?.length || 0} shown
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          {filteredQuotations && filteredQuotations.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Quotation #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sales Person</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQuotations.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{quotation.quotationNo}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{quotation.clientName || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{quotation.salesPerson || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(quotation.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(quotation.status)}`}>
                        {quotation.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(quotation.createdAt)}</td>
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
      <div className="bg-gradient-to-br from-white to-green-50 p-6 rounded-2xl shadow-lg border border-green-100 hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Monthly Revenue Trend</h2>
          <Link 
            href="/admin/analytics"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
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
            gradientFrom="#10B981"
            gradientTo="#34D399"
            formatYAxis={formatCurrencyCompact}
            formatTooltip={formatCurrency}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">No revenue data available</div>
        )}
      </div>

      {/* Win/Loss Trend */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quotation Outcome Trend</h2>
        {monthlyChartData.length > 0 ? (
          <LineChartComponent
            data={monthlyChartData}
            lines={[
              { key: 'Won', color: '#10B981', name: 'Won' },
              { key: 'Lost', color: '#EF4444', name: 'Lost' },
              { key: 'Pending', color: '#F59E0B', name: 'Pending' }
            ]}
            xAxisKey="name"
            height={300}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">No data available</div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/admin/analytics" className="p-4 border-2 border-teal-300 bg-teal-50 rounded-xl hover:border-teal-500 hover:bg-teal-100 text-left transition-all group">
            <h3 className="font-semibold text-teal-900 group-hover:text-teal-700">Admin Analytics</h3>
            <p className="text-sm text-teal-600 mt-1">In-depth insights</p>
          </Link>
          <Link href="/admin/quotes" className="p-4 border-2 border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 text-left transition-all group">
            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">Manage Quotations</h3>
            <p className="text-sm text-gray-600 mt-1">Create and edit</p>
          </Link>
          <Link href="/admin/sales-person-management" className="p-4 border-2 border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 text-left transition-all group">
            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">Sales Team</h3>
            <p className="text-sm text-gray-600 mt-1">Manage team</p>
          </Link>
          <Link href="/admin/tracking" className="p-4 border-2 border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 text-left transition-all group">
            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">Track Progress</h3>
            <p className="text-sm text-gray-600 mt-1">Monitor status</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
