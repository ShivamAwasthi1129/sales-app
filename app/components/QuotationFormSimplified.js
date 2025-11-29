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

const GET_SALES_PERSONS = gql`
  query GetSalesPersons {
    getSalesPersons {
      id
      name
      email
      salesPersonId
      phone
      address
      companyId
      status
    }
  }
`;

const GET_CUSTOMERS = gql`
  query GetCustomers {
    getCustomers {
      id
      name
      email
      phone
      address
      status
    }
  }
`;

const GET_CURRENT_USER_SALESPERSON = gql`
  query GetCurrentUser {
    getCurrentUser {
      id
      name
      email
      role
      salesPersonId
      phone
      address
      status
      companyId
    }
  }
`;

const VALIDATE_COUPON = gql`
  query ValidateCoupon($code: String!, $subtotal: Float!, $productIds: [ID!], $groupIds: [ID!]) {
    validateCoupon(code: $code, subtotal: $subtotal, productIds: $productIds, groupIds: $groupIds) {
      valid
      error
      discount
      discountType
      discountValue
      coupon {
        id
        code
        name
        description
      }
    }
  }
`;

const GET_NOTES_AND_TERMS = gql`
  query GetNotesAndTerms($companyId: ID!) {
    getNotesAndTerms(companyId: $companyId) {
      id
      companyId
      notesToClient
      termsAndConditions
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
    couponCode: '',
    couponDiscount: 0,
  });

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingLineItemIndex, setEditingLineItemIndex] = useState(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [salesPersonSearch, setSalesPersonSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showSalesPersonDropdown, setShowSalesPersonDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [currentSalesPerson, setCurrentSalesPerson] = useState(null);
  const [newClientData, setNewClientData] = useState({
    customerName: '',
    email: '',
  });
  const [couponCode, setCouponCode] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const [createQuotation, { loading: creatingQuotation }] = useMutation(CREATE_QUOTATION);
  const [updateQuotation, { loading: updatingQuotation }] = useMutation(UPDATE_QUOTATION);
  const [getQuotation, { data: quotationData, loading: loadingQuotation }] = useLazyQuery(GET_QUOTATION, {
    fetchPolicy: 'network-only',
  });
  const [validateCoupon, { loading: validatingCouponQuery }] = useLazyQuery(VALIDATE_COUPON, {
    fetchPolicy: 'network-only',
  });
  const { data: productsData } = useQuery(GET_PRODUCTS, {
    fetchPolicy: 'network-only',
  });
  const { data: salesPersonsData } = useQuery(GET_SALES_PERSONS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: customersData } = useQuery(GET_CUSTOMERS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: currentSalesPersonData } = useQuery(GET_CURRENT_USER_SALESPERSON, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all', // Don't fail if not a sales person
  });
  
  // Fetch company notes and terms from NotesAndTerms table
  const companyId = currentSalesPersonData?.getCurrentUser?.companyId || currentUser?.companyId;
  const { data: notesAndTermsData } = useQuery(GET_NOTES_AND_TERMS, {
    variables: { companyId: companyId },
    skip: !companyId,
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    const user = getCurrentUserFromToken();
    setCurrentUser(user);
    
    // Set current sales person if available and role is Sales Person
    if (currentSalesPersonData?.getCurrentUser && currentSalesPersonData.getCurrentUser.role === 'Sales Person') {
      setCurrentSalesPerson(currentSalesPersonData.getCurrentUser);
      // Pre-populate sales person search with current sales person
      const sp = currentSalesPersonData.getCurrentUser;
      setSelectedSalesPerson(sp);
      setSalesPersonSearch(`${sp.name} (${sp.salesPersonId})`);
    }
  }, [currentSalesPersonData]);

  // Load company notes and terms when available (for new quotations, use company defaults)
  useEffect(() => {
    if (notesAndTermsData?.getNotesAndTerms && !isEditMode && !editingQuotationId) {
      const companyNotes = notesAndTermsData.getNotesAndTerms.notesToClient || '';
      const companyTerms = notesAndTermsData.getNotesAndTerms.termsAndConditions || '';
      
      // Always update with company values when creating new quotation
      setFormData(prev => ({
        ...prev,
        notes: companyNotes || prev.notes,
        terms: companyTerms || prev.terms,
      }));
    } else if (notesAndTermsData?.getNotesAndTerms && isEditMode && editingQuotationId) {
      // When editing, if quotation doesn't have notes/terms, use company defaults
      setFormData(prev => {
        const companyNotes = notesAndTermsData.getNotesAndTerms.notesToClient || '';
        const companyTerms = notesAndTermsData.getNotesAndTerms.termsAndConditions || '';
        return {
          ...prev,
          notes: prev.notes || companyNotes,
          terms: prev.terms || companyTerms,
        };
      });
    }
  }, [notesAndTermsData?.getNotesAndTerms?.notesToClient, notesAndTermsData?.getNotesAndTerms?.termsAndConditions, isEditMode, editingQuotationId]);

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
        notes: quotation.notes || (notesAndTermsData?.getNotesAndTerms?.notesToClient || formData.notes),
        terms: quotation.terms || (notesAndTermsData?.getNotesAndTerms?.termsAndConditions || formData.terms),
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
      
      // FINAL VALIDATION BEFORE SUBMISSION
      const validationErrors = [];
      
      // 1. Client Details Validation
      if (!formData.to.businessName?.trim()) {
        validationErrors.push('Client/Business name is required');
      }
      if (!formData.to.email?.trim()) {
        validationErrors.push('Client email is required');
      } else if (!formData.to.email.includes('@') || !formData.to.email.includes('.')) {
        validationErrors.push('Valid email address is required (e.g., client@example.com)');
      }
      
      // 2. Line Items Validation
      if (formData.lineItems.length === 0) {
        validationErrors.push('At least one product must be added');
      }
      
      // 3. Line Items Detail Validation
      formData.lineItems.forEach((item, index) => {
        if (!item.itemName?.trim()) {
          validationErrors.push(`Product ${index + 1}: Name is missing`);
        }
        if (!item.quantity || item.quantity <= 0) {
          validationErrors.push(`Product ${index + 1}: Quantity must be greater than 0`);
        }
        if (!item.rate || item.rate <= 0) {
          validationErrors.push(`Product ${index + 1}: Rate/Price must be greater than 0`);
        }
      });
      
      // 4. Sales Person Validation (optional but recommended)
      if (!selectedSalesPerson && !currentSalesPerson) {
        validationErrors.push('Sales person information is missing. Please select a sales person.');
      }
      
      // Show all validation errors
      if (validationErrors.length > 0) {
        const errorMessage = validationErrors.length === 1 
          ? validationErrors[0]
          : `Please fix the following errors:\n${validationErrors.map((err, i) => `${i + 1}. ${err}`).join('\n')}`;
        
        toast.error(errorMessage, {
          autoClose: 5000,
          position: 'top-center',
        });
        return;
      }
      
      // All validations passed - show confirmation
      console.log('[QuotationFormSimplified] ✅ All validations passed');

      // Calculate totals
      const subtotal = formData.lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
      const couponDiscount = appliedCoupon?.discount || 0;
      const totalAmount = Math.max(0, subtotal - couponDiscount);

      // Determine which sales person to use - selected one or current logged-in one
      const salesPersonToUse = selectedSalesPerson || currentSalesPerson;
      
      // Use new client data if no client is selected, otherwise use form data
      const clientBusinessName = selectedClient 
        ? formData.to.businessName.trim() 
        : (newClientData.customerName.trim() || formData.to.businessName.trim());
      const clientEmail = selectedClient 
        ? formData.to.email.trim().toLowerCase() 
        : (newClientData.email.trim().toLowerCase() || formData.to.email.trim().toLowerCase());
      
      const quotationInput = {
        to: {
          businessName: clientBusinessName,
          email: clientEmail,
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
          // Include sales person info if available
          salesPersonName: salesPersonToUse?.name || '',
          salesPersonId: salesPersonToUse?.salesPersonId || '',
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
        couponCode: appliedCoupon?.coupon?.code || '',
        couponDiscount: couponDiscount,
        totalAmount: totalAmount,
        notes: formData.notes || '',
        terms: formData.terms || '',
        businessLogo: '',
        status: sendEmailFlag ? 'sent' : 'draft', // Set status based on sendEmailFlag
      };

      if (sendEmailFlag) {
        setIsSavingDraft(false);
      } else {
        setIsSavingDraft(true);
      }

      if (isEditMode && editingQuotationId) {
        // Update existing quotation
        // If sendEmailFlag is false, ensure status is draft
        const updateInput = {
          ...quotationInput,
          status: sendEmailFlag ? quotationInput.status : 'draft',
        };
        
        const { data } = await updateQuotation({
          variables: {
            id: editingQuotationId,
            input: updateInput,
          },
        });

        if (data?.updateQuotation) {
          if (sendEmailFlag) {
            toast.success(
              `✅ Quotation Updated Successfully!\n\nQuotation #${data.updateQuotation.quotationNo}\nEmail sent to client\nUpdated: ${new Date().toLocaleDateString()}`,
              {
                autoClose: 4000,
                position: 'top-center',
              }
            );
          } else {
            toast.success(
              `💾 Quotation Updated!\n\nQuotation #${data.updateQuotation.quotationNo}\nSaved as draft`,
              {
                autoClose: 3000,
                position: 'top-center',
              }
            );
          }
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
          
          // Success popup message with detailed information
          if (sendEmailFlag) {
            toast.success(
              `✅ Quotation Created Successfully!\n\nQuotation #${data.createQuotation.quotationNo}\nEmail sent to: ${formData.to.email}\nDate: ${new Date(data.createQuotation.quotationDate).toLocaleDateString()}`,
              {
                autoClose: 4000,
                position: 'top-center',
              }
            );
          } else {
            toast.success(
              `💾 Quotation Saved as Draft!\n\nQuotation #${data.createQuotation.quotationNo}\nStatus: Draft\nYou can edit and send it later.`,
              {
                autoClose: 3000,
                position: 'top-center',
              }
            );
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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    const subtotal = formData.lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
    
    if (subtotal === 0) {
      toast.error('Please add products before applying a coupon');
      return;
    }

    setValidatingCoupon(true);
    
    try {
      const productIds = formData.lineItems.map(item => item.productId).filter(Boolean);
      const groupIds = []; // You can extract group IDs from products if needed

      const { data } = await validateCoupon({
        variables: {
          code: couponCode.toUpperCase(),
          subtotal: subtotal,
          productIds: productIds,
          groupIds: groupIds,
        },
      });

      if (data?.validateCoupon) {
        if (data.validateCoupon.valid) {
          setAppliedCoupon(data.validateCoupon);
          toast.success(`✅ Coupon "${data.validateCoupon.coupon.code}" applied! You save $${data.validateCoupon.discount.toFixed(2)}`);
        } else {
          setAppliedCoupon(null);
          toast.error(data.validateCoupon.error || 'Invalid coupon code');
        }
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      toast.error(error.message || 'Failed to validate coupon');
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast.info('Coupon removed');
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
    // Preserve quantity when editing, otherwise default to 1
    const quantity = editingLineItemIndex !== null 
      ? (formData.lineItems[editingLineItemIndex]?.quantity || 1)
      : 1;
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
    console.log('[QuotationFormSimplified] Current line items before update:', formData.lineItems);

    if (editingLineItemIndex !== null && editingLineItemIndex >= 0 && editingLineItemIndex < formData.lineItems.length) {
      // Update existing item
      console.log('[QuotationFormSimplified] Updating item at index:', editingLineItemIndex);
      setFormData(prev => {
        const updatedLineItems = prev.lineItems.map((item, idx) => {
          if (idx === editingLineItemIndex) {
            console.log('[QuotationFormSimplified] Replacing item:', item, 'with:', lineItem);
            return lineItem;
          }
          return item;
        });
        console.log('[QuotationFormSimplified] Updated line items:', updatedLineItems);
        return {
          ...prev,
          lineItems: updatedLineItems,
        };
      });
      toast.success('Product updated successfully');
    } else {
      // Add new item
      console.log('[QuotationFormSimplified] Adding new item');
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.sales-person-dropdown') && !event.target.closest('.client-dropdown')) {
        setShowSalesPersonDropdown(false);
        setShowClientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Current Sales Person Info - Only show if logged in as sales person */}

        {/* Sales Person Search - Smaller input */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Create quotation on behalf of another sales person (optional)
          </label>
          <div className="relative sales-person-dropdown">
            <input
              type="text"
              value={salesPersonSearch}
              onChange={(e) => {
                setSalesPersonSearch(e.target.value);
                setShowSalesPersonDropdown(true);
              }}
              onFocus={() => setShowSalesPersonDropdown(true)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Search sales person by name, email, or ID..."
              disabled={isLoading}
            />
            {showSalesPersonDropdown && salesPersonsData?.getSalesPersons && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {salesPersonsData.getSalesPersons
                  .filter(sp => 
                    !salesPersonSearch || 
                    sp.name?.toLowerCase().includes(salesPersonSearch.toLowerCase()) ||
                    sp.email?.toLowerCase().includes(salesPersonSearch.toLowerCase()) ||
                    sp.salesPersonId?.toLowerCase().includes(salesPersonSearch.toLowerCase())
                  )
                  .map((sp) => (
                    <div
                      key={sp.id}
                      onClick={() => {
                        setSelectedSalesPerson(sp);
                        setSalesPersonSearch(`${sp.name} (${sp.salesPersonId})`);
                        setShowSalesPersonDropdown(false);
                      }}
                      className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-200 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{sp.name}</div>
                          <div className="text-sm text-gray-600 mt-0.5">{sp.email}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              {sp.salesPersonId}
                            </span>
                            {sp.phone && (
                              <span className="text-xs text-gray-500">
                                📞 {sp.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                {salesPersonsData.getSalesPersons.filter(sp => 
                  !salesPersonSearch || 
                  sp.name?.toLowerCase().includes(salesPersonSearch.toLowerCase()) ||
                  sp.email?.toLowerCase().includes(salesPersonSearch.toLowerCase()) ||
                  sp.salesPersonId?.toLowerCase().includes(salesPersonSearch.toLowerCase())
                ).length === 0 && (
                  <div className="p-3 text-sm text-gray-500 text-center">No sales persons found</div>
                )}
              </div>
            )}
          </div>
          {selectedSalesPerson && selectedSalesPerson.id !== currentSalesPerson?.id && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs font-medium text-blue-900">Creating on behalf of: {selectedSalesPerson.name}</div>
              <div className="text-xs text-blue-700">Email: {selectedSalesPerson.email} | ID: {selectedSalesPerson.salesPersonId}</div>
            </div>
          )}
        </div>

        {/* Client Details */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Client Details
          </h3>
          <div className="relative mb-4 client-dropdown">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Client <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => {
                setClientSearch(e.target.value);
                setShowClientDropdown(true);
              }}
              onFocus={() => setShowClientDropdown(true)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Search client by name, email, or phone..."
              disabled={isLoading}
            />
            {showClientDropdown && customersData?.getCustomers && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {customersData.getCustomers
                  .filter(customer => 
                    !clientSearch || 
                    customer.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                    customer.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                    customer.phone?.toLowerCase().includes(clientSearch.toLowerCase())
                  )
                  .map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => {
                        setSelectedClient(customer);
                        setFormData(prev => ({
                          ...prev,
                          to: {
                            businessName: customer.name,
                            email: customer.email,
                          }
                        }));
                        setClientSearch(`${customer.name} (${customer.email})`);
                        setShowClientDropdown(false);
                        // Clear new client data when selecting existing client
                        setNewClientData({
                          customerName: '',
                          email: '',
                        });
                      }}
                      className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-600">{customer.email}</div>
                      {customer.phone && <div className="text-xs text-gray-500">Phone: {customer.phone}</div>}
                      {customer.address && <div className="text-xs text-gray-500">Address: {customer.address}</div>}
                    </div>
                  ))}
                {customersData.getCustomers.filter(customer => 
                  !clientSearch || 
                  customer.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                  customer.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                  customer.phone?.toLowerCase().includes(clientSearch.toLowerCase())
                ).length === 0 && (
                  <div className="p-3 text-sm text-gray-500 text-center">No clients found</div>
                )}
              </div>
            )}
          </div>
          {selectedClient && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-green-900">Selected Client: {selectedClient.name}</div>
                  <div className="text-xs text-green-700">Email: {selectedClient.email}</div>
                  {selectedClient.phone && <div className="text-xs text-green-700">Phone: {selectedClient.phone}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClient(null);
                    setClientSearch('');
                    setFormData(prev => ({
                      ...prev,
                      to: { businessName: '', email: '' }
                    }));
                  }}
                  className="text-xs text-red-600 hover:text-red-800 underline"
                >
                  Clear & Enter New Client
                </button>
              </div>
            </div>
          )}

          {/* New Client Input Fields - Show when no client is selected */}
          {!selectedClient && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-sm font-semibold text-yellow-900 mb-3">New Client Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newClientData.customerName}
                    onChange={(e) => {
                      setNewClientData(prev => ({ ...prev, customerName: e.target.value }));
                      setFormData(prev => ({
                        ...prev,
                        to: { ...prev.to, businessName: e.target.value }
                      }));
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Client name"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Client Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newClientData.email}
                    onChange={(e) => {
                      setNewClientData(prev => ({ ...prev, email: e.target.value }));
                      setFormData(prev => ({
                        ...prev,
                        to: { ...prev.to, email: e.target.value }
                      }));
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="client@example.com"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-yellow-700">
                Customer account will be created when quotation is saved
              </p>
            </div>
          )}

          {/* Existing Client Fields - Show when client is selected */}
          {selectedClient && (
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
              </div>
            </div>
          )}
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
                <div key={item.id} className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors">
                  <div className="flex items-center gap-4">
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
                      {/* Selected Options Display */}
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-1">Selected Options:</p>
                          <div className="flex flex-wrap gap-2">
                            {item.selectedOptions.map((opt, optIdx) => (
                              <span 
                                key={optIdx}
                                className="inline-flex items-center px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded border border-indigo-200"
                              >
                                <span className="font-medium">{opt.attributeName}:</span>
                                <span className="ml-1">{opt.optionLabel}</span>
                                {opt.price > 0 && (
                                  <span className="ml-1 text-indigo-600">(+${opt.price.toFixed(2)})</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coupon Section */}
        {formData.lineItems.length > 0 && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Apply Coupon (Optional)
            </h3>
            
            {!appliedCoupon ? (
              <div className="flex gap-2 max-w-md">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 uppercase"
                  disabled={validatingCoupon || isLoading}
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={validatingCoupon || isLoading || !couponCode.trim()}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {validatingCoupon ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Validating...
                    </>
                  ) : (
                    'Apply'
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold text-green-900">{appliedCoupon.coupon.code}</span>
                    </div>
                    <p className="text-sm text-green-800">{appliedCoupon.coupon.name}</p>
                    {appliedCoupon.coupon.description && (
                      <p className="text-xs text-green-700 mt-1">{appliedCoupon.coupon.description}</p>
                    )}
                    <p className="text-sm font-semibold text-green-900 mt-2">
                      Discount: -${appliedCoupon.discount.toFixed(2)}
                      {appliedCoupon.discountType === 'percentage' && ` (${appliedCoupon.discountValue}%)`}
                    </p>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="ml-3 text-red-600 hover:text-red-800 transition-colors"
                    title="Remove coupon"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Total */}
        {formData.lineItems.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between text-base">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-base text-green-600">
                    <span>Coupon Discount ({appliedCoupon.coupon.code}):</span>
                    <span>-${appliedCoupon.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-indigo-600">${Math.max(0, subtotal - (appliedCoupon?.discount || 0)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes & Terms - Non-editable from Company Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes to Client
              <span className="text-xs text-gray-500 ml-2 font-normal">(Managed from Global Settings)</span>
            </label>
            <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg min-h-[150px] max-h-[300px] overflow-y-auto">
              {formData.notes ? (
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {formData.notes}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  Loading notes from Global Settings...
                </p>
              )}
            </div>
            <input
              type="hidden"
              value={formData.notes || ''}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Terms & Conditions
              <span className="text-xs text-gray-500 ml-2 font-normal">(Managed from Global Settings)</span>
            </label>
            <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg min-h-[150px] max-h-[300px] overflow-y-auto">
              {formData.terms ? (
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {formData.terms}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  Loading terms from Global Settings...
                </p>
              )}
            </div>
            <input
              type="hidden"
              value={formData.terms || ''}
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

