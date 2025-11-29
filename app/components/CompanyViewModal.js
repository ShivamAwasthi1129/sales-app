'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';

const GET_COMPANY_PRODUCTS = gql`
  query GetProducts {
    getProducts {
      id
      name
      description
      image
      imageUrl
      status
      tags
      billingMode
      discount
      companyId
      group {
        id
        name
      }
      basePrice {
        id
        amount
        currency
        billingType
        interval
        intervalCount
      }
      attributes {
        id
        name
        description
        uiType
        isMandatory
        options {
          id
          label
          value
          description
          price {
            id
            amount
            currency
            billingType
            interval
            intervalCount
          }
        }
      }
      creator {
        id
        name
        email
        role
        phone
        address
        status
        companyId
      }
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export default function CompanyViewModal({ isOpen, onClose, company }) {
  const [expandedProducts, setExpandedProducts] = useState({});
  const { data, loading, error } = useQuery(GET_COMPANY_PRODUCTS, {
    skip: !isOpen || !company,
  });

  // Filter products for this company
  const companyProducts = (data?.getProducts || []).filter((product) => {
    // Filter by product's companyId (most reliable)
    if (product.companyId) {
      return String(product.companyId) === String(company.id);
    }
    // Fallback: check if creator belongs to this company
    if (product.creator?.companyId) {
      return String(product.creator.companyId) === String(company.id);
    }
    // If no company association, don't show it
    return false;
  });

  // Group products by creator
  const productsByCreator = companyProducts.reduce((acc, product) => {
    const creatorId = product.creator?.id || product.createdBy || 'unknown';
    
    if (!acc[creatorId]) {
      acc[creatorId] = {
        creator: product.creator || {
          id: product.createdBy,
          name: 'Unknown Creator',
          email: 'N/A',
          role: 'Unknown',
        },
        products: [],
      };
    }
    acc[creatorId].products.push(product);
    return acc;
  }, {});

  const toggleProduct = (productId) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border border-green-300';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'archived':
        return 'bg-gray-100 text-gray-800 border border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };

  if (!isOpen || !company) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal panel */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl transform transition-all w-full max-w-6xl max-h-[90vh] overflow-hidden z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">{company.name} - Products</h3>
            <p className="text-indigo-100 text-sm mt-1">View all products and their creators</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/20 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 8rem)' }}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                <p className="font-semibold">Error loading products</p>
                <p className="text-sm mt-1">{error.message}</p>
              </div>
            ) : companyProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No products found</h3>
                <p className="mt-2 text-sm text-gray-500">This company doesn't have any products yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(productsByCreator).map(([creatorId, { creator, products }]) => (
                  <div key={creatorId} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Products List */}
                    <div className="divide-y divide-gray-200">
                      {products.map((product) => (
                        <div key={product.id} className="p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            {/* Product Image */}
                            {(product.image || product.imageUrl) && (
                              <div className="flex-shrink-0">
                                <img
                                  src={product.image || product.imageUrl}
                                  alt={product.name}
                                  className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-2">
                                <h5 className="text-lg font-semibold text-gray-900">{product.name}</h5>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(product.status)}`}>
                                  {product.status}
                                </span>
                                {product.group && (
                                  <span className="inline-flex px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">
                                    {product.group.name}
                                  </span>
                                )}
                              </div>
                              
                              {product.description && (
                                <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                              )}

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                {product.basePrice && (
                                  <div className="bg-blue-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-600 mb-1">Base Price</p>
                                    <p className="text-sm font-semibold text-blue-900">
                                      {product.basePrice.currency?.toUpperCase() || 'USD'} {product.basePrice.amount?.toFixed(2) || '0.00'}
                                    </p>
                                    <p className="text-xs text-gray-500">{product.basePrice.billingType}</p>
                                  </div>
                                )}
                                {product.billingMode && (
                                  <div className="bg-purple-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-600 mb-1">Billing Mode</p>
                                    <p className="text-sm font-semibold text-purple-900 capitalize">{product.billingMode}</p>
                                  </div>
                                )}
                                {product.discount && (
                                  <div className="bg-green-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-600 mb-1">Discount</p>
                                    <p className="text-sm font-semibold text-green-900">{product.discount}%</p>
                                  </div>
                                )}
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <p className="text-xs text-gray-600 mb-1">Created</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {new Date(product.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>

                              {product.tags && product.tags.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs text-gray-600 mb-1">Tags:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {product.tags.map((tag, idx) => (
                                      <span key={idx} className="inline-flex px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Attributes */}
                              {product.attributes && product.attributes.length > 0 && (
                                <div className="mt-4">
                                  <button
                                    onClick={() => toggleProduct(product.id)}
                                    className="flex items-center space-x-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                                  >
                                    <span>{expandedProducts[product.id] ? 'Hide' : 'Show'} Attributes ({product.attributes.length})</span>
                                    <svg
                                      className={`w-4 h-4 transition-transform ${expandedProducts[product.id] ? 'rotate-180' : ''}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  
                                  {expandedProducts[product.id] && (
                                    <div className="mt-3 space-y-3 pl-4 border-l-2 border-indigo-200">
                                      {product.attributes.map((attr) => (
                                        <div key={attr.id} className="bg-white p-4 rounded-lg border border-gray-200">
                                          <div className="flex items-center justify-between mb-2">
                                            <h6 className="font-semibold text-gray-900">{attr.name}</h6>
                                            <div className="flex items-center space-x-2">
                                              {attr.isMandatory && (
                                                <span className="text-xs text-red-600 font-medium">Required</span>
                                              )}
                                              <span className="text-xs text-gray-500 capitalize">{attr.uiType}</span>
                                            </div>
                                          </div>
                                          {attr.description && (
                                            <p className="text-xs text-gray-600 mb-2">{attr.description}</p>
                                          )}
                                          {attr.options && attr.options.length > 0 && (
                                            <div className="mt-2 space-y-2">
                                              <p className="text-xs font-medium text-gray-700">Options:</p>
                                              {attr.options.map((option) => (
                                                <div key={option.id} className="bg-gray-50 p-2 rounded border border-gray-200">
                                                  <div className="flex items-center justify-between">
                                                    <div>
                                                      <p className="text-sm font-medium text-gray-900">{option.label}</p>
                                                      {option.description && (
                                                        <p className="text-xs text-gray-600">{option.description}</p>
                                                      )}
                                                    </div>
                                                    {option.price && (
                                                      <div className="text-right">
                                                        <p className="text-sm font-semibold text-indigo-600">
                                                          {option.price.currency?.toUpperCase() || 'USD'} {option.price.amount?.toFixed(2) || '0.00'}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{option.price.billingType}</p>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

