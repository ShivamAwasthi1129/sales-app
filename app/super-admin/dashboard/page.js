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
  const [timeRange, setTimeRange] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [hoveredStatus, setHoveredStatus] = useState(null);
  
  const { data, loading, error } = useQuery(GET_DASHBOARD_ANALYTICS, {
    variables: { timeRange }
  });

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
      draft: 'bg-gray-100 text-gray-800 border-gray-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
      expired: 'bg-orange-100 text-orange-800 border-orange-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
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
  const statusChartData = analytics?.quotationStatusBreakdown.map(item => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    percentage: item.percentage,
    totalValue: item.totalValue,
    status: item.status
  })) || [];

  const roleChartData = analytics?.roleDistribution.map(item => ({
    name: item.role,
    value: item.count,
    percentage: item.percentage
  })) || [];

  const revenueChartData = analytics?.monthlyRevenue.map(item => ({
    name: item.month,
    revenue: item.revenue,
    quotations: item.quotationCount
  })) || [];

  // Filter data based on selections
  const filteredQuotations = selectedStatus 
    ? analytics?.recentQuotations.filter(q => q.status === selectedStatus)
    : analytics?.recentQuotations;

  const filteredUsers = selectedRole
    ? analytics?.recentUsers.filter(u => u.role === selectedRole)
    : analytics?.recentUsers;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header with Filter - Lightning Theme */}
      <div className="relative overflow-hidden glass-effect rounded-3xl p-8 border-2 border-white/40 shadow-2xl hover:shadow-3xl transition-all duration-500 card-3d">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 animate-gradient"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-3 animate-fade-in-up">
            <div className="flex items-center gap-3">
              {/* Lightning Icon */}
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-xl hover-glow animate-pulse-ring relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent shimmer"></div>
                <svg className="w-8 h-8 text-white animate-lightning relative z-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-5xl font-black gradient-text">Super Admin</h1>
                <p className="text-sm font-bold bg-gradient-to-r from-gray-600 to-gray-500 bg-clip-text text-transparent">👑 Ultimate Control Center</p>
              </div>
            </div>
            <p className="text-xl font-bold text-gray-800">Welcome back, {user?.name || user?.email} 👋</p>
            <p className="text-sm text-gray-600 font-medium">Complete system analytics and insights at your fingertips</p>
          </div>
          
          {/* Time Range Filter - Enhanced */}
          <div className="glass-effect rounded-2xl p-5 shadow-xl border-2 border-white/40 hover:scale-105 transition-transform duration-300">
            <label className="text-sm font-bold text-gray-800 mb-3 block flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Time Period
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-gradient-to-r from-indigo-50 to-purple-50 text-gray-900 rounded-xl px-5 py-3 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-300 cursor-pointer border-2 border-indigo-200 hover:border-indigo-400 transition-all duration-300 shadow-md hover:shadow-lg"
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
        {/* Total Users Card */}
        <div className="glass-effect p-7 rounded-3xl shadow-xl border-2 border-white/50 hover:shadow-2xl hover-glow transition-all duration-500 card-3d group relative overflow-hidden animate-fade-in-up" style={{animationDelay: '0.1s'}}>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-50"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-700 font-black uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                Total Users
              </p>
              <p className="text-4xl font-black gradient-text mt-2">{analytics?.stats.totalUsers || 0}</p>
              <p className="text-sm text-emerald-600 mt-2 font-bold flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {analytics?.stats.activeUsers || 0} active
              </p>
            </div>
            <div className="p-5 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative overflow-hidden">
              <svg className="w-10 h-10 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Companies Card */}
        <div className="glass-effect p-7 rounded-3xl shadow-xl border-2 border-white/50 hover:shadow-2xl hover-glow transition-all duration-500 card-3d group relative overflow-hidden animate-fade-in-up" style={{animationDelay: '0.2s'}}>
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-50"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-700 font-black uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Companies
              </p>
              <p className="text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mt-2">{analytics?.stats.totalCompanies || 0}</p>
              <p className="text-sm text-emerald-600 mt-2 font-bold flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {analytics?.stats.activeCompanies || 0} active
              </p>
            </div>
            <div className="p-5 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-2xl shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative overflow-hidden">
              <svg className="w-10 h-10 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="glass-effect p-7 rounded-3xl shadow-xl border-2 border-white/50 hover:shadow-2xl hover-glow transition-all duration-500 card-3d group relative overflow-hidden animate-fade-in-up" style={{animationDelay: '0.3s'}}>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 opacity-50"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-700 font-black uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Total Revenue
              </p>
              <p className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mt-2">
                {formatCurrency(analytics?.stats.totalRevenue)}
              </p>
              <p className="text-sm text-emerald-600 mt-2 font-bold flex items-center gap-1">
                💰 {analytics?.stats.paidQuotations || 0} paid
              </p>
            </div>
            <div className="p-5 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative overflow-hidden">
              <svg className="w-10 h-10 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Conversion Rate Card */}
        <div className="glass-effect p-7 rounded-3xl shadow-xl border-2 border-white/50 hover:shadow-2xl hover-glow transition-all duration-500 card-3d group relative overflow-hidden animate-fade-in-up" style={{animationDelay: '0.4s'}}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 opacity-50"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-700 font-black uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                Conversion
              </p>
              <p className="text-4xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mt-2">
                {analytics?.stats.conversionRate?.toFixed(1) || 0}%
              </p>
              <p className="text-sm text-blue-600 mt-2 font-bold">
                Avg: {formatCurrency(analytics?.stats.averageQuotationValue)}
              </p>
            </div>
            <div className="p-5 bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-500 rounded-2xl shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative overflow-hidden">
              <svg className="w-10 h-10 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quotation Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-white to-gray-50 p-4 rounded-2xl shadow-md border border-gray-200 hover:shadow-lg transition-all">
          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Total Quotations</p>
          <p className="text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent mt-1">{analytics?.stats.totalQuotations || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-4 rounded-2xl shadow-md border border-green-200 hover:shadow-lg transition-all">
          <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">Paid</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{analytics?.stats.paidQuotations || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-cyan-100 p-4 rounded-2xl shadow-md border border-blue-200 hover:shadow-lg transition-all">
          <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Accepted</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{analytics?.stats.acceptedQuotations || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-amber-100 p-4 rounded-2xl shadow-md border border-yellow-200 hover:shadow-lg transition-all">
          <p className="text-xs text-yellow-700 font-semibold uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{analytics?.stats.pendingQuotations || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-slate-100 p-4 rounded-2xl shadow-md border border-gray-300 hover:shadow-lg transition-all">
          <p className="text-xs text-gray-700 font-semibold uppercase tracking-wide">Draft</p>
          <p className="text-2xl font-bold text-gray-700 mt-1">{analytics?.stats.draftQuotations || 0}</p>
        </div>
      </div>

      {/* Charts Row 1: Status & Role Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quotation Status Pie Chart */}
        <div className="bg-gradient-to-br from-white to-indigo-50 p-6 rounded-2xl shadow-lg border border-indigo-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Quotation Status Distribution</h2>
            <div className="flex items-center gap-2">
              {selectedStatus && (
                <button
                  onClick={() => setSelectedStatus(null)}
                  className="text-xs text-white px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-full font-medium transition-all shadow-md"
                >
                  Clear Filter
                </button>
              )}
              <span className="text-sm text-gray-600 font-medium">{analytics?.stats.totalQuotations} total</span>
            </div>
          </div>
          {statusChartData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pie Chart */}
              <div className="cursor-pointer">
                <PieChartComponent data={statusChartData} height={300} />
              </div>
              
              {/* Detailed Breakdown with Hover */}
              <div className="space-y-2 relative">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Click Status • Hover for Details</h3>
                {statusChartData.map((item, index) => {
                  const avgValue = item.value > 0 ? item.totalValue / item.value : 0;
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
                          <span className="text-sm font-bold text-gray-900">{item.value}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">{item.percentage.toFixed(1)}% of total</span>
                          <span className="font-semibold text-emerald-600">{formatCurrency(item.totalValue)}</span>
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
                        <div className="absolute right-full mr-2 top-0 z-50 w-72 bg-white border-2 border-indigo-500 rounded-lg shadow-2xl p-4 animate-fadeIn">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                            <h4 className="font-semibold text-gray-900">{item.name} Status</h4>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                              {item.name}
                            </span>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                              <span className="text-xs text-gray-600">Total Count</span>
                              <span className="text-sm font-bold text-blue-900">{item.value} quotations</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                              <span className="text-xs text-gray-600">Total Value</span>
                              <span className="text-sm font-bold text-green-900">{formatCurrency(item.totalValue)}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                              <span className="text-xs text-gray-600">Average Deal</span>
                              <span className="text-sm font-bold text-purple-900">{formatCurrency(avgValue)}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                              <span className="text-xs text-gray-600">Percentage</span>
                              <span className="text-sm font-bold text-orange-900">{item.percentage.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                            <p className="text-xs text-gray-500">Click to filter quotations below</p>
                          </div>
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

        {/* Role Distribution Pie Chart */}
        <div className="bg-gradient-to-br from-white to-purple-50 p-6 rounded-2xl shadow-lg border border-purple-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">User Role Distribution</h2>
            <div className="flex items-center gap-2">
              {selectedRole && (
                <button
                  onClick={() => setSelectedRole(null)}
                  className="text-xs text-white px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-full font-medium transition-all shadow-md"
                >
                  Clear Filter
                </button>
              )}
              <span className="text-sm text-gray-600 font-medium">{analytics?.stats.totalUsers} users</span>
            </div>
          </div>
          {roleChartData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pie Chart */}
              <div className="cursor-pointer">
                <PieChartComponent data={roleChartData} height={300} />
              </div>
              
              {/* Detailed Breakdown */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Detailed Breakdown</h3>
                {roleChartData.map((item, index) => {
                  const roleColors = {
                    'Super Admin': 'from-purple-500 to-pink-500',
                    'Admin': 'from-blue-500 to-indigo-500',
                    'Customer': 'from-green-500 to-emerald-500',
                    'Sales Person': 'from-yellow-500 to-orange-500',
                  };
                  const gradient = roleColors[item.name] || 'from-gray-500 to-gray-600';
                  
                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedRole(item.name)}
                      className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedRole === item.name
                          ? 'border-indigo-500 bg-indigo-50 shadow-md'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${gradient}`}></div>
                          <span className="text-sm font-semibold text-gray-900">{item.name}</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900">{item.value}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                        <span>{item.percentage.toFixed(1)}% of all users</span>
                        <span className="font-medium">Click to filter</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`bg-gradient-to-r ${gradient} h-1.5 rounded-full transition-all`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">No data available</div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-2xl shadow-lg border border-blue-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Recent Users
              {selectedRole && (
                <span className="ml-2 text-sm font-normal text-indigo-600">
                  ({selectedRole})
                </span>
              )}
            </h2>
            <span className="text-sm text-gray-500">
              {filteredUsers?.length || 0} shown
            </span>
          </div>
          <div className={`space-y-3 ${selectedRole && filteredUsers?.length > 5 ? 'max-h-96 overflow-y-auto pr-2' : ''}`}>
            {filteredUsers && filteredUsers.length > 0 ? (
              (selectedRole ? filteredUsers : filteredUsers.slice(0, 5)).map((recentUser) => (
                <div key={recentUser.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-indigo-600">
                        {recentUser.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{recentUser.name}</p>
                      <p className="text-xs text-gray-500">{recentUser.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                      {recentUser.role}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(recentUser.createdAt)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                {selectedRole ? `No ${selectedRole} users found` : 'No users available'}
              </div>
            )}
          </div>
        </div>

        {/* Recent Quotations */}
        <div className="bg-gradient-to-br from-white to-emerald-50 p-6 rounded-2xl shadow-lg border border-emerald-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
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
          <div className="space-y-3">
            {filteredQuotations && filteredQuotations.length > 0 ? (
              filteredQuotations.map((quotation) => (
                <div key={quotation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{quotation.quotationNo}</p>
                    <p className="text-xs text-gray-500">{quotation.businessName}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(quotation.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(quotation.totalAmount)}</p>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(quotation.status)}`}>
                      {quotation.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                {selectedStatus ? `No ${selectedStatus} quotations found` : 'No quotations available'}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Charts Row 2: Revenue Trend */}
      <div className="bg-gradient-to-br from-white to-green-50 p-6 rounded-2xl shadow-lg border border-green-100 hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Revenue Trend Analysis</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Last 6 months</span>
            <Link 
              href="/super-admin/analytics"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View Details →
            </Link>
          </div>
        </div>
        {revenueChartData.length > 0 ? (
          <AreaChartComponent 
            data={revenueChartData} 
            dataKey="revenue"
            xAxisKey="name"
            height={300}
            formatYAxis={formatCurrencyCompact}
            formatTooltip={formatCurrency}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">No revenue data available</div>
        )}
      </div>

      {/* Charts Row 3: Quotations by Status - Bar Chart */}
      <div className="bg-gradient-to-br from-white to-indigo-50 p-6 rounded-2xl shadow-lg border border-indigo-100 hover:shadow-xl transition-all">
        <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">Quotation Status Breakdown</h2>
        {analytics?.quotationStatusBreakdown && analytics.quotationStatusBreakdown.length > 0 ? (
          <BarChartComponent
            data={analytics.quotationStatusBreakdown.map(item => ({
              name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
              Quotations: item.count,
              Revenue: item.totalValue
            }))}
            dataKey={[
              { key: 'Quotations', color: '#4F46E5', name: 'Quotations' },
              { key: 'Revenue', color: '#10B981', name: 'Revenue ($)' }
            ]}
            xAxisKey="name"
            height={300}
            formatTooltip={(value, index) => {
              return index === 1 ? formatCurrency(value) : value;
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">No data available</div>
        )}
      </div>

      {/* Company Performance */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">💰</span>
            Top Company Performance
          </h2>
          <Link 
            href="/super-admin/analytics"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View All Analytics →
          </Link>
        </div>
        
        {analytics?.companyRevenues && analytics.companyRevenues.length > 0 ? (
          <div className="space-y-4">
            {analytics.companyRevenues.slice(0, 5).map((company, index) => {
              const maxRevenue = Math.max(...analytics.companyRevenues.map(c => c.totalRevenue), 1);
              const percentage = (company.totalRevenue / maxRevenue) * 100;
              
              return (
                <div key={company.companyId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center">
                        <span className="text-emerald-700 font-bold text-sm">#{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{company.companyName}</h3>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          company.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {company.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">
                        {formatCurrency(company.totalRevenue)}
                      </p>
                      <p className="text-xs text-gray-500">Total Revenue</p>
                    </div>
                  </div>

                  {/* Revenue Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-green-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium">Total Quotations</p>
                      <p className="text-lg font-bold text-blue-900">{company.totalQuotations}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-xs text-green-600 font-medium">Paid</p>
                      <p className="text-lg font-bold text-green-900">{company.paidQuotations}</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-xs text-yellow-600 font-medium">Conversion Rate</p>
                      <p className="text-lg font-bold text-yellow-900">{company.conversionRate.toFixed(1)}%</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-xs text-purple-600 font-medium">Avg Value</p>
                      <p className="text-lg font-bold text-purple-900">{formatCurrency(company.averageValue)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No revenue data available yet</p>
          </div>
        )}
      </div>

      {/* Recent Activity Grid - Filtered */}
 

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/super-admin/analytics" className="p-4 border-2 border-indigo-300 bg-indigo-50 rounded-xl hover:border-indigo-500 hover:bg-indigo-100 text-left transition-all group">
            <h3 className="font-semibold text-indigo-900 group-hover:text-indigo-700">Super Analytics</h3>
            <p className="text-sm text-indigo-600 mt-1">In-depth insights</p>
          </Link>
          <Link href="/super-admin/users" className="p-4 border-2 border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 text-left transition-all group">
            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">Manage Users</h3>
            <p className="text-sm text-gray-600 mt-1">View and edit user accounts</p>
          </Link>
          <Link href="/super-admin/companies" className="p-4 border-2 border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 text-left transition-all group">
            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">Manage Companies</h3>
            <p className="text-sm text-gray-600 mt-1">Configure company settings</p>
          </Link>
          <Link href="/super-admin/control" className="p-4 border-2 border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 text-left transition-all group">
            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">Control Center</h3>
            <p className="text-sm text-gray-600 mt-1">Access system controls</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
