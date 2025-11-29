'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { toast } from 'react-toastify';
import ProductSelectorModal from './ProductSelectorModal';
import { getCurrentUserFromToken } from '../../lib/auth';

const CREATE_QUOTATION = gql`
  mutation CreateQuotation($input: QuotationInput!, $sendEmail: Boolean) {
    createQuotation(input: $input, sendEmail: $sendEmail) {
      id
      quotationNo
      quotationDate
      status
    }
  }
`;

const UPDATE_QUOTATION = gql`
  mutation UpdateQuotation($id: ID!, $input: QuotationInput!) {
    updateQuotation(id: $id, input: $input) {
      id
      quotationNo
      quotationDate
      status
    }
  }
`;

const GET_QUOTATION = gql`
  query GetQuotation($id: ID!) {
    getQuotation(id: $id) {
      id
      quotationNo
      quotationDate
      to {
        businessName
        email
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
      totalAmount
      notes
      terms
      status
    }
  }
`;

const GET_PRODUCTS = gql`
  query GetProducts {
    getProducts {
      id
      name
      description
      imageUrl
      discount
      billingMode
      status
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
        uiType
        isMandatory
        options {
          id
          label
          value
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
    }
  }
`;

const QuotationFormSimplified = forwardRef(({ onQuotationCreated, onCancel }, ref) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState(null);
  
  const [formData, setFormData] = useState({
    to: {
      businessName: '',
      email: '',
    },
    lineItems: [],
    notes: 'Thank you for your interest in our products/services.\n\nPlease review the quotation carefully and contact us if you have any questions.\n\nWe look forward to working with you.',
    terms: '• Payment terms: Net 30 days from invoice date\n• All prices are subject to change without prior notice\n• Delivery time: As per agreed schedule\n• Warranty: Standard warranty applies as per product specifications',
    currency: 'USD',
  });

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingLineItemIndex, setEditingLineItemIndex] = useState(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const [createQuotation, { loading: creatingQuotation }] = useMutation(CREATE_QUOTATION);
  const [updateQuotation, { loading: updatingQuotation }] = useMutation(UPDATE_QUOTATION);
  const [getQuotation, { data: quotationData, loading: loadingQuotation }] = useLazyQuery(GET_QUOTATION, {
    fetchPolicy: 'network-only',
  });
  const { data: productsData } = useQuery(GET_PRODUCTS, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    const user = getCurrentUserFromToken();
    setCurrentUser(user);
  }, []);

  // Load quotation for editing
  useEffect(() => {
    if (quotationData?.getQuotation && isEditMode && editingQuotationId) {
      const quotation = quotationData.getQuotation;
      setFormData({
        to: {
          businessName: quotation.to?.businessName || '',
          email: quotation.to?.email || '',
        },
        lineItems: quotation.lineItems || [],
        notes: quotation.notes || formData.notes,
        terms: quotation.terms || formData.terms,
        currency: quotation.currency || 'USD',
      });
    }
  }, [quotationData, isEditMode, editingQuotationId]);

  // Expose method to load quotation for editing (called from parent)
  useImperativeHandle(ref, () => ({
    loadQuotationForEdit: (quotationId) => {
      console.log('[QuotationFormSimplified] Loading quotation for edit:', quotationId);
      setIsEditMode(true);
      setEditingQuotationId(quotationId);
      getQuotation({ variables: { id: quotationId } });
    },
  }));

  const handleSubmit = async (sendEmailFlag = true) => {
    try {
      console.log('[QuotationFormSimplified] handleSubmit called with sendEmailFlag:', sendEmailFlag);
      
      // Validation
      if (!formData.to.businessName?.trim()) {
        toast.error('Client name is required');
        return;
      }
      if (!formData.to.email?.trim()) {
        toast.error('Client email is required');
        return;
      }
      if (!formData.to.email.includes('@')) {
        toast.error('Valid email is required');
        return;
      }
      if (formData.lineItems.length === 0) {
        toast.error('Please add at least one product');
        return;
      }

      // Calculate totals
      const subtotal = formData.lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
      const totalAmount = subtotal;

      const quotationInput = {
        to: {
          businessName: formData.to.businessName.trim(),
          email: formData.to.email.trim().toLowerCase(),
          country: 'United States of America (USA)',
          phone: '',
          address: '',
        },
        from: {
          country: 'United States of America (USA)',
          businessName: '',
          phone: '',
          address: '',
          email: '',
        },
        lineItems: formData.lineItems.map(item => ({
          id: item.id,
          productId: item.productId || null,
          itemName: item.itemName,
          description: item.description || '',
          imageUrl: item.imageUrl || '',
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          total: item.total,
          isSubscription: item.isSubscription || false,
          subscriptionDetails: item.subscriptionDetails || null,
          subscriptionPrice: item.subscriptionPrice || null,
          selectedOptions: item.selectedOptions || [],
        })),
        currency: formData.currency || 'USD',
        subtotal: subtotal,
        totalTax: 0,
        couponCode: '',
        couponDiscount: 0,
        totalAmount: totalAmount,
        notes: formData.notes || '',
        terms: formData.terms || '',
        businessLogo: '',
      };

      if (sendEmailFlag) {
        setIsSavingDraft(false);
      } else {
        setIsSavingDraft(true);
      }

      if (isEditMode && editingQuotationId) {
        // Update existing quotation
        const { data } = await updateQuotation({
          variables: {
            id: editingQuotationId,
            input: quotationInput,
          },
        });

        if (data?.updateQuotation) {
          toast.success(`Quotation ${data.updateQuotation.quotationNo} updated successfully!`);
          onQuotationCreated?.();
        }
      } else {
        // Create new quotation
        console.log('[QuotationFormSimplified] Creating quotation with sendEmail:', sendEmailFlag);
        console.log('[QuotationFormSimplified] Quotation input:', JSON.stringify(quotationInput, null, 2));
        
        const { data, errors } = await createQuotation({
          variables: {
            input: quotationInput,
            sendEmail: sendEmailFlag,
          },
        });

        console.log('[QuotationFormSimplified] Response data:', data);
        console.log('[QuotationFormSimplified] Response errors:', errors);

        if (errors && errors.length > 0) {
          console.error('[QuotationFormSimplified] GraphQL Errors:', errors);
          throw new Error(errors[0].message);
        }

        if (data?.createQuotation) {
          console.log('[QuotationFormSimplified] Quotation created successfully:', data.createQuotation);
          
          if (sendEmailFlag) {
            toast.success(`Quotation ${data.createQuotation.quotationNo} created and email sent to customer!`);
          } else {
            toast.success(`Quotation ${data.createQuotation.quotationNo} saved as draft!`);
          }
          // Reset form
          setFormData({
            to: { businessName: '', email: '' },
            lineItems: [],
            notes: formData.notes,
            terms: formData.terms,
            currency: 'USD',
          });
          onQuotationCreated?.();
        } else {
          console.error('[QuotationFormSimplified] No data returned from mutation');
          toast.error('Failed to create quotation - no data returned');
        }
      }
    } catch (error) {
      console.error('[QuotationFormSimplified] Error with quotation:', error);
      console.error('[QuotationFormSimplified] Error details:', {
        message: error.message,
        graphQLErrors: error.graphQLErrors,
        networkError: error.networkError,
        stack: error.stack
      });
      
      // More specific error message
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        toast.error(`Error: ${error.graphQLErrors[0].message}`);
      } else if (error.networkError) {
        toast.error('Network error - please check your connection');
      } else {
        toast.error(error.message || 'Failed to process quotation');
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleAddProduct = (product, selectedOptions = []) => {
    console.log('[QuotationFormSimplified] Adding/Updating product:', product);
    console.log('[QuotationFormSimplified] Selected options:', selectedOptions);
    console.log('[QuotationFormSimplified] Editing index:', editingLineItemIndex);
    
    // Calculate base price
    let baseAmount = 0;
    if (product.basePrice?.amount) {
      baseAmount = product.basePrice.amount / 100; // Convert cents to dollars
    }

    // Calculate options price
    let optionsTotal = 0;
    if (Array.isArray(selectedOptions)) {
      selectedOptions.forEach(opt => {
        if (opt?.price?.amount) {
          optionsTotal += opt.price.amount / 100;
        }
      });
    }

    const rate = baseAmount + optionsTotal;
    const quantity = 1;
    const total = rate * quantity;

    const lineItem = {
      id: editingLineItemIndex !== null 
        ? formData.lineItems[editingLineItemIndex].id 
        : `temp_${Date.now()}_${Math.random()}`,
      productId: product.id,
      itemName: product.name,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
      quantity: quantity,
      rate: rate,
      amount: total,
      total: total,
      isSubscription: product.basePrice?.billingType === 'recurring',
      subscriptionDetails: product.basePrice?.billingType === 'recurring' ? {
        billingType: product.basePrice.billingType,
        interval: product.basePrice.interval,
        intervalCount: product.basePrice.intervalCount,
      } : null,
      subscriptionPrice: product.basePrice?.billingType === 'recurring' ? baseAmount : null,
      selectedOptions: Array.isArray(selectedOptions) ? selectedOptions.map(opt => ({
        attributeName: opt.attributeName || '',
        optionLabel: opt.label || '',
        optionValue: opt.value || '',
        price: opt.price?.amount ? opt.price.amount / 100 : 0,
      })) : [],
    };

    console.log('[QuotationFormSimplified] Line item:', lineItem);

    if (editingLineItemIndex !== null) {
      // Update existing item
      setFormData(prev => ({
        ...prev,
        lineItems: prev.lineItems.map((item, idx) => 
          idx === editingLineItemIndex ? lineItem : item
        ),
      }));
      toast.success('Product updated');
    } else {
      // Add new item
      setFormData(prev => ({
        ...prev,
        lineItems: [...prev.lineItems, lineItem],
      }));
      toast.success('Product added to quotation');
    }

    setShowProductModal(false);
    setEditingLineItemIndex(null);
  };

  const handleEditItem = (index) => {
    setEditingLineItemIndex(index);
    setShowProductModal(true);
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
    toast.info('Product removed');
  };

  const handleQuantityChange = (index, quantity) => {
    const qty = parseInt(quantity) || 1;
    setFormData(prev => {
      const newLineItems = [...prev.lineItems];
      newLineItems[index].quantity = qty;
      newLineItems[index].amount = newLineItems[index].rate * qty;
      newLineItems[index].total = newLineItems[index].amount;
      return { ...prev, lineItems: newLineItems };
    });
  };

  const subtotal = formData.lineItems.reduce((sum, item) => sum + (item.total || 0), 0);

  const isLoading = creatingQuotation || updatingQuotation || isSavingDraft;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Client Details */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Client Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.to.businessName}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  to: { ...prev.to, businessName: e.target.value }
                }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter client name"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.to.email}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  to: { ...prev.to, email: e.target.value }
                }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="client@example.com"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Customer will be auto-created if doesn't exist
              </p>
            </div>
          </div>
        </div>

        {/* Products */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Products & Services
            </h3>
            <button
              onClick={() => setShowProductModal(true)}
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Product
            </button>
          </div>

          {formData.lineItems.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-gray-500 mb-2">No products added yet</p>
              <p className="text-sm text-gray-400">Click "Add Product" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.lineItems.map((item, index) => (
                <div key={item.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.itemName} className="w-16 h-16 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.itemName}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-gray-600">${item.rate.toFixed(2)} per unit</span>
                      {item.isSubscription && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                          Subscription
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-32">
                    <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="w-32 text-right">
                    <p className="text-xs text-gray-600 mb-1">Total</p>
                    <p className="text-lg font-semibold text-gray-900">${item.total.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditItem(index)}
                      disabled={isLoading}
                      className="text-indigo-600 hover:text-indigo-800 p-2 disabled:opacity-50"
                      title="Edit product"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRemoveItem(index)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-800 p-2 disabled:opacity-50"
                      title="Remove product"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total */}
        {formData.lineItems.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between text-base">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-indigo-600">${subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes & Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes to Client
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Add any notes for the client..."
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Terms & Conditions
            </label>
            <textarea
              value={formData.terms}
              onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Add terms and conditions..."
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          {!isEditMode && (
            <button
              onClick={() => handleSubmit(false)}
              disabled={isLoading}
              className="px-6 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {isSavingDraft ? 'Saving...' : 'Save as Draft'}
            </button>
          )}
          <button
            onClick={() => handleSubmit(true)}
            disabled={isLoading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {isLoading && !isSavingDraft ? 'Processing...' : isEditMode ? 'Update Quotation' : 'Create & Send Email'}
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">📝 Auto-population & Customer Creation:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Quotation details (number, date) are auto-generated</li>
                <li>Your company information is auto-filled</li>
                <li>Customer account will be created automatically if they don't exist</li>
                <li>"Save as Draft" won't send email to customer</li>
                <li>"Create & Send Email" will notify customer via email</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Product Modal */}
      <ProductSelectorModal
        isOpen={showProductModal}
        products={productsData?.getProducts || []}
        onSelectProduct={handleAddProduct}
        onClose={() => {
          setShowProductModal(false);
          setEditingLineItemIndex(null);
        }}
        loading={false}
        editingProduct={editingLineItemIndex !== null ? formData.lineItems[editingLineItemIndex] : null}
      />
    </div>
  );
});

QuotationFormSimplified.displayName = 'QuotationFormSimplified';

export default QuotationFormSimplified;

