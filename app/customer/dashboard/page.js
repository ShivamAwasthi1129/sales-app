'use client';

import { useAuth } from '../../../contexts/AuthContext';
import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import Link from 'next/link';

const GET_CUSTOMER_QUOTATIONS = gql`
  query GetQuotations {
    getQuotations {
      id
      quotationNo
      status
      totalAmount
      currency
      createdAt
      to {
        businessName
        email
      }
      payment {
        paymentLink
        paymentStatus
        paymentMethod
        paidAt
      }
    }
  }
`;

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-purple-100 text-purple-800',
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { data, loading } = useQuery(GET_CUSTOMER_QUOTATIONS, {
    fetchPolicy: 'cache-and-network',
  });

  const quotations = data?.getQuotations || [];
  
  // Filter out draft quotations for customer
  const visibleQuotations = quotations.filter(q => q.status !== 'draft');
  
  // Calculate stats from real data
  const totalQuotations = visibleQuotations.length;
  const acceptedQuotations = visibleQuotations.filter(q => q.status === 'accepted').length;
  const paidQuotations = visibleQuotations.filter(q => q.status === 'paid').length;
  const pendingQuotations = visibleQuotations.filter(q => q.status === 'sent').length;
  
  // Calculate total value of all quotations
  const totalValue = visibleQuotations.reduce((sum, q) => sum + (q.totalAmount || 0), 0);
  
  // Get recent quotations (last 5)
  const recentQuotations = [...visibleQuotations]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 border border-gray-200 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Welcome Back!</h1>
            <p className="text-gray-700 text-lg font-medium">{user?.name || user?.email}</p>
          </div>
          <div className="hidden md:block">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-4 shadow-lg">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Dynamic Data */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-2xl shadow-md border border-blue-100 hover:shadow-xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total Quotations</p>
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{totalQuotations}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-green-50 p-6 rounded-2xl shadow-md border border-green-100 hover:shadow-xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Accepted</p>
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{acceptedQuotations}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-purple-50 p-6 rounded-2xl shadow-md border border-purple-100 hover:shadow-xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Paid</p>
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{paidQuotations}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-orange-50 p-6 rounded-2xl shadow-md border border-orange-100 hover:shadow-xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Pending</p>
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">{pendingQuotations}</p>
        </div>
      </div>

      {/* Recent Quotations */}
      <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl shadow-lg border border-indigo-100 p-6 hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Recent Quotations</h2>
          <Link href="/customer/quotes" className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm hover:underline">
            View All →
          </Link>
        </div>
        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading quotations...</p>
        ) : recentQuotations.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No quotations available</p>
        ) : (
          <div className="space-y-4">
            {recentQuotations.map((quotation) => (
              <div key={quotation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-gray-900">{quotation.quotationNo}</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[quotation.status]}`}>
                      {quotation.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(quotation.createdAt)}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <p className="font-bold text-gray-900">{quotation.currency} {quotation.totalAmount?.toFixed(2) || '0.00'}</p>
                  {/* Show payment link button only for sent status and not yet paid */}
                  {quotation.status === 'sent' && quotation.payment?.paymentLink && quotation.payment?.paymentStatus !== 'paid' && (
                    <a 
                      href={quotation.payment.paymentLink} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Pay Now
                    </a>
                  )}
                  {quotation.payment?.paymentStatus === 'paid' && (
                    <span className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Paid
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-lg border border-purple-100 p-6 hover:shadow-xl transition-all">
        <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/customer/quotes" className="group p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-lg text-left transition-all block">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-blue-100 group-hover:bg-blue-200 rounded-lg transition-colors">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900">View Quotations</h3>
            </div>
            <p className="text-sm text-gray-600">Access all your quotations</p>
          </Link>
          
          <Link href="/customer/invoices" className="group p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:shadow-lg text-left transition-all block">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-green-100 group-hover:bg-green-200 rounded-lg transition-colors">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900">Invoices</h3>
            </div>
            <p className="text-sm text-gray-600">View billing documents</p>
          </Link>
          
          <Link href="/customer/settings" className="group p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:shadow-lg text-left transition-all block">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-purple-100 group-hover:bg-purple-200 rounded-lg transition-colors">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900">Settings</h3>
            </div>
            <p className="text-sm text-gray-600">Manage your profile</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
