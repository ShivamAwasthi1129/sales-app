'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import ViewQuotationModal from './ViewQuotationModal';
import { getCurrentUserFromToken } from '../../lib/auth';
import { toast } from 'react-toastify';

const GET_QUOTATIONS = gql`
  query GetQuotations {
    getQuotations {
      id
      quotationNo
      quotationDate
      from {
        businessName
        salesPersonName
        salesPersonId
      }
      to {
        businessName
      }
      currency
      totalAmount
      status
      invoiceNo
      invoiceId
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
      createdAt
    }
  }
`;

const GET_QUOTATION_FOR_VIEW = gql`
  query GetQuotationForView($id: ID!) {
    getQuotation(id: $id) {
      id
      quotationNo
      quotationDate
      dueDate
      from {
        country
        businessName
        phone
        address
        email
        salesPersonName
        salesPersonId
      }
      to {
        country
        businessName
        phone
        address
        email
      }
      currency
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
        subscriptionDetails {
          billingType
          interval
          intervalCount
        }
        subscriptionPrice
        selectedOptions {
          attributeName
          optionLabel
          optionValue
          price
        }
      }
      subtotal
      totalTax
      couponCode
      couponDiscount
      totalAmount
      notes
      terms
      businessLogo
      status
      invoiceNo
      invoiceId
      payment {
        sessionId
        paymentStatus
        amount
        currency
        customerEmail
        paymentMode
        subscriptionId
        paidAt
      }
      createdAt
      updatedAt
    }
  }
`;

const DELETE_QUOTATION = gql`
  mutation DeleteQuotation($id: ID!) {
    deleteQuotation(id: $id) {
      success
      message
    }
  }
`;

