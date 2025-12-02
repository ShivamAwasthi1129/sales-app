'use client';

import { useAuth } from '../../../contexts/AuthContext';
import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import Link from 'next/link';

const GET_DASHBOARD_ANALYTICS = gql`
  query GetDashboardAnalytics {
    getDashboardAnalytics {
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
  const { data, loading, error } = useQuery(GET_DASHBOARD_ANALYTICS);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Super Admin Dashboard</h1>
            <p className="text-indigo-100 text-lg">Welcome back, {user?.name || user?.email}</p>
            <p className="text-indigo-200 text-sm mt-1">Complete system analytics and insights</p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/20 backdrop-blur-lg rounded-xl p-4">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{analytics?.stats.totalUsers || 0}</p>
              <p className="text-sm text-green-600 mt-1">
                {analytics?.stats.activeUsers || 0} active
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Companies</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{analytics?.stats.totalCompanies || 0}</p>
              <p className="text-sm text-green-600 mt-1">
                {analytics?.stats.activeCompanies || 0} active
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(analytics?.stats.totalRevenue)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {analytics?.stats.paidQuotations || 0} paid
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Conversion Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {analytics?.stats.conversionRate?.toFixed(1) || 0}%
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Avg: {formatCurrency(analytics?.stats.averageQuotationValue)}
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quotation Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-600 font-medium uppercase">Total Quotations</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{analytics?.stats.totalQuotations || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-green-600 font-medium uppercase">Paid</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{analytics?.stats.paidQuotations || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-blue-600 font-medium uppercase">Accepted</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{analytics?.stats.acceptedQuotations || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-yellow-600 font-medium uppercase">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{analytics?.stats.pendingQuotations || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-600 font-medium uppercase">Draft</p>
          <p className="text-2xl font-bold text-gray-600 mt-1">{analytics?.stats.draftQuotations || 0}</p>
        </div>
      </div>

      {/* Charts and Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h2>
          <div className="space-y-3">
            {analytics?.monthlyRevenue.map((month, index) => {
              const maxRevenue = Math.max(...analytics.monthlyRevenue.map(m => m.revenue), 1);
              const percentage = (month.revenue / maxRevenue) * 100;
              
              return (
                <div key={index}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 font-medium">{month.month}</span>
                    <span className="text-gray-900 font-semibold">
                      {formatCurrency(month.revenue)} ({month.quotationCount})
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Role Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Role Distribution</h2>
          <div className="space-y-3">
            {analytics?.roleDistribution.map((role, index) => {
              const colors = {
                'Super Admin': 'from-purple-500 to-pink-500',
                'Admin': 'from-blue-500 to-indigo-500',
                'Customer': 'from-green-500 to-emerald-500',
                'Sales Person': 'from-yellow-500 to-orange-500',
              };
              const gradient = colors[role.role] || 'from-gray-500 to-gray-600';
              
              return (
                <div key={index}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 font-medium">{role.role}</span>
                    <span className="text-gray-900 font-semibold">
                      {role.count} ({role.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`bg-gradient-to-r ${gradient} h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${role.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quotation Status Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quotation Status Breakdown</h2>
          <div className="space-y-2">
            {analytics?.quotationStatusBreakdown.map((status, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(status.status)}`}>
                    {status.status}
                  </span>
                  <span className="text-sm text-gray-600">{status.count} quotations</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(status.totalValue)}</p>
                  <p className="text-xs text-gray-500">{status.percentage.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Users</h2>
          <div className="space-y-3">
            {analytics?.recentUsers.map((recentUser) => (
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Quotations */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Quotations</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Quotation #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analytics?.recentQuotations.map((quotation) => (
                <tr key={quotation.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{quotation.quotationNo}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{quotation.businessName}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {formatCurrency(quotation.totalAmount)}
                  </td>
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
        </div>
      </div>

      {/* Company-wise Revenue Analysis */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">💰</span>
            Company Revenue Analysis
          </h2>
        </div>
        
        {analytics?.companyRevenues && analytics.companyRevenues.length > 0 ? (
          <div className="space-y-4">
            {analytics.companyRevenues.map((company, index) => {
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

      {/* Subscription Analytics */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">🔄</span>
            Active Subscriptions Analytics
          </h2>
        </div>

        {analytics?.subscriptionAnalytics && analytics.subscriptionAnalytics.length > 0 ? (
          <div className="space-y-6">
            {analytics.subscriptionAnalytics.map((sub) => (
              <div key={sub.companyId} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{sub.companyName}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {sub.activeSubscriptions} Active Subscription{sub.activeSubscriptions !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(sub.totalSubscriptionRevenue)}
                    </p>
                    <p className="text-xs text-gray-500">Total Revenue</p>
                  </div>
                </div>

                {/* Recurring Revenue Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <p className="text-xs text-indigo-600 font-medium">Monthly Recurring</p>
                    <p className="text-lg font-bold text-indigo-900">
                      {formatCurrency(sub.monthlyRecurring)}/mo
                    </p>
                  </div>
                  <div className="bg-violet-50 p-3 rounded-lg">
                    <p className="text-xs text-violet-600 font-medium">Yearly Recurring</p>
                    <p className="text-lg font-bold text-violet-900">
                      {formatCurrency(sub.yearlyRecurring)}/yr
                    </p>
                  </div>
                </div>

                {/* Subscriptions by Product */}
                {sub.subscriptionsByProduct && sub.subscriptionsByProduct.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Subscriptions by Product</h4>
                    <div className="space-y-2">
                      {sub.subscriptionsByProduct.map((product) => (
                        <div key={product.productId} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            <span className="text-sm font-medium text-gray-900">{product.productName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                              {product.count} sub{product.count !== 1 ? 's' : ''}
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

                {/* Recent Subscriptions */}
                {sub.recentSubscriptions && sub.recentSubscriptions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Subscriptions</h4>
                    <div className="space-y-2">
                      {sub.recentSubscriptions.map((recent, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 p-3 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono font-semibold text-purple-600">
                                {recent.quotationNo}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                {recent.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 font-medium">{recent.productName}</p>
                            <p className="text-xs text-gray-600">{recent.clientName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">
                              {formatCurrency(recent.amount)}
                            </p>
                            <p className="text-xs text-gray-500">{recent.billingType}</p>
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
          <div className="text-center py-8">
            <p className="text-gray-500">No active subscriptions yet</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

