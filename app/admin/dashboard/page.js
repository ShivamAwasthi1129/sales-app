'use client';

import { useAuth } from '../../../contexts/AuthContext';
import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import Link from 'next/link';

const GET_COMPANY_ANALYTICS = gql`
  query GetCompanyAnalytics {
    getCompanyAnalytics {
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
  const { data, loading, error } = useQuery(GET_COMPANY_ANALYTICS, {
    fetchPolicy: 'network-only',
  });

  const analytics = data?.getCompanyAnalytics;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Error Loading Analytics</h3>
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

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
      paid: 'bg-green-100 text-green-800',
      accepted: 'bg-blue-100 text-blue-800',
      sent: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-yellow-100 text-yellow-800',
      draft: 'bg-gray-100 text-gray-800',
      rejected: 'bg-red-100 text-red-800',
      won: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back, {user?.name || user?.email} | {analytics?.companyName}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow-sm border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Won Quotations</p>
              <p className="text-3xl font-bold text-green-900 mt-1">
                {analytics?.stats.wonQuotations || 0}
              </p>
              <p className="text-xs text-green-600 mt-2">
                {analytics?.stats.paidQuotations || 0} paid
              </p>
            </div>
            <div className="p-3 bg-green-500 rounded-full">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg shadow-sm border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 font-medium">Lost Quotations</p>
              <p className="text-3xl font-bold text-red-900 mt-1">
                {analytics?.stats.lostQuotations || 0}
              </p>
              <p className="text-xs text-red-600 mt-2">
                Rejected by clients
              </p>
            </div>
            <div className="p-3 bg-red-500 rounded-full">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-lg shadow-sm border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-700 font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-indigo-900 mt-1">
                {formatCurrency(analytics?.stats.totalRevenue)}
              </p>
              <p className="text-xs text-indigo-600 mt-2">
                From paid quotations
              </p>
            </div>
            <div className="p-3 bg-indigo-500 rounded-full">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg shadow-sm border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium">Conversion Rate</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">
                {analytics?.stats.conversionRate?.toFixed(1) || 0}%
              </p>
              <p className="text-xs text-purple-600 mt-2">
                {analytics?.stats.totalQuotations || 0} total quotes
              </p>
            </div>
            <div className="p-3 bg-purple-500 rounded-full">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Revenue Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Performance</h2>
          <div className="space-y-3">
            {analytics?.monthlyRevenue?.map((month, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{month.month}</span>
                  <span className="text-gray-900 font-semibold">{formatCurrency(month.revenue)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((month.revenue / (analytics?.stats.totalRevenue || 1)) * 100 * 6, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 min-w-[80px]">
                    {month.quotationCount} quotes
                  </span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="text-green-600">✓ {month.won} won</span>
                  <span className="text-red-600">✗ {month.lost} lost</span>
                  <span className="text-yellow-600">⏳ {month.pending} pending</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quotation Status Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quotation Status</h2>
          <div className="space-y-4">
            {analytics?.quotationStatusBreakdown?.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 capitalize">{item.status}</span>
                  <span className="text-sm text-gray-600">
                    {item.count} ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      item.status === 'won' ? 'bg-green-500' :
                      item.status === 'lost' ? 'bg-red-500' :
                      item.status === 'pending' ? 'bg-yellow-500' :
                      'bg-gray-400'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Salespeople and Recent Quotations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Salespeople */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Top Salespeople
          </h2>
          {analytics?.topSalespeople?.length > 0 ? (
            <div className="space-y-3">
              {analytics.topSalespeople.map((sp, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-600' :
                      'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{sp.name}</p>
                      <p className="text-xs text-gray-500">{sp.salesPersonId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(sp.revenue)}</p>
                    <p className="text-xs text-gray-500">{sp.wonCount} won / {sp.quotationCount} quotes</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No sales data available yet</p>
          )}
        </div>

        {/* Recent Quotations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Quotations</h2>
          {analytics?.recentQuotations?.length > 0 ? (
            <div className="space-y-3">
              {analytics.recentQuotations.map((quote) => (
                <div key={quote.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{quote.quotationNo}</p>
                      <p className="text-sm text-gray-600">{quote.clientName}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                      {quote.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">{quote.salesPerson}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(quote.totalAmount)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(quote.createdAt)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No quotations yet</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/catalogue" className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors block">
            <h3 className="font-medium text-gray-900">Product Catalogue</h3>
            <p className="text-sm text-gray-600 mt-1">Manage your products</p>
          </Link>
          <Link href="/admin/quotes" className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors block">
            <h3 className="font-medium text-gray-900">New Quotation</h3>
            <p className="text-sm text-gray-600 mt-1">Create a new quote</p>
          </Link>
          <Link href="/admin/offers" className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors block">
            <h3 className="font-medium text-gray-900">Manage Coupons</h3>
            <p className="text-sm text-gray-600 mt-1">Edit discount codes</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

