'use client';

import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { getCurrentUserFromToken } from '../../lib/auth';
import { useState, useEffect } from 'react';

const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    getCurrentUser {
      id
      name
      email
      role
      phone
      address
      status
      salesPersonId
      dateOfBirth
      photo
      about
      createdAt
      updatedAt
    }
  }
`;

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

export default function DashboardPage() {
  const { data: userData, loading: userLoading, error: userError } = useQuery(GET_CURRENT_USER, {
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });

  const currentUser = userData?.getCurrentUser;
  const isSalesPerson = currentUser?.role === 'Sales Person' || !!currentUser?.salesPersonId;

  const { data: analyticsData, loading: analyticsLoading, error: analyticsError } = useQuery(GET_SALESPERSON_ANALYTICS, {
    skip: !isSalesPerson,
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });

  const loading = userLoading || (isSalesPerson && analyticsLoading);
  const error = userError || (isSalesPerson && analyticsError);
  const analytics = analyticsData?.getSalesPersonAnalytics;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !error.message?.includes('Not a sales person') && !error.message?.includes('Not authenticated')) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        <p className="font-semibold">Error loading data</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl">
        <p>No data available. Please log in again.</p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {currentUser.name}!</p>
          {isSalesPerson && analytics && (
            <p className="text-sm text-indigo-600 font-medium mt-1">{analytics.companyName}</p>
          )}
        </div>
      </div>
      
      {isSalesPerson && analytics ? (
        // Sales Person Analytics Dashboard
        <div className="space-y-6">
          {/* Performance Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Quotations</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.stats.totalQuotations}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl p-3">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Won Quotations</p>
                  <p className="text-3xl font-bold text-green-600">{analytics.stats.wonQuotations}</p>
                </div>
                <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl p-3">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-indigo-600">₹{analytics.stats.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl p-3">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Conversion Rate</p>
                  <p className="text-3xl font-bold text-purple-600">{analytics.stats.conversionRate.toFixed(1)}%</p>
                </div>
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-3">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Won</span>
                <span className="text-lg font-bold text-green-600">{analytics.stats.wonQuotations}</span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${analytics.quotationStatusBreakdown.find(s => s.status === 'won')?.percentage || 0}%` }}></div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Lost</span>
                <span className="text-lg font-bold text-red-600">{analytics.stats.lostQuotations}</span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: `${analytics.quotationStatusBreakdown.find(s => s.status === 'lost')?.percentage || 0}%` }}></div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Pending</span>
                <span className="text-lg font-bold text-yellow-600">{analytics.stats.pendingQuotations}</span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${analytics.quotationStatusBreakdown.find(s => s.status === 'pending')?.percentage || 0}%` }}></div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Draft</span>
                <span className="text-lg font-bold text-gray-600">{analytics.stats.draftQuotations}</span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div className="bg-gray-500 h-2 rounded-full" style={{ width: `${analytics.quotationStatusBreakdown.find(s => s.status === 'draft')?.percentage || 0}%` }}></div>
              </div>
            </div>
          </div>

          {/* Monthly Performance Chart */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Performance (Last 6 Months)</h2>
            <div className="space-y-4">
              {analytics.monthlyRevenue.map((month, idx) => (
                <div key={idx} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{month.month}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-green-600 font-semibold">Won: {month.won}</span>
                      <span className="text-sm text-red-600 font-semibold">Lost: {month.lost}</span>
                      <span className="text-sm text-yellow-600 font-semibold">Pending: {month.pending}</span>
                      <span className="text-sm font-bold text-indigo-600">₹{month.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden flex">
                      {month.quotationCount > 0 && (
                        <>
                          <div className="bg-green-500 h-3" style={{ width: `${(month.won / month.quotationCount) * 100}%` }} title={`Won: ${month.won}`}></div>
                          <div className="bg-red-500 h-3" style={{ width: `${(month.lost / month.quotationCount) * 100}%` }} title={`Lost: ${month.lost}`}></div>
                          <div className="bg-yellow-500 h-3" style={{ width: `${(month.pending / month.quotationCount) * 100}%` }} title={`Pending: ${month.pending}`}></div>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-gray-600 whitespace-nowrap">{month.quotationCount} quotes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Quotations */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Recent Quotations</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quotation No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.recentQuotations.map((quote) => (
                    <tr key={quote.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{quote.quotationNo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{quote.clientName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-indigo-600">₹{quote.totalAmount.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          quote.status === 'paid' ? 'bg-green-100 text-green-800' :
                          quote.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                          quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          quote.status === 'sent' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {quote.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(quote.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {analytics.recentQuotations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No quotations yet. Start creating quotations to see them here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Regular User Dashboard
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Welcome</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentUser.name}
              </p>
            </div>
            <div className="bg-gradient-to-br from-indigo-100 to-blue-100 rounded-xl p-3">
              {isSalesPerson && currentUser.photo ? (
                <img
                  src={currentUser.photo}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">
                {isSalesPerson ? 'Sales Person ID' : 'Role'}
              </p>
              <p className={`text-2xl font-bold text-gray-900 ${isSalesPerson ? 'font-mono' : ''}`}>
                {isSalesPerson ? currentUser.salesPersonId : currentUser.role}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl p-3">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Status</p>
              <p className={`text-2xl font-bold ${currentUser.status === 'Active' ? 'text-green-600' : 'text-red-600'}`}>
                {currentUser.status}
              </p>
            </div>
            <div className={`rounded-xl p-3 ${currentUser.status === 'Active' ? 'bg-gradient-to-br from-green-100 to-emerald-100' : 'bg-gradient-to-br from-red-100 to-rose-100'}`}>
              <svg className={`w-8 h-8 ${currentUser.status === 'Active' ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            {isSalesPerson ? 'Sales Person Information' : 'User Information'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">Your account details and information</p>
        </div>
        <div className="p-6">
          {isSalesPerson ? (
            // Sales Person Information Display
            <div className="space-y-6">
              {/* Photo and Basic Info */}
              <div className="flex items-start space-x-6 pb-6 border-b border-gray-200">
                <div className="shrink-0">
                  {currentUser.photo ? (
                    <img
                      src={currentUser.photo}
                      alt={currentUser.name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-indigo-200 shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center border-4 border-indigo-200 shadow-md">
                      <span className="text-indigo-600 text-3xl font-bold">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{currentUser.name}</h3>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Sales Person ID:</span> {currentUser.salesPersonId}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Role:</span> {currentUser.role}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Status:</span>{' '}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        currentUser.status === 'Active'
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}>
                        {currentUser.status}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-50 rounded-lg p-2 mt-1">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Name</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">{currentUser.name}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="bg-indigo-50 rounded-lg p-2 mt-1">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">{currentUser.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="bg-purple-50 rounded-lg p-2 mt-1">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Sales Person ID</p>
                      <p className="text-base font-semibold text-gray-900 mt-1 font-mono">{currentUser.salesPersonId}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="bg-teal-50 rounded-lg p-2 mt-1">
                      <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Phone Number</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">{currentUser.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-pink-50 rounded-lg p-2 mt-1">
                      <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">
                        {formatDate(currentUser.dateOfBirth)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="bg-orange-50 rounded-lg p-2 mt-1">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Company Name</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">{currentUser.companyName || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="bg-green-50 rounded-lg p-2 mt-1">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Address</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">{currentUser.address || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="bg-cyan-50 rounded-lg p-2 mt-1">
                      <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Account Created</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">
                        {formatDate(currentUser.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* About Section */}
              {currentUser.about && (
                <div className="pt-6 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">About</p>
                  <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">{currentUser.about}</p>
                </div>
              )}
            </div>
          ) : (
            // Regular User Information Display
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-50 rounded-lg p-2 mt-1">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="text-base font-semibold text-gray-900 mt-1">{currentUser.name}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-indigo-50 rounded-lg p-2 mt-1">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-base font-semibold text-gray-900 mt-1">{currentUser.email}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-purple-50 rounded-lg p-2 mt-1">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Role</p>
                    <p className="text-base font-semibold text-gray-900 mt-1">{currentUser.role}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-green-50 rounded-lg p-2 mt-1">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className={`text-base font-semibold mt-1 ${currentUser.status === 'Active' ? 'text-green-600' : 'text-red-600'}`}>
                      {currentUser.status}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-teal-50 rounded-lg p-2 mt-1">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="text-base font-semibold text-gray-900 mt-1">{currentUser.phone || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-orange-50 rounded-lg p-2 mt-1">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Address</p>
                    <p className="text-base font-semibold text-gray-900 mt-1">{currentUser.address || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-pink-50 rounded-lg p-2 mt-1">
                    <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Account Created</p>
                    <p className="text-base font-semibold text-gray-900 mt-1">
                      {formatDate(currentUser.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-cyan-50 rounded-lg p-2 mt-1">
                    <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Last Updated</p>
                    <p className="text-base font-semibold text-gray-900 mt-1">
                      {formatDate(currentUser.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
