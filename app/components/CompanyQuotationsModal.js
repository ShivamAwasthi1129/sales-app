// components/CompanyQuotationsModal.js - not changed yet

'use client';

import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { useState } from 'react';

const GET_COMPANY_QUOTATIONS = gql`
  query GetQuotations {
    getQuotations {
      id
      quotationNo
      quotationDate
      to {
        businessName
        email
      }
      from {
        businessName
        salesPersonName
      }
      status
      totalAmount
      currency
      payment {
        paymentStatus
      }
      createdBy
      companyId
      createdAt
    }
  }
`;

export default function CompanyQuotationsModal({ isOpen, onClose, company }) {
  const [activeTab, setActiveTab] = useState('all');
  const { data, loading, error } = useQuery(GET_COMPANY_QUOTATIONS, {
    skip: !isOpen || !company,
    fetchPolicy: 'network-only',
  });

  if (!isOpen) return null;

  // Filter quotations for this specific company
  const allQuotations = (data?.getQuotations || []).filter(
    q => q.companyId === company?.id
  );

  // Calculate stats
  const totalQuotations = allQuotations.length;
  const wonQuotations = allQuotations.filter(q => q.payment?.paymentStatus === 'paid').length;
  const lostQuotations = allQuotations.filter(q => q.status === 'lost' || q.status === 'rejected').length;
  const pendingQuotations = allQuotations.filter(q =>
    q.status === 'sent' && q.payment?.paymentStatus !== 'paid'
  ).length;
  const draftQuotations = allQuotations.filter(q => q.status === 'draft').length;

  // Calculate total revenue
  const totalRevenue = allQuotations
    .filter(q => q.payment?.paymentStatus === 'paid')
    .reduce((sum, q) => sum + (q.totalAmount || 0), 0);

  // Calculate conversion rate
  const conversionRate = totalQuotations > 0
    ? ((wonQuotations / totalQuotations) * 100).toFixed(1)
    : '0.0';

  // Filter quotations based on active tab
  const getFilteredQuotations = () => {
    switch (activeTab) {
      case 'won':
        return allQuotations.filter(q => q.payment?.paymentStatus === 'paid');
      case 'lost':
        return allQuotations.filter(q => q.status === 'lost' || q.status === 'rejected');
      case 'pending':
        return allQuotations.filter(q => q.status === 'sent' && q.payment?.paymentStatus !== 'paid');
      case 'draft':
        return allQuotations.filter(q => q.status === 'draft');
      default:
        return allQuotations;
    }
  };

  const filteredQuotations = getFilteredQuotations();

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount || 0);
  };

  const getStatusColor = (quotation) => {
    if (quotation.payment?.paymentStatus === 'paid') {
      return 'bg-green-100 text-green-800 border-green-300';
    }
    switch (quotation.status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'lost':
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  const getStatusLabel = (quotation) => {
    if (quotation.payment?.paymentStatus === 'paid') return 'Won';
    switch (quotation.status) {
      case 'sent': return 'Pending';
      case 'draft': return 'Draft';
      case 'lost': return 'Lost';
      case 'rejected': return 'Rejected';
      default: return quotation.status;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30">
                <span className="text-2xl font-bold">
                  {company?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">{company?.name}</h2>
                <p className="text-blue-100 text-sm mt-1">
                  {company?.email}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Total Quotations */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Total</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{totalQuotations}</p>
                </div>
                <div className="bg-blue-100 rounded-lg p-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Won */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Won</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{wonQuotations}</p>
                </div>
                <div className="bg-green-100 rounded-lg p-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Lost */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Lost</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{lostQuotations}</p>
                </div>
                <div className="bg-red-100 rounded-lg p-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Pending */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Pending</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{pendingQuotations}</p>
                </div>
                <div className="bg-blue-100 rounded-lg p-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Revenue</p>
                  <p className="text-xl font-bold text-purple-600 mt-1">
                    {formatCurrency(totalRevenue)}
                  </p>
                </div>
                <div className="bg-purple-100 rounded-lg p-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Conversion Rate */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Conv. Rate</p>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">{conversionRate}%</p>
                </div>
                <div className="bg-indigo-100 rounded-lg p-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white">
          <div className="flex space-x-1 p-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              All ({totalQuotations})
            </button>
            <button
              onClick={() => setActiveTab('won')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'won'
                ? 'bg-green-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Won ({wonQuotations})
            </button>
            <button
              onClick={() => setActiveTab('lost')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'lost'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Lost ({lostQuotations})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'pending'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Pending ({pendingQuotations})
            </button>
            <button
              onClick={() => setActiveTab('draft')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'draft'
                ? 'bg-gray-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Draft ({draftQuotations})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              <p className="font-semibold">Error loading quotations</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No quotations</h3>
              <p className="mt-1 text-sm text-gray-500">No quotations found in this category.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuotations.map((quotation) => (
                <div
                  key={quotation.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-bold text-gray-900">
                          {quotation.quotationNo}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(quotation)}`}>
                          {getStatusLabel(quotation)}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Client:</span>{' '}
                          <span className="text-gray-900 font-medium">
                            {quotation.to?.businessName || quotation.to?.email || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Date:</span>{' '}
                          <span className="text-gray-900">{formatDate(quotation.quotationDate)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Amount:</span>{' '}
                          <span className="text-gray-900 font-bold">
                            {formatCurrency(quotation.totalAmount, quotation.currency)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">By:</span>{' '}
                          <span className="text-gray-900">
                            {quotation.from?.salesPersonName || quotation.from?.businessName || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {filteredQuotations.length} of {totalQuotations} total quotations
            </div>
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
