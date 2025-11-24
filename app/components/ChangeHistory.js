'use client';

import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';

const GET_QUOTATION_CHANGES = gql`
  query GetQuotationChanges($quotationId: ID!) {
    getQuotationChanges(quotationId: $quotationId) {
      id
      version
      changedBy {
        id
        email
        name
      }
      changeType
      changes {
        field
        oldValue
        newValue
        changeType
      }
      lineItemChanges {
        itemId
        changeType
        oldItem {
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
        newItem {
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
      }
      summary
      createdAt
    }
  }
`;

export default function ChangeHistory({ quotationId }) {
  const { data, loading, error } = useQuery(GET_QUOTATION_CHANGES, {
    variables: { quotationId },
    skip: !quotationId,
    fetchPolicy: 'network-only',
  });

  if (!quotationId) return null;

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">Loading change history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700 text-sm">Error loading change history: {error.message}</p>
      </div>
    );
  }

  const changes = data?.getQuotationChanges || [];

  if (changes.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No change history available for this quotation.</p>
      </div>
    );
  }

  const getChangeTypeColor = (changeType) => {
    switch (changeType) {
      case 'added':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'updated':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'deleted':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Change History</h3>
      <div className="space-y-4">
        {changes.map((change, index) => (
          <div key={change.id || index} className="border border-gray-200 rounded-lg p-4 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getChangeTypeColor(change.changeType)}`}>
                    Version {change.version}
                  </span>
                  <span className="text-sm text-gray-600">
                    {change.changeType === 'created' ? 'Created' : 'Updated'}
                  </span>
                </div>
                {change.summary && (
                  <p className="text-sm text-gray-600 mt-1">{change.summary}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{formatDate(change.createdAt)}</p>
                {change.changedBy && (
                  <p className="text-xs text-gray-500 mt-1">
                    by {change.changedBy.email || change.changedBy.name || 'Unknown'}
                  </p>
                )}
              </div>
            </div>

            {/* Line Item Changes - Only show line item changes */}
            {change.lineItemChanges && change.lineItemChanges.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Table Item Changes</h4>
                <div className="space-y-4">
                  {change.lineItemChanges.map((itemChange, idx) => {
                    const oldItem = itemChange.oldItem;
                    const newItem = itemChange.newItem;
                    
                    return (
                      <div key={idx} className="border rounded-lg p-4 bg-white">
                        <div className="flex items-center space-x-2 mb-3">
                          <span className={`px-3 py-1 rounded text-sm font-medium ${getChangeTypeColor(itemChange.changeType)}`}>
                            {itemChange.changeType.toUpperCase()}
                          </span>
                          <span className="text-sm font-semibold text-gray-700">
                            {oldItem?.itemName || newItem?.itemName || 'Item'}
                          </span>
                        </div>

                        {itemChange.changeType === 'deleted' && oldItem && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-red-50">
                                <tr>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Item Name</th>
                                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Quantity</th>
                                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Rate</th>
                                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Amount</th>
                                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center space-x-2">
                                      {oldItem.imageUrl && (
                                        <img src={oldItem.imageUrl} alt={oldItem.itemName} className="w-8 h-8 object-cover rounded" />
                                      )}
                                      <div>
                                        <div className="font-medium">{oldItem.itemName}</div>
                                        {oldItem.description && (
                                          <div className="text-xs text-gray-500">{oldItem.description}</div>
                                        )}
                                        {oldItem.isSubscription && (
                                          <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                                            Subscription
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-center">{oldItem.quantity}</td>
                                  <td className="px-3 py-2 text-center">${oldItem.rate?.toFixed(2) || '0.00'}</td>
                                  <td className="px-3 py-2 text-center">${oldItem.amount?.toFixed(2) || '0.00'}</td>
                                  <td className="px-3 py-2 text-center font-semibold">${oldItem.total?.toFixed(2) || '0.00'}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        {itemChange.changeType === 'added' && newItem && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-green-50">
                                <tr>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Item Name</th>
                                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Quantity</th>
                                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Rate</th>
                                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Amount</th>
                                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center space-x-2">
                                      {newItem.imageUrl && (
                                        <img src={newItem.imageUrl} alt={newItem.itemName} className="w-8 h-8 object-cover rounded" />
                                      )}
                                      <div>
                                        <div className="font-medium">{newItem.itemName}</div>
                                        {newItem.description && (
                                          <div className="text-xs text-gray-500">{newItem.description}</div>
                                        )}
                                        {newItem.isSubscription && (
                                          <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                                            Subscription
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-center">{newItem.quantity}</td>
                                  <td className="px-3 py-2 text-center">${newItem.rate?.toFixed(2) || '0.00'}</td>
                                  <td className="px-3 py-2 text-center">${newItem.amount?.toFixed(2) || '0.00'}</td>
                                  <td className="px-3 py-2 text-center font-semibold">${newItem.total?.toFixed(2) || '0.00'}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        {itemChange.changeType === 'updated' && oldItem && newItem && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h5 className="text-xs font-semibold text-gray-600 mb-2">Before</h5>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-2 py-1 text-left text-xs font-semibold text-gray-700">Item</th>
                                      <th className="px-2 py-1 text-center text-xs font-semibold text-gray-700">Qty</th>
                                      <th className="px-2 py-1 text-center text-xs font-semibold text-gray-700">Rate</th>
                                      <th className="px-2 py-1 text-center text-xs font-semibold text-gray-700">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td className="px-2 py-1">
                                        <div className="flex items-center space-x-1">
                                          {oldItem.imageUrl && (
                                            <img src={oldItem.imageUrl} alt={oldItem.itemName} className="w-6 h-6 object-cover rounded" />
                                          )}
                                          <span className="text-xs">{oldItem.itemName}</span>
                                        </div>
                                      </td>
                                      <td className="px-2 py-1 text-center text-xs">{oldItem.quantity}</td>
                                      <td className="px-2 py-1 text-center text-xs">${oldItem.rate?.toFixed(2) || '0.00'}</td>
                                      <td className="px-2 py-1 text-center text-xs font-semibold">${oldItem.total?.toFixed(2) || '0.00'}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            <div>
                              <h5 className="text-xs font-semibold text-gray-600 mb-2">After</h5>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-2 py-1 text-left text-xs font-semibold text-gray-700">Item</th>
                                      <th className="px-2 py-1 text-center text-xs font-semibold text-gray-700">Qty</th>
                                      <th className="px-2 py-1 text-center text-xs font-semibold text-gray-700">Rate</th>
                                      <th className="px-2 py-1 text-center text-xs font-semibold text-gray-700">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td className="px-2 py-1">
                                        <div className="flex items-center space-x-1">
                                          {newItem.imageUrl && (
                                            <img src={newItem.imageUrl} alt={newItem.itemName} className="w-6 h-6 object-cover rounded" />
                                          )}
                                          <span className="text-xs">{newItem.itemName}</span>
                                        </div>
                                      </td>
                                      <td className="px-2 py-1 text-center text-xs">{newItem.quantity}</td>
                                      <td className="px-2 py-1 text-center text-xs">${newItem.rate?.toFixed(2) || '0.00'}</td>
                                      <td className="px-2 py-1 text-center text-xs font-semibold">${newItem.total?.toFixed(2) || '0.00'}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

