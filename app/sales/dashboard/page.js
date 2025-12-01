'use client';

import { useAuth } from '../../../contexts/AuthContext';
import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import Link from 'next/link';

const GET_SALESPERSON_ANALYTICS = gql`
  query GetSalesPersonAnalytics {
    getSalesPersonAnalytics {
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
  const { data, loading, error } = useQuery(GET_SALESPERSON_ANALYTICS, {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Sales Dashboard</h1>
            <p className="text-blue-100 text-lg">Welcome back, {user?.name || analytics?.salesPersonName || 'Sales Person'}!</p>
            {analytics?.companyName && (
              <p className="text-blue-200 text-sm mt-1">{analytics.companyName}</p>
            )}
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

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg border-2 border-blue-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Quotations</p>
              <p className="text-4xl font-bold text-gray-900">{stats?.totalQuotations || 0}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl p-4">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg border-2 border-green-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Won Quotations</p>
              <p className="text-4xl font-bold text-green-600">{stats?.wonQuotations || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Accepted & Paid</p>
            </div>
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl p-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl shadow-lg border-2 border-yellow-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Pending</p>
              <p className="text-4xl font-bold text-yellow-600">{stats?.pendingQuotations || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting response</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl p-4">
              <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg border-2 border-purple-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-purple-600">{formatCurrency(stats?.totalRevenue || 0)}</p>
              <p className="text-xs text-gray-500 mt-1">From paid quotations</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-4">
              <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Conversion Rate</h3>
            <div className="bg-indigo-100 rounded-full p-2">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="text-center">
            <p className="text-5xl font-bold text-indigo-600 mb-2">{stats?.conversionRate?.toFixed(1) || 0}%</p>
            <p className="text-sm text-gray-500">Success rate</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Average Value</h3>
            <div className="bg-teal-100 rounded-full p-2">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-teal-600 mb-2">{formatCurrency(stats?.averageQuotationValue || 0)}</p>
            <p className="text-sm text-gray-500">Per quotation</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Draft Quotations</h3>
            <div className="bg-gray-100 rounded-full p-2">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
          <div className="text-center">
            <p className="text-5xl font-bold text-gray-600 mb-2">{stats?.draftQuotations || 0}</p>
            <p className="text-sm text-gray-500">In progress</p>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Status Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {analytics?.quotationStatusBreakdown?.map((statusItem) => {
            const statusColors = {
              'paid': 'bg-purple-100 text-purple-800 border-purple-200',
              'accepted': 'bg-green-100 text-green-800 border-green-200',
              'sent': 'bg-blue-100 text-blue-800 border-blue-200',
              'draft': 'bg-gray-100 text-gray-800 border-gray-200',
              'rejected': 'bg-red-100 text-red-800 border-red-200',
              'expired': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            };
            return (
              <div key={statusItem.status} className={`p-4 rounded-lg border-2 ${statusColors[statusItem.status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                <p className="text-sm font-medium mb-1 capitalize">{statusItem.status}</p>
                <p className="text-2xl font-bold">{statusItem.count}</p>
                <p className="text-xs mt-1 opacity-75">{statusItem.percentage.toFixed(1)}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Performance */}
      {analytics?.monthlyRevenue && analytics.monthlyRevenue.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Monthly Performance (Last 6 Months)</h2>
          <div className="space-y-4">
            {analytics.monthlyRevenue.map((month, idx) => (
              <div key={idx} className="border-b border-gray-200 pb-4 last:border-b-0">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">{month.month}</span>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-green-600 font-semibold">Won: {month.won}</span>
                    <span className="text-red-600 font-semibold">Lost: {month.lost}</span>
                    <span className="text-yellow-600 font-semibold">Pending: {month.pending}</span>
                    <span className="font-bold text-indigo-600">{formatCurrency(month.revenue)}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden flex">
                    {month.quotationCount > 0 && (
                      <>
                        <div className="bg-green-500 h-4" style={{ width: `${(month.won / month.quotationCount) * 100}%` }} title={`Won: ${month.won}`}></div>
                        <div className="bg-red-500 h-4" style={{ width: `${(month.lost / month.quotationCount) * 100}%` }} title={`Lost: ${month.lost}`}></div>
                        <div className="bg-yellow-500 h-4" style={{ width: `${(month.pending / month.quotationCount) * 100}%` }} title={`Pending: ${month.pending}`}></div>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 whitespace-nowrap">{month.quotationCount} quotes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Quotations */}
      {analytics?.recentQuotations && analytics.recentQuotations.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Quotations</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quotation #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.recentQuotations.slice(0, 10).map((quotation) => {
                  const statusColors = {
                    'paid': 'bg-purple-100 text-purple-800',
                    'accepted': 'bg-green-100 text-green-800',
                    'sent': 'bg-blue-100 text-blue-800',
                    'draft': 'bg-gray-100 text-gray-800',
                    'rejected': 'bg-red-100 text-red-800',
                    'expired': 'bg-yellow-100 text-yellow-800',
                  };
                  return (
                    <tr key={quotation.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{quotation.quotationNo}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{quotation.clientName || 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(quotation.totalAmount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[quotation.status] || 'bg-gray-100 text-gray-800'}`}>
                          {quotation.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(quotation.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/sales/quotes" className="group p-6 border-2 border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 text-left transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center space-x-3 mb-2">
              <div className="bg-indigo-100 group-hover:bg-indigo-200 rounded-lg p-2 transition-colors">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">My Quotations</h3>
            </div>
            <p className="text-sm text-gray-600">View and manage all your quotations</p>
          </Link>
          <Link href="/sales/analytics" className="group p-6 border-2 border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 text-left transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center space-x-3 mb-2">
              <div className="bg-purple-100 group-hover:bg-purple-200 rounded-lg p-2 transition-colors">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-purple-600">Analytics</h3>
            </div>
            <p className="text-sm text-gray-600">View detailed performance metrics</p>
          </Link>
          <Link href="/sales/tracking" className="group p-6 border-2 border-gray-300 rounded-xl hover:border-teal-500 hover:bg-teal-50 text-left transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center space-x-3 mb-2">
              <div className="bg-teal-100 group-hover:bg-teal-200 rounded-lg p-2 transition-colors">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-teal-600">Track Status</h3>
            </div>
            <p className="text-sm text-gray-600">Monitor quotation progress and history</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