const QuotationsList = forwardRef((props, ref) => {
  const { data, loading, error, refetch } = useQuery(GET_QUOTATIONS, {
    fetchPolicy: 'network-only',
  });
  const [deleteQuotation, { loading: deletingQuotation }] = useMutation(DELETE_QUOTATION);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSalesPerson, setSelectedSalesPerson] = useState('all');
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewQuotationId, setViewQuotationId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = getCurrentUserFromToken();
    setCurrentUser(user);
  }, []);

  // Expose refetch to parent
  useImperativeHandle(ref, () => ({
    refetch,
  }));

  // Fetch quotation for view
  const { data: viewQuotationData, loading: loadingViewQuotation, error: viewQuotationError } = useQuery(GET_QUOTATION_FOR_VIEW, {
    variables: { id: viewQuotationId },
    skip: !viewQuotationId,
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (viewQuotationData?.getQuotation) {
      setSelectedQuotation(viewQuotationData.getQuotation);
      setShowViewModal(true);
    }
  }, [viewQuotationData]);

  // Log errors for debugging
  useEffect(() => {
    if (viewQuotationError) {
      console.error('Error loading quotation for view:', viewQuotationError);
    }
  }, [viewQuotationError]);

  const handleView = (quotationId) => {
    setViewQuotationId(quotationId);
  };

  const handleEdit = (quotationId) => {
    // This will be handled by parent component
    if (props.onEdit) {
      props.onEdit(quotationId);
    }
  };

  const handleDelete = async (quotationId, quotationNo) => {
    if (!window.confirm(`Are you sure you want to delete quotation ${quotationNo}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { data } = await deleteQuotation({
        variables: { id: quotationId },
        refetchQueries: ['GetQuotations'],
      });

      if (data?.deleteQuotation?.success) {
        toast.success(`Quotation ${quotationNo} deleted successfully`);
        refetch();
      } else {
        toast.error('Failed to delete quotation');
      }
    } catch (error) {
      console.error('Error deleting quotation:', error);
      toast.error(error.message || 'Failed to delete quotation');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-orange-100 text-orange-800';
      case 'paid':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  let filteredQuotations = data?.getQuotations?.filter(quotation => 
    quotation.quotationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quotation.from.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quotation.to.businessName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  // Filter by sales person for Admin
  if (currentUser?.role === 'Admin' && selectedSalesPerson !== 'all') {
    filteredQuotations = filteredQuotations.filter(q => 
      q.from?.salesPersonName === selectedSalesPerson
    );
  }
  
  // Filter out draft quotations for customers
  if (currentUser?.role === 'Customer') {
    filteredQuotations = filteredQuotations.filter(q => q.status !== 'draft');
  }
  
  // Get unique sales persons for Admin filter
  const uniqueSalesPersons = currentUser?.role === 'Admin' 
    ? [...new Set(data?.getQuotations
        ?.map(q => q.from?.salesPersonName)
        .filter(name => name && name !== '')
      )]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error loading quotations: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Title and Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quotations</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage and track all your quotations
          </p>
        </div>
        {/* Only show Create button for Admin and Sales Person */}
        {currentUser && currentUser.role !== 'Customer' && props.onCreateNew && (
          <button
            onClick={props.onCreateNew}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Quotation
          </button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search quotations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        {/* Sales Person Filter - Only for Admin */}
        {currentUser?.role === 'Admin' && uniqueSalesPersons.length > 0 && (
          <div className="relative">
            <select
              value={selectedSalesPerson}
              onChange={(e) => setSelectedSalesPerson(e.target.value)}
              className="px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer"
            >
              <option value="all">All Sales Persons</option>
              {uniqueSalesPersons.sort().map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
        
        <button
          onClick={() => refetch()}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quotation No
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                From
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                To
              </th>
              {/* Sales Person Column - Only for Admin */}
              {currentUser?.role === 'Admin' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales Person
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredQuotations.length === 0 ? (
              <tr>
                <td colSpan={currentUser?.role === 'Admin' ? "8" : "7"} className="px-6 py-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-4 text-gray-500">No quotations found</p>
                </td>
              </tr>
            ) : (
              filteredQuotations.map((quotation) => (
                <tr key={quotation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-indigo-600">{quotation.quotationNo}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{quotation.from.businessName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{quotation.to.businessName}</div>
                  </td>
                  {/* Sales Person Column - Only for Admin */}
                  {currentUser?.role === 'Admin' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <svg className="h-4 w-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {quotation.from?.salesPersonName || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(quotation.quotationDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {quotation.currency} {quotation.totalAmount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quotation.status)}`}>
                      {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-3">
                      <button 
                        onClick={() => handleView(quotation.id)}
                        className="text-indigo-600 hover:text-indigo-900 transition-colors"
                        title="View quotation"
                      >
                        View
                      </button>
                      {/* Show Edit button with role-based restrictions */}
                      {(currentUser?.role === 'Admin' || currentUser?.role === 'Sales Person') && (
                        <button 
                          onClick={() => handleEdit(quotation.id)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Edit quotation"
                        >
                          Edit
                        </button>
                      )}
                      {/* Customers can only edit quotations with status "sent" and not paid */}
                      {(currentUser?.role === 'Customer' && quotation.status === 'sent' && quotation.payment?.paymentStatus !== 'paid') && (
                        <button 
                          onClick={() => handleEdit(quotation.id)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Edit quotation"
                        >
                          Edit
                        </button>
                      )}
                      {/* Show Payment Link button for customers - only for sent status and not yet paid */}
                      {(currentUser?.role === 'Customer' && quotation.status === 'sent' && quotation.payment?.paymentLink && quotation.payment?.paymentStatus !== 'paid') && (
                        <a 
                          href={quotation.payment.paymentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-900 transition-colors font-medium"
                          title="Pay now"
                        >
                          Pay Now
                        </a>
                      )}
                      {/* Show Invoice Download button for customers - only if invoice exists */}
                      {(currentUser?.role === 'Customer' && quotation.invoiceNo && quotation.payment?.paymentStatus === 'paid') && (
                        <button
                          onClick={() => {
                            toast.info('Invoice download will be available soon');
                          }}
                          className="text-purple-600 hover:text-purple-900 transition-colors font-medium flex items-center space-x-1"
                          title="Download Invoice"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Invoice</span>
                        </button>
                      )}
                      {/* Show Delete button for Admin and Sales Person */}
                      {(currentUser?.role === 'Admin' || currentUser?.role === 'Sales Person') && (
                        <button 
                          onClick={() => handleDelete(quotation.id, quotation.quotationNo)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete quotation"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Loading indicator for view */}
      {loadingViewQuotation && viewQuotationId && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading quotation details...</p>
          </div>
        </div>
      )}

      {/* Error message for view */}
      {viewQuotationError && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Quotation</h3>
            <p className="text-gray-600 mb-4">{viewQuotationError.message || 'Failed to load quotation details'}</p>
            <button
              onClick={() => {
                setViewQuotationId(null);
                setShowViewModal(false);
              }}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* View Quotation Modal */}
      {showViewModal && selectedQuotation && !loadingViewQuotation && (
        <ViewQuotationModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedQuotation(null);
            setViewQuotationId(null);
          }}
          quotation={selectedQuotation}
        />
      )}
    </div>
  );
});

QuotationsList.displayName = 'QuotationsList';

export default QuotationsList;

