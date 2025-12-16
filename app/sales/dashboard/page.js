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

const GET_SALESPERSON_ANALYTICS = gql`
  query GetSalesPersonAnalytics($timeRange: String) {
    getSalesPersonAnalytics(timeRange: $timeRange) {
      salesPersonId
      salesPersonName
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

export default function SalesDashboard() {
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [hoveredStatus, setHoveredStatus] = useState(null);
  const [timeRange, setTimeRange] = useState('all');
  
  const { data, loading, error } = useQuery(GET_SALESPERSON_ANALYTICS, {
    variables: { timeRange },
    fetchPolicy: 'cache-and-network',
  });

  const analytics = data?.getSalesPersonAnalytics;
  const stats = analytics?.stats;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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

  const getStatusColor = (status) => {
    const colors = {
      paid: 'bg-purple-100 text-purple-800 border-purple-300',
      accepted: 'bg-green-100 text-green-800 border-green-300',
      sent: 'bg-blue-100 text-blue-800 border-blue-300',
      viewed: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      draft: 'bg-gray-100 text-gray-800 border-gray-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
      expired: 'bg-yellow-100 text-yellow-800 border-yellow-300',
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

  // Filter quotations based on selection
  const filteredQuotations = selectedStatus 
    ? analytics?.recentQuotations.filter(q => {
        const allowedStatuses = getStatusMapping(selectedStatus);
        return allowedStatuses.includes(q.status.toLowerCase());
      })
    : analytics?.recentQuotations;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header - Lightning Fast Theme */}
      <div className="relative overflow-hidden glass-effect rounded-3xl p-8 border-2 border-white/40 shadow-2xl hover:shadow-3xl transition-all duration-500 card-3d">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 animate-gradient"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-3 animate-fade-in-up">
            <div className="flex items-center gap-3">
              {/* Lightning Icon */}
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl hover-glow animate-pulse-ring relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent shimmer"></div>
                <svg className="w-8 h-8 text-white animate-lightning relative z-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-5xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Sales
                </h1>
                <p className="text-sm font-bold bg-gradient-to-r from-gray-600 to-gray-500 bg-clip-text text-transparent">🚀 Performance Hub</p>
              </div>
            </div>
            <p className="text-xl font-bold text-gray-800">Welcome back, {user?.name || analytics?.salesPersonName || 'Sales Person'}! 👋</p>
            {analytics?.companyName && (
              <p className="text-sm text-gray-600 font-bold flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {analytics.companyName}
              </p>
            )}
            {analytics?.salesPersonId && (
              <p className="text-xs text-gray-500 font-medium">ID: {analytics.salesPersonId}</p>
            )}
          </div>
          
          {/* Time Range Filter - Enhanced */}
          <div className="glass-effect rounded-2xl p-5 shadow-xl border-2 border-white/40 hover:scale-105 transition-transform duration-300">
            <label className="text-sm font-bold text-gray-800 mb-3 block flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Time Period
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-gradient-to-r from-blue-50 to-purple-50 text-gray-900 rounded-xl px-5 py-3 font-bold focus:outline-none focus:ring-4 focus:ring-blue-300 cursor-pointer border-2 border-blue-200 hover:border-blue-400 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <option value="all">⚡ All Time</option>
              <option value="monthly">📅 This Month</option>
              <option value="3months">📊 Last 3 Months</option>
              <option value="quarterly">🎯 This Quarter</option>
              <option value="yearly">🗓️ This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics - Lightning Theme */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Quotations */}
        <div className="glass-effect p-7 rounded-3xl shadow-xl border-2 border-white/50 hover:shadow-2xl hover-glow transition-all duration-500 card-3d group relative overflow-hidden animate-fade-in-up" style={{animationDelay: '0.1s'}}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 opacity-50"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-700 font-black uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                Quotations
              </p>
              <p className="text-4xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mt-2">{stats?.totalQuotations || 0}</p>
              <p className="text-sm text-blue-600 mt-2 font-bold">⚡ All time</p>
            </div>
            <div className="p-5 bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-500 rounded-2xl shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative overflow-hidden">
              <svg className="w-10 h-10 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Won Deals */}
        <div className="glass-effect p-7 rounded-3xl shadow-xl border-2 border-white/50 hover:shadow-2xl hover-glow transition-all duration-500 card-3d group relative overflow-hidden animate-fade-in-up" style={{animationDelay: '0.2s'}}>
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-50"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-700 font-black uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Won Deals
              </p>
              <p className="text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mt-2">{stats?.wonQuotations || 0}</p>
              <p className="text-sm text-emerald-600 mt-2 font-bold flex items-center gap-1">
                🎯 {stats?.conversionRate?.toFixed(1) || 0}% success
              </p>
            </div>
            <div className="p-5 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-2xl shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative overflow-hidden">
              <svg className="w-10 h-10 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-purple-50 p-6 rounded-2xl shadow-md border border-purple-100 hover:shadow-xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Total Revenue</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mt-2">
                {formatCurrency(stats?.totalRevenue)}
              </p>
              <p className="text-sm text-gray-600 mt-1 font-medium">
                {stats?.paidQuotations || 0} paid
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-teal-50 p-6 rounded-2xl shadow-md border border-teal-100 hover:shadow-xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Avg Deal Value</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mt-2">
                {formatCurrency(stats?.averageQuotationValue)}
              </p>
              <p className="text-sm text-gray-600 mt-1 font-medium">Per quotation</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-lg">
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
          <p className="text-2xl font-bold text-yellow-700 mt-1">{stats?.pendingQuotations || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-slate-100 p-4 rounded-2xl shadow-md border border-gray-300 hover:shadow-lg transition-all">
          <p className="text-xs text-gray-700 font-semibold uppercase tracking-wide">Draft</p>
          <p className="text-2xl font-bold text-gray-700 mt-1">{stats?.draftQuotations || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-100 p-4 rounded-2xl shadow-md border border-red-200 hover:shadow-lg transition-all">
          <p className="text-xs text-red-700 font-semibold uppercase tracking-wide">Lost</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{stats?.lostQuotations || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-fuchsia-100 p-4 rounded-2xl shadow-md border border-purple-200 hover:shadow-lg transition-all">
          <p className="text-xs text-purple-700 font-semibold uppercase tracking-wide">Paid</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">{stats?.paidQuotations || 0}</p>
        </div>
      </div>

      {/* Charts Row: Status Distribution */}
      <div className="bg-gradient-to-br from-white to-indigo-50 p-6 rounded-2xl shadow-lg border border-indigo-100 hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Performance Overview</h2>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Status Distribution</h3>
              <PieChartComponent data={statusChartData} height={300} />
            </div>
            
            {/* Interactive Breakdown */}
            <div className="relative">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Click to Filter • Hover for Details</h3>
              <div className="space-y-2">
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
                        className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                          selectedStatus === item.status
                            ? 'border-indigo-500 bg-indigo-50 shadow-md'
                            : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                            {item.name}
                          </span>
                          <span className="text-lg font-bold text-gray-900">{item.value}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>{item.percentage.toFixed(1)}% of total</span>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Hover Tooltip */}
                      {hoveredStatus === item.status && (
                        <div className="absolute right-full mr-2 top-0 z-50 w-96 bg-white border-2 border-indigo-500 rounded-lg shadow-2xl p-4 animate-fadeIn">
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
                                    <span className="text-xs text-gray-500">{quotation.salesPerson || user?.name}</span>
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
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">No data available</div>
        )}
      </div>

      {/* Recent Quotations - Filtered */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Quotations
            {selectedStatus && (
              <span className="ml-2 text-sm font-normal text-indigo-600">
                ({selectedStatus})
              </span>
            )}
          </h2>
          <span className="text-sm text-gray-500">
            {filteredQuotations?.length || 0} shown
          </span>
        </div>
        <div className="overflow-x-auto">
          {filteredQuotations && filteredQuotations.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Quotation #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
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
              <p className="text-gray-500">
                {selectedStatus ? `No ${selectedStatus} quotations found` : 'No quotations available'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Trends - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Performance</h2>
            <Link 
              href="/sales/analytics"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Details →
            </Link>
          </div>
          {monthlyChartData.length > 0 ? (
            <AreaChartComponent 
              data={monthlyChartData} 
              dataKey="Revenue"
              xAxisKey="name"
              height={300}
              gradientFrom="#8B5CF6"
              gradientTo="#A78BFA"
              formatYAxis={formatCurrencyCompact}
              formatTooltip={formatCurrency}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">No revenue data available</div>
          )}
        </div>

        {/* Quotation Outcome Trend */}
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
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/sales/quotes" className="p-4 border-2 border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 text-left transition-all group">
            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">My Quotations</h3>
            <p className="text-sm text-gray-600 mt-1">Manage all quotations</p>
          </Link>
          <Link href="/sales/analytics" className="p-4 border-2 border-indigo-300 bg-indigo-50 rounded-xl hover:border-indigo-500 hover:bg-indigo-100 text-left transition-all group">
            <h3 className="font-semibold text-indigo-900 group-hover:text-indigo-700">Sales Analytics</h3>
            <p className="text-sm text-indigo-600 mt-1">Detailed insights</p>
          </Link>
          <Link href="/sales/tracking" className="p-4 border-2 border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 text-left transition-all group">
            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">Track Status</h3>
            <p className="text-sm text-gray-600 mt-1">Monitor progress</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
