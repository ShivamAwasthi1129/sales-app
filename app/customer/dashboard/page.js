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
    <div className="space-y-6 animate-fade-in-up">
      {/* Header - Clean Lightning Theme */}
      <div className="relative overflow-hidden glass-effect rounded-3xl p-10 border-2 border-white/40 shadow-2xl hover:shadow-3xl transition-all duration-500 card-3d">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 animate-gradient"></div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {/* Lightning Icon */}
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl hover-glow animate-pulse-ring relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent shimmer"></div>
                <svg className="w-10 h-10 text-white animate-lightning relative z-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-5xl font-black gradient-text">Welcome Back! 👋</h1>
                <p className="text-sm font-bold bg-gradient-to-r from-gray-600 to-gray-500 bg-clip-text text-transparent mt-1">⚡ Your Quotations Hub</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">{user?.name || user?.email}</p>
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-3xl p-5 shadow-2xl hover-glow group transition-transform duration-300 hover:scale-110 relative overflow-hidden">
              <svg className="w-full h-full text-white relative z-10 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Lightning Theme */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Quotations */}
        <div className="glass-effect p-6 rounded-3xl shadow-xl border-2 border-white/50 hover:shadow-2xl hover-glow transition-all duration-500 card-3d group relative overflow-hidden animate-fade-in-up" style={{animationDelay: '0.1s'}}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 opacity-50"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
          <div className="relative z-10 flex items-center justify-between mb-3">
            <p className="text-xs text-gray-700 font-black uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Total
            </p>
            <div className="p-3 bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-500 rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative overflow-hidden">
              <svg className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent relative z-10">{totalQuotations}</p>
        </div>

        {/* Accepted */}
        <div className="glass-effect p-6 rounded-3xl shadow-xl border-2 border-white/50 hover:shadow-2xl hover-glow transition-all duration-500 card-3d group relative overflow-hidden animate-fade-in-up" style={{animationDelay: '0.2s'}}>
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-50"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
          <div className="relative z-10 flex items-center justify-between mb-3">
            <p className="text-xs text-gray-700 font-black uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Accepted
            </p>
            <div className="p-3 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative overflow-hidden">
              <svg className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent relative z-10">{acceptedQuotations}</p>
        </div>

        {/* Paid */}
        <div className="glass-effect p-6 rounded-3xl shadow-xl border-2 border-white/50 hover:shadow-2xl hover-glow transition-all duration-500 card-3d group relative overflow-hidden animate-fade-in-up" style={{animationDelay: '0.3s'}}>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-50"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
          <div className="relative z-10 flex items-center justify-between mb-3">
            <p className="text-xs text-gray-700 font-black uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
              Paid
            </p>
            <div className="p-3 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative overflow-hidden">
              <svg className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent relative z-10">{paidQuotations}</p>
        </div>

        {/* Pending */}
        <div className="glass-effect p-6 rounded-3xl shadow-xl border-2 border-white/50 hover:shadow-2xl hover-glow transition-all duration-500 card-3d group relative overflow-hidden animate-fade-in-up" style={{animationDelay: '0.4s'}}>
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 opacity-50"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
          <div className="relative z-10 flex items-center justify-between mb-3">
            <p className="text-xs text-gray-700 font-black uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
              Pending
            </p>
            <div className="p-3 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative overflow-hidden">
              <svg className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent relative z-10">{pendingQuotations}</p>
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
