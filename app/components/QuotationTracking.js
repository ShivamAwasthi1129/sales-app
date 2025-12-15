'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { toast } from 'react-toastify';
import ViewQuotationModal from './ViewQuotationModal';

// Add fadeIn animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  if (!document.head.querySelector('style[data-quotation-tracking]')) {
    style.setAttribute('data-quotation-tracking', 'true');
    document.head.appendChild(style);
  }
}

const GET_QUOTATIONS_WITH_STATUS_HISTORY = gql`
  query GetQuotationsWithStatusHistory {
    getQuotationsWithStatusHistory {
      quotation {
        id
        quotationNo
        quotationDate
        dueDate
        status
        to {
          businessName
          email
          country
          phone
          address
        }
        from {
          businessName
          email
          phone
          address
          country
          salesPersonName
          salesPersonId
        }
        lineItems {
          id
          productId
          itemName
          description
          imageUrl
          quantity
          rate
          amount
          total
          isSubscription
          subscriptionPrice
          subscriptionDetails {
            billingType
            interval
            intervalCount
          }
          selectedOptions {
            attributeName
            optionLabel
            optionValue
            price
          }
        }
        subtotal
        totalTax
        totalAmount
        currency
        couponCode
        couponDiscount
        notes
        terms
        businessLogo
        payment {
          sessionId
          paymentStatus
          paymentLink
          paymentMethod
          amount
          currency
          customerEmail
          paymentMode
          subscriptionId
          paidAt
        }
        invoiceId
        invoiceNo
        createdBy
        clientId
        companyId
        createdAt
        updatedAt
      }
      statusHistory {
        id
        updateType
        changedByRole
        status
        changedBy {
          id
          name
          email
        }
        changedByEmail
        changedByName
        reason
        notes
        createdAt
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
  updated: 'bg-orange-100 text-orange-800',
};

const STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
  paid: 'Paid',
  updated: 'Updated',
};

// Status order for progress tracking
const STATUS_ORDER = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'paid'];

// Get all statuses that have been reached (based on status history)
const getReachedStatuses = (statusHistory, currentStatus) => {
  const reached = new Set();
  
  // Add all statuses from history
  statusHistory.forEach(history => {
    reached.add(history.status);
  });
  
  // Ensure current status is included
  if (currentStatus) {
    reached.add(currentStatus);
  }
  
  return reached;
};

// Format date helper function
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Amazon-style Timeline Progress Bar with Collapsible Feature
const StatusProgressBar = ({ quotation, statusHistory, isCollapsed, onToggle }) => {
  const currentStatus = quotation.status;
  
  // Sort status history by date (oldest first)
  const sortedHistory = [...statusHistory].sort((a, b) => 
    new Date(a.createdAt) - new Date(b.createdAt)
  );
  
  return (
    <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
      {/* Header with Current Status Badge and Collapse Toggle */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors"
        >
          <h4 className="text-base font-bold text-gray-900">Status Timeline</h4>
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${
              isCollapsed ? '' : 'rotate-180'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${STATUS_COLORS[currentStatus]}`}>
          {STATUS_LABELS[currentStatus] || currentStatus}
        </span>
      </div>
      
      {/* Collapsible Timeline Content */}
      {!isCollapsed && (
        <div 
          className="space-y-1 bg-white rounded-lg p-4"
          style={{
            animation: 'fadeIn 0.3s ease-in-out'
          }}
        >
          {sortedHistory.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No status history available</p>
          ) : (
            sortedHistory.map((history, index) => {
              const isLatest = index === sortedHistory.length - 1;
              const statusLabel = history.reason || STATUS_LABELS[history.status] || history.status;
              
              // Get icon color based on update type and status
              let iconBgColor = 'bg-gray-400';
              if (isLatest) {
                iconBgColor = 'bg-green-500';
              } else if (history.updateType === 'content_update') {
                iconBgColor = 'bg-orange-500';
              } else if (history.status === 'paid') {
                iconBgColor = 'bg-purple-500';
              } else if (history.status === 'accepted') {
                iconBgColor = 'bg-green-500';
              } else if (history.status === 'sent') {
                iconBgColor = 'bg-blue-500';
              } else if (history.status === 'rejected') {
                iconBgColor = 'bg-red-500';
              }
              
              return (
                <div key={history.id || index} className="flex items-start gap-4 py-2">
                  {/* Timeline Icon, Arrow and Line */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${iconBgColor} ${
                      isLatest ? 'ring-4 ring-green-100 animate-pulse' : ''
                    }`}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    
                    {/* Downward Arrow and Connecting Line */}
                    {index < sortedHistory.length - 1 && (
                      <div className="flex flex-col items-center">
                        {/* Connecting Line */}
                        <div className="w-1 h-4 bg-gray-300 my-1"></div>
                        
                        {/* Downward Arrow */}
                        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        
                        {/* Connecting Line */}
                        <div className="w-1 h-4 bg-gray-300 my-1"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Timeline Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-bold text-sm ${isLatest ? 'text-green-600' : 'text-gray-800'}`}>
                        {statusLabel}
                      </p>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(history.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      {history.changedByRole && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full font-medium">
                          {history.changedByRole}
                        </span>
                      )}
                      <span className="text-xs text-gray-600">
                        {history.changedByName || history.changedBy?.name || 'System'}
                      </span>
                    </div>
                    {history.notes && (
                      <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded border-l-2 border-blue-300">
                        {history.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default function QuotationTracking() {
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedTimelines, setCollapsedTimelines] = useState({});
  const [viewingQuotation, setViewingQuotation] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_QUOTATIONS_WITH_STATUS_HISTORY, {
    fetchPolicy: 'cache-and-network',
    onError: (err) => {
      toast.error(`Failed to load quotations: ${err.message}`);
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading quotation tracking data...</div>
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

  const quotations = data?.getQuotationsWithStatusHistory || [];

  // Filter quotations
  const filteredQuotations = quotations.filter(item => {
    const quotation = item.quotation;
    const matchesStatus = filterStatus === 'all' || quotation.status === filterStatus;
    const matchesSearch = !searchTerm || 
      quotation.quotationNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.to?.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.to?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Get status counts
  const statusCounts = quotations.reduce((acc, item) => {
    const status = item.quotation.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Quotation Tracking</h1>
            <p className="text-indigo-100 text-lg">Track status and history of all quotations</p>
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

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.keys(STATUS_LABELS).map(status => (
          <div
            key={status}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              filterStatus === status
                ? 'border-indigo-500 shadow-lg scale-105'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
          >
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2 ${STATUS_COLORS[status]}`}>
              {STATUS_LABELS[status]}
            </div>
            <p className="text-2xl font-bold text-gray-900">{statusCounts[status] || 0}</p>
            <p className="text-xs text-gray-500 mt-1">quotations</p>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by quotation number, client name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => {
              setFilterStatus('all');
              setSearchTerm('');
            }}
            className="px-4 py-2 text-black border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Quotations List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredQuotations.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-lg">No quotations found</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredQuotations.map((item) => {
              const quotation = item.quotation;
              const latestStatus = item.statusHistory[0];
              return (
                <div
                  key={quotation.id}
                  className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                    selectedQuotation?.id === quotation.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                  }`}
                  onClick={() => setSelectedQuotation(selectedQuotation?.id === quotation.id ? null : item)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{quotation.quotationNo}</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingQuotation(quotation);
                            setShowViewModal(true);
                          }}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Quotation
                        </button>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[quotation.status]}`}>
                          {STATUS_LABELS[quotation.status]}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Client:</span> {quotation.to?.businessName || 'N/A'}
                          <br />
                          <span className="text-xs text-gray-500">{quotation.to?.email || ''}</span>
                        </div>
                        <div>
                          <span className="font-medium">Sales Person:</span> {quotation.from?.salesPersonName || 'N/A'}
                          <br />
                          <span className="text-xs text-gray-500">{quotation.from?.salesPersonId || ''}</span>
                        </div>
                        <div>
                          <span className="font-medium">Amount:</span> {quotation.currency} {quotation.totalAmount?.toFixed(2) || '0.00'}
                          <br />
                          <span className="text-xs text-gray-500">Created: {formatDate(quotation.createdAt)}</span>
                        </div>
                      </div>
                      {/* Status Progress Bar with Collapse */}
                      <StatusProgressBar 
                        quotation={quotation} 
                        statusHistory={item.statusHistory}
                        isCollapsed={collapsedTimelines[quotation.id] || false}
                        onToggle={() => {
                          setCollapsedTimelines(prev => ({
                            ...prev,
                            [quotation.id]: !prev[quotation.id]
                          }));
                        }}
                      />
                      
                      {latestStatus && (
                        <div className="mt-3 text-xs text-gray-500">
                          <span className="font-medium">Last Update:</span> {formatDate(latestStatus.createdAt)} 
                          {latestStatus.updateType === 'content_update' && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Content Updated</span>
                          )}
                          {latestStatus.updateType === 'status_change' && (
                            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded">Status Changed</span>
                          )}
                          <span className="ml-2">by {latestStatus.changedByName || latestStatus.changedBy?.name || 'System'}</span>
                          {latestStatus.changedByRole && (
                            <span className="ml-1 text-gray-400">({latestStatus.changedByRole})</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          selectedQuotation?.id === quotation.id ? 'transform rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Status History */}
                  {selectedQuotation?.id === quotation.id && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-4">Status History</h4>
                      {item.statusHistory.length === 0 ? (
                        <p className="text-sm text-gray-500">No status history available</p>
                      ) : (
                        <div className="space-y-4">
                          {item.statusHistory.map((history, index) => (
                            <div key={history.id} className="flex items-start gap-4">
                              <div className="flex-shrink-0">
                                <div className={`w-3 h-3 rounded-full mt-1.5 ${STATUS_COLORS[history.status]}`}></div>
                                {index < item.statusHistory.length - 1 && (
                                  <div className="w-0.5 h-8 bg-gray-200 ml-1.5"></div>
                                )}
                              </div>
                              <div className="flex-1 pb-4">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[history.status]}`}>
                                    {STATUS_LABELS[history.status]}
                                  </span>
                                  {history.updateType === 'content_update' && (
                                    <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                                      Content Updated
                                    </span>
                                  )}
                                  {history.updateType === 'status_change' && (
                                    <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">
                                      Status Changed
                                    </span>
                                  )}
                                  {history.updateType === 'payment_update' && (
                                    <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-700">
                                      Payment Updated
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500">{formatDate(history.createdAt)}</span>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3 mt-2">
                                  <p className="text-sm text-gray-700 font-semibold mb-1">
                                    Updated by: {history.changedByName || history.changedBy?.name || 'System'}
                                    {history.changedByRole && (
                                      <span className="ml-2 text-xs font-normal text-gray-500">({history.changedByRole})</span>
                                    )}
                                  </p>
                                  {history.changedByEmail && (
                                    <p className="text-xs text-gray-500 mb-2">{history.changedByEmail}</p>
                                  )}
                                  {history.reason && (
                                    <p className="text-sm text-gray-700 mt-2 font-medium">{history.reason}</p>
                                  )}
                                  {history.notes && (
                                    <p className="text-xs text-gray-600 mt-2 bg-white p-2 rounded border border-gray-200">
                                      <span className="font-semibold">Details:</span> {history.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* View Quotation Modal */}
      {showViewModal && viewingQuotation && (
        <ViewQuotationModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setViewingQuotation(null);
          }}
          quotation={viewingQuotation}
        />
      )}
    </div>
  );
}

