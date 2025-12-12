'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { toast } from 'react-toastify';
import ProductSelectorPanel from './ProductSelectorPanel';
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
  mutation UpdateQuotation($id: ID!, $input: QuotationInput!, $sendEmail: Boolean) {
    updateQuotation(id: $id, input: $input, sendEmail: $sendEmail) {
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
        country
        phone
        address
      }
      from {
        businessName
        email
        country
        phone
        address
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
      couponCode
      couponDiscount
      notes
      terms
      status
      currency
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
        type
        name
        description
      }
    }
  }
`;

const GET_AVAILABLE_COUPONS = gql`
  query GetAvailableCoupons($subtotal: Float!, $productIds: [ID!], $groupIds: [ID!]) {
    getAvailableCoupons(subtotal: $subtotal, productIds: $productIds, groupIds: $groupIds) {
      id
      code
      type
      name
      description
      discountType
      discountValue
      maxDiscount
      minPurchase
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

const GET_COMPANY_COUPONS = gql`
  query GetCompanyCoupons {
    getCoupons {
      id
      code
      type
      name
      description
      discountType
      discountValue
      validFrom
      validTo
      usageLimit
      usedCount
      status
      minPurchase
      maxDiscount
    }
  }
`;

const GET_COMPANY = gql`
  query GetCompany($id: ID!) {
    getCompany(id: $id) {
      id
      name
      email
      phone
      address
      website
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
      country: '',
      phone: '',
      address: '',
    },
    lineItems: [],
    notes: 'Thank you for your interest in our products/services.\n\nPlease review the quotation carefully and contact us if you have any questions.\n\nWe look forward to working with you.',
    terms: '• Payment terms: Net 30 days from invoice date\n• All prices are subject to change without prior notice\n• Delivery time: As per agreed schedule\n• Warranty: Standard warranty applies as per product specifications',
    currency: 'USD',
    couponCode: '',
    couponDiscount: 0,
  });

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
  const [appliedCoupons, setAppliedCoupons] = useState([]); // Changed to array for multiple coupons

  const [createQuotation, { loading: creatingQuotation }] = useMutation(CREATE_QUOTATION);
  const [updateQuotation, { loading: updatingQuotation }] = useMutation(UPDATE_QUOTATION);
  const [getQuotation, { data: quotationData, loading: loadingQuotation, error: quotationError }] = useLazyQuery(GET_QUOTATION, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      console.log('[QuotationFormSimplified] GET_QUOTATION completed:', data);
    },
    onError: (error) => {
      console.error('[QuotationFormSimplified] GET_QUOTATION error:', error);
      toast.error(`Failed to load quotation: ${error.message}`);
    },
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
  const { data: couponsData } = useQuery(GET_COMPANY_COUPONS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: companyData } = useQuery(GET_COMPANY, {
    variables: { id: companyId },
    skip: !companyId,
    fetchPolicy: 'cache-and-network',
  });

  // Set current user from token (only once on mount)
  useEffect(() => {
    const user = getCurrentUserFromToken();
    setCurrentUser(user);
    
    // Auto-populate client info for customers
    if (user && user.role === 'Customer') {
      setFormData(prev => ({
        ...prev,
        to: {
          ...prev.to,
          businessName: user.name || '',
          email: user.email || '',
        }
      }));
    }
  }, []); // Empty dependency array - only run once on mount
  
  // Set current sales person if available and role is Sales Person
  useEffect(() => {
    if (currentSalesPersonData?.getCurrentUser && currentSalesPersonData.getCurrentUser.role === 'Sales Person') {
      const sp = currentSalesPersonData.getCurrentUser;
      setCurrentSalesPerson(sp);
      // Pre-populate sales person search with current sales person
      if (!selectedSalesPerson) {
        setSelectedSalesPerson(sp);
        setSalesPersonSearch(`${sp.name} (${sp.salesPersonId})`);
      }
    }
  }, [currentSalesPersonData]);
  
  // Auto-select first available sales person for Admin when creating new quotation
  useEffect(() => {
    if (currentUser?.role === 'Admin' && !isEditMode && !editingQuotationId && salesPersonsData?.getSalesPersons) {
      const activeSalesPersons = salesPersonsData.getSalesPersons.filter(
        sp => sp.status === 'Active' && sp.companyId === currentUser.companyId
      );
      if (activeSalesPersons.length > 0 && !selectedSalesPerson) {
        const firstSalesPerson = activeSalesPersons[0];
        setSelectedSalesPerson(firstSalesPerson);
        setSalesPersonSearch(`${firstSalesPerson.name} (${firstSalesPerson.salesPersonId})`);
        console.log('[QuotationFormSimplified] Auto-selected sales person for Admin:', firstSalesPerson);
      }
    }
  }, [salesPersonsData, currentUser, isEditMode, editingQuotationId, selectedSalesPerson]);

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
    console.log('[QuotationFormSimplified] useEffect [quotationData] triggered');
    console.log('[QuotationFormSimplified] quotationData:', quotationData);
    console.log('[QuotationFormSimplified] isEditMode:', isEditMode);
    console.log('[QuotationFormSimplified] editingQuotationId:', editingQuotationId);
    
    if (quotationData?.getQuotation && isEditMode && editingQuotationId) {
      const quotation = quotationData.getQuotation;
      console.log('[QuotationFormSimplified] ✅ Loading quotation data for edit:', quotation);
      
      // Set form data with FULL client information
      setFormData({
        to: {
          businessName: quotation.to?.businessName || '',
          email: quotation.to?.email || '',
          country: quotation.to?.country || '',
          phone: quotation.to?.phone || '',
          address: quotation.to?.address || '',
        },
        lineItems: quotation.lineItems || [],
        notes: quotation.notes || (notesAndTermsData?.getNotesAndTerms?.notesToClient || ''),
        terms: quotation.terms || (notesAndTermsData?.getNotesAndTerms?.termsAndConditions || ''),
        currency: quotation.currency || 'USD',
        couponCode: quotation.couponCode || '',
        couponDiscount: quotation.couponDiscount || 0,
      });
      
      // Set coupon if exists and re-apply it (for draft quotations)
      if (quotation.couponCode && quotation.couponDiscount > 0) {
        console.log('[QuotationFormSimplified] Re-applying saved coupon:', quotation.couponCode);
        setCouponCode(quotation.couponCode);
        
        // Re-validate and apply the coupon to restore appliedCoupons state
        // Use longer delay to ensure line items are fully loaded and formData is updated
        setTimeout(() => {
          handleApplyCoupon(quotation.couponCode);
        }, 1000); // Increased delay to ensure line items are loaded
      } else {
        // Clear coupon if not present
        setCouponCode('');
        setAppliedCoupons([]);
      }
      
      // Set salesperson if exists in quotation
      if (quotation.from?.salesPersonId) {
        // Try to find the salesperson in the list
        const sp = salesPersonsData?.getSalesPersons?.find(
          s => s.salesPersonId === quotation.from.salesPersonId
        );
        if (sp) {
          setSelectedSalesPerson(sp);
          setSalesPersonSearch(`${sp.name} (${sp.salesPersonId})`);
        } else {
          // Set a placeholder if salesperson not found in list
          setSalesPersonSearch(`${quotation.from.salesPersonName} (${quotation.from.salesPersonId})`);
        }
      }
      
      // Set client search display and try to find existing client
      if (quotation.to?.businessName && quotation.to?.email) {
        setClientSearch(`${quotation.to.businessName} (${quotation.to.email})`);
        
        // Try to find if this client exists in customers list
        const existingClient = customersData?.getCustomers?.find(
          c => c.email?.toLowerCase() === quotation.to.email?.toLowerCase()
        );
        if (existingClient) {
          setSelectedClient(existingClient);
          // When existing client is found, ensure formData has the correct values
          setFormData(prev => ({
            ...prev,
            to: {
              ...prev.to,
              businessName: quotation.to.businessName || prev.to.businessName,
              email: quotation.to.email || prev.to.email,
              // Keep country/phone/address in formData but they won't be displayed
              country: prev.to.country || quotation.to.country || '',
              phone: prev.to.phone || quotation.to.phone || '',
              address: prev.to.address || quotation.to.address || '',
            }
          }));
          console.log('[QuotationFormSimplified] Found existing client:', existingClient);
        } else {
          // If not found, clear selectedClient but keep all form data
          setSelectedClient(null);
          console.log('[QuotationFormSimplified] Client not found in customers list, treating as new client');
        }
      }
      
      console.log('[QuotationFormSimplified] ✅ Form data loaded successfully');
      console.log('[QuotationFormSimplified] Current isEditMode:', isEditMode);
      console.log('[QuotationFormSimplified] Current editingQuotationId:', editingQuotationId);
    } else {
      console.log('[QuotationFormSimplified] ⚠️ Not loading quotation data - conditions not met');
    }
  }, [quotationData, isEditMode, editingQuotationId, salesPersonsData, customersData]);

  // Expose method to load quotation for editing (called from parent)
  useImperativeHandle(ref, () => ({
    loadQuotationForEdit: (quotationId) => {
      console.log('[QuotationFormSimplified] ========== LOAD FOR EDIT ==========');
      console.log('[QuotationFormSimplified] quotationId:', quotationId);
      console.log('[QuotationFormSimplified] Setting isEditMode to true');
      console.log('[QuotationFormSimplified] Setting editingQuotationId to:', quotationId);
      
      setIsEditMode(true);
      setEditingQuotationId(quotationId);
      
      console.log('[QuotationFormSimplified] Calling getQuotation query...');
      getQuotation({ variables: { id: quotationId } });
    },
  }));

  const handleSubmit = async (sendEmailFlag = true) => {
    try {
      console.log('[QuotationFormSimplified] ========== SUBMIT START ==========');
      console.log('[QuotationFormSimplified] sendEmailFlag:', sendEmailFlag);
      console.log('[QuotationFormSimplified] isEditMode:', isEditMode);
      console.log('[QuotationFormSimplified] editingQuotationId:', editingQuotationId);
      console.log('[QuotationFormSimplified] formData:', formData);
      
      // FINAL VALIDATION BEFORE SUBMISSION
      const validationErrors = [];
      
      // CLIENT INFORMATION VALIDATION - REQUIRED FOR BOTH DRAFT AND SEND
      // 1. Client Details Validation (Always Required)
      if (!formData.to.businessName?.trim()) {
        validationErrors.push('Client/Business name is required. Please add client details before saving.');
      }
      if (!formData.to.email?.trim()) {
        validationErrors.push('Client email is required. Please add client details before saving.');
      } else if (!formData.to.email.includes('@') || !formData.to.email.includes('.')) {
        validationErrors.push('Valid client email address is required (e.g., client@example.com)');
      }
      
      // 2. Sales Person Validation (Only for Send Email, not for Draft)
      if (sendEmailFlag && currentUser?.role !== 'Customer' && !selectedSalesPerson && !currentSalesPerson) {
        validationErrors.push('Sales person information is missing. Please select a sales person.');
      }
      
      // 3. Line Items Validation (Always Required)
      if (formData.lineItems.length === 0) {
        validationErrors.push('At least one product must be added');
      }
      
      // 2. Line Items Detail Validation
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
      
      // Show all validation errors
      if (validationErrors.length > 0) {
        console.log('[QuotationFormSimplified] ❌ Validation errors:', validationErrors);
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
      console.log('[QuotationFormSimplified] Proceeding to build quotation input...');

      // Calculate totals
      const subtotal = formData.lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
      const couponDiscount = appliedCoupons.reduce((sum, coupon) => sum + (coupon.discount || 0), 0);
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
      
      // Helper function to remove __typename from objects (Apollo cache artifact)
      const cleanObject = (obj) => {
        if (!obj) return obj;
        if (Array.isArray(obj)) {
          return obj.map(item => cleanObject(item));
        }
        if (typeof obj === 'object') {
          const cleaned = {};
          for (const key in obj) {
            if (key !== '__typename') {
              cleaned[key] = cleanObject(obj[key]);
            }
          }
          return cleaned;
        }
        return obj;
      };

      // Get company details for 'from' section
      const company = companyData?.getCompany;
      console.log('[QuotationFormSimplified] Company data:', company);
      console.log('[QuotationFormSimplified] Company ID:', companyId);
      
      const quotationInput = {
        to: {
          businessName: clientBusinessName,
          email: clientEmail,
          country: 'United States of America (USA)',
          phone: formData.to.phone || '',
          address: formData.to.address || '',
        },
        from: {
          country: 'United States of America (USA)',
          businessName: company?.name || 'Company Name',
          phone: company?.phone || '',
          address: company?.address || '',
          email: company?.email || '',
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
          subscriptionDetails: cleanObject(item.subscriptionDetails) || null,
          subscriptionPrice: item.subscriptionPrice || null,
          selectedOptions: cleanObject(item.selectedOptions) || [],
        })),
        currency: formData.currency || 'USD',
        subtotal: subtotal,
        totalTax: 0,
        couponCode: appliedCoupons.length > 0 ? appliedCoupons.map(c => c.coupon?.code).join(', ') : '',
        couponDiscount: couponDiscount,
        totalAmount: totalAmount,
        notes: formData.notes || '',
        terms: formData.terms || '',
        businessLogo: '',
        status: sendEmailFlag ? 'sent' : 'draft', // Set status based on sendEmailFlag
      };

      console.log('[QuotationFormSimplified] quotationInput built:', JSON.stringify(quotationInput, null, 2));
      
      if (sendEmailFlag) {
        setIsSavingDraft(false);
      } else {
        setIsSavingDraft(true);
      }

      console.log('[QuotationFormSimplified] Checking edit mode...');
      console.log('[QuotationFormSimplified] isEditMode:', isEditMode);
      console.log('[QuotationFormSimplified] editingQuotationId:', editingQuotationId);
      
      if (isEditMode && editingQuotationId) {
        console.log('[QuotationFormSimplified] ✅ ENTERING UPDATE MODE');
        // Update existing quotation
        console.log('[QuotationFormSimplified] Updating quotation ID:', editingQuotationId);
        console.log('[QuotationFormSimplified] Send email flag:', sendEmailFlag);
        
        // If sendEmailFlag is false, ensure status is draft
        const updateInput = {
          ...quotationInput,
          status: sendEmailFlag ? quotationInput.status : 'draft',
        };
        
        console.log('[QuotationFormSimplified] Update input:', JSON.stringify(updateInput, null, 2));
        
        const { data, errors } = await updateQuotation({
          variables: {
            id: editingQuotationId,
            input: updateInput,
            sendEmail: sendEmailFlag,
          },
          refetchQueries: ['GetQuotations'],
          awaitRefetchQueries: true,
        });

        console.log('[QuotationFormSimplified] Update response data:', data);
        console.log('[QuotationFormSimplified] Update response errors:', errors);

        if (errors && errors.length > 0) {
          console.error('[QuotationFormSimplified] Update GraphQL Errors:', errors);
          throw new Error(errors[0].message);
        }

        if (data?.updateQuotation) {
          console.log('[QuotationFormSimplified] ✅ Quotation updated successfully');
          
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
          
          // Don't reset edit mode when saving as draft - keep form state
          // Only reset when sending email
          if (sendEmailFlag) {
            setIsEditMode(false);
            setEditingQuotationId(null);
          }
          
          onQuotationCreated?.();
        } else {
          console.error('[QuotationFormSimplified] No data returned from update mutation');
          toast.error('Failed to update quotation - no data returned');
        }
      } else {
        // Create new quotation
        console.log('[QuotationFormSimplified] ✅ ENTERING CREATE MODE (Not edit mode)');
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
              `💾 Quotation Saved as Draft!\n\nQuotation #${data.createQuotation.quotationNo}\nStatus: Draft\nYou can continue editing or send it later.`,
              {
                autoClose: 3000,
                position: 'top-center',
              }
            );
          }
          
          // If sending email, reset form. If draft, switch to edit mode to keep data
          if (sendEmailFlag) {
            // Reset form only when email is sent
            setFormData({
              to: { businessName: '', email: '', country: '', phone: '', address: '' },
              lineItems: [],
              notes: formData.notes,
              terms: formData.terms,
              currency: 'USD',
              couponCode: '',
              couponDiscount: 0,
            });
            setAppliedCoupons([]);
            setCouponCode('');
          } else {
            // If saved as draft, switch to edit mode to preserve data
            setIsEditMode(true);
            setEditingQuotationId(data.createQuotation.id);
            console.log('[QuotationFormSimplified] Switched to edit mode for draft:', data.createQuotation.id);
          }
          
          onQuotationCreated?.();
        } else {
          console.error('[QuotationFormSimplified] No data returned from mutation');
          toast.error('Failed to create quotation - no data returned');
        }
      }
    } catch (error) {
      console.error('[QuotationFormSimplified] ❌ Error with quotation:', error);
      console.error('[QuotationFormSimplified] Error details:', {
        message: error.message,
        graphQLErrors: error.graphQLErrors,
        networkError: error.networkError,
        stack: error.stack
      });
      
      // More specific error message with user-friendly formatting
      let errorMessage = 'Failed to process quotation';
      
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        // Clean up GraphQL error messages
        const firstError = error.graphQLErrors[0].message;
        
        // Check for common error patterns
        if (firstError.includes('Field "isSubscription" is not defined') || 
            firstError.includes('Field "billingInterval" is not defined') ||
            firstError.includes('SelectedOptionInput')) {
          errorMessage = '❌ Product configuration error. Please refresh the page and try reconfiguring the product.';
        } else if (firstError.includes('businessName') || 
                   firstError.includes('Client information') ||
                   firstError.includes('to.businessName') ||
                   firstError.includes('to.email')) {
          errorMessage = '❌ Client information is required. Please fill in client name and email before saving.';
        } else if (firstError.includes('__typename')) {
          errorMessage = '❌ Data format error. Please try refreshing the page and try again.';
        } else if (firstError.includes('duplicate')) {
          errorMessage = '❌ This quotation already exists. Please check and try again.';
        } else if (firstError.includes('not found')) {
          errorMessage = '❌ Referenced item not found. Please refresh and try again.';
        } else if (firstError.includes('Validation failed') && firstError.includes('required')) {
          // Extract field name from validation error
          const fieldMatch = firstError.match(/Path `([^`]+)` is required/);
          const fieldName = fieldMatch ? fieldMatch[1] : 'field';
          errorMessage = `❌ Required field missing: ${fieldName}. Please refresh the page and try again.`;
        } else if (firstError.includes('required')) {
          errorMessage = '❌ Required field missing. Please fill all required fields.';
        } else {
          // Show first 150 chars of error
          errorMessage = `❌ ${firstError.substring(0, 150)}${firstError.length > 150 ? '...' : ''}`;
        }
        
        toast.error(errorMessage, {
          autoClose: 6000,
          position: 'top-center',
        });
      } else if (error.networkError) {
        errorMessage = '❌ Network error - please check your internet connection';
        toast.error(errorMessage, {
          autoClose: 5000,
          position: 'top-center',
        });
      } else {
        errorMessage = error.message || 'Failed to process quotation';
        toast.error(`❌ ${errorMessage}`, {
          autoClose: 5000,
          position: 'top-center',
        });
      }
      
      console.log('[QuotationFormSimplified] User shown error:', errorMessage);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleApplyCoupon = async (autoCode = null) => {
    // Extract code from object if needed, or use as string
    let codeToApply = autoCode || couponCode;
    
    // If autoCode is an object with a code property, extract it
    if (codeToApply && typeof codeToApply === 'object' && codeToApply.code) {
      codeToApply = codeToApply.code;
    }
    
    // Ensure it's a string
    codeToApply = String(codeToApply || '').trim();
    
    if (!codeToApply) {
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
      
      // Extract unique group IDs from line items
      const groupIds = [...new Set(
        formData.lineItems
          .map(item => item.groupId)
          .filter(Boolean)
      )];

      console.log('[CouponValidation] Starting validation...');
      console.log('[CouponValidation] Code:', codeToApply.toUpperCase());
      console.log('[CouponValidation] Subtotal:', subtotal);
      console.log('[CouponValidation] ProductIds:', productIds);
      console.log('[CouponValidation] GroupIds:', groupIds);

      const { data, errors } = await validateCoupon({
        variables: {
          code: codeToApply.toUpperCase(),
          subtotal: subtotal,
          productIds: productIds,
          groupIds: groupIds,
        },
      });

      console.log('[CouponValidation] Response data:', data);
      console.log('[CouponValidation] Response errors:', errors);

      if (errors && errors.length > 0) {
        console.error('[CouponValidation] GraphQL errors:', errors);
        toast.error(errors[0].message || 'Failed to validate coupon');
        setAppliedCoupon(null);
        return;
      }

      if (data?.validateCoupon) {
        console.log('[CouponValidation] Validation result:', data.validateCoupon);
        if (data.validateCoupon.valid) {
          // Calculate current total discount
          const currentDiscount = appliedCoupons.reduce((sum, c) => sum + (c.discount || 0), 0);
          const newTotalDiscount = currentDiscount + data.validateCoupon.discount;
          
          // Check if total discount would exceed subtotal
          if (newTotalDiscount > subtotal) {
            const maxAllowedDiscount = subtotal - currentDiscount;
            toast.error(`Cannot apply coupon. Total discount ($${newTotalDiscount.toFixed(2)}) would exceed subtotal ($${subtotal.toFixed(2)}). Maximum allowed: $${maxAllowedDiscount.toFixed(2)}`);
            return;
          }
          
          // Check if coupon of same type already applied
          const couponType = data.validateCoupon.coupon.type;
          const existingCouponIndex = appliedCoupons.findIndex(c => c.coupon.type === couponType);
          
          if (existingCouponIndex !== -1) {
            // Replace existing coupon of same type
            const updatedCoupons = [...appliedCoupons];
            const oldDiscount = updatedCoupons[existingCouponIndex].discount;
            updatedCoupons[existingCouponIndex] = data.validateCoupon;
            
            // Recalculate total discount after replacement
            const newTotal = currentDiscount - oldDiscount + data.validateCoupon.discount;
            if (newTotal > subtotal) {
              toast.error(`Cannot replace coupon. Total discount ($${newTotal.toFixed(2)}) would exceed subtotal ($${subtotal.toFixed(2)})`);
              return;
            }
            
            setAppliedCoupons(updatedCoupons);
            toast.success(`Coupon "${data.validateCoupon.coupon.code}" replaced previous ${couponType} coupon! You save $${data.validateCoupon.discount.toFixed(2)}`);
          } else {
            // Add new coupon
            setAppliedCoupons([...appliedCoupons, data.validateCoupon]);
            toast.success(`Coupon "${data.validateCoupon.coupon.code}" applied! You save $${data.validateCoupon.discount.toFixed(2)}`);
          }
          setCouponCode('');
        } else {
          toast.error(data.validateCoupon.error || 'Invalid coupon code');
        }
      } else {
        console.error('[CouponValidation] No data received');
        toast.error('Failed to validate coupon - no response from server');
      }
    } catch (error) {
      console.error('[CouponValidation] Exception:', error);
      toast.error(error.message || 'Failed to validate coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = (couponCode) => {
    setAppliedCoupons(appliedCoupons.filter(c => c.coupon.code !== couponCode));
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
      groupId: product.group?.id || null, // Store group ID for coupon filtering
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
        optionValue: opt.value !== null && opt.value !== undefined ? String(opt.value) : '',
        price: opt.price?.amount ? opt.price.amount / 100 : 0,
        isSubscription: opt.price?.billingType === 'recurring',
        billingInterval: opt.price?.interval || null,
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

    setEditingLineItemIndex(null);
  };

  const handleEditItem = (index) => {
    setEditingLineItemIndex(index);
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
  const totalCouponDiscount = appliedCoupons.reduce((sum, coupon) => sum + (coupon.discount || 0), 0);

  const isLoading = creatingQuotation || updatingQuotation || isSavingDraft;

  // Auto-apply group discount coupons when line items change
  useEffect(() => {
    if (!couponsData?.getCoupons || formData.lineItems.length === 0) return;
    
    // Get all group discount coupons
    const now = new Date();
    const activeGroupCoupons = couponsData.getCoupons.filter(c => {
      const validFrom = new Date(c.validFrom);
      const validTo = new Date(c.validTo);
      const isActive = c.status?.toLowerCase() === 'active';
      const isDateValid = now >= validFrom && now <= validTo;
      const hasUsageLeft = !c.usageLimit || c.usedCount < c.usageLimit;
      const isGroupDiscount = c.type === 'group_discount';
      return isActive && isDateValid && hasUsageLeft && isGroupDiscount;
    });

    if (activeGroupCoupons.length === 0) return;

    // Get unique group IDs from line items
    const productGroups = [...new Set(
      formData.lineItems
        .map(item => item.groupId)
        .filter(Boolean)
    )];

    // Check each group and auto-apply matching coupons
    productGroups.forEach(groupId => {
      // Find matching group coupon
      const matchingCoupon = activeGroupCoupons.find(coupon => {
        // Assuming coupon has applicableGroups field
        return coupon.applicableGroups?.includes(groupId);
      });

      if (matchingCoupon) {
        // Check if this group coupon is already applied
        const alreadyApplied = appliedCoupons.some(
          ac => ac.coupon.id === matchingCoupon.id
        );

        if (!alreadyApplied) {
          // Auto-validate and apply
          const subtotal = formData.lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
          const productIds = formData.lineItems.map(item => item.productId).filter(Boolean);
          const groupIds = productGroups;

          validateCoupon({
            variables: {
              code: matchingCoupon.code.toUpperCase(),
              subtotal: subtotal,
              productIds: productIds,
              groupIds: groupIds,
            },
          }).then(({ data }) => {
            if (data?.validateCoupon?.valid) {
              setAppliedCoupons(prev => {
                // Check if already exists to avoid duplicates
                const exists = prev.some(c => c.coupon.id === data.validateCoupon.coupon.id);
                if (exists) return prev;
                return [...prev, data.validateCoupon];
              });
              toast.success(`🎉 Group discount "${matchingCoupon.code}" auto-applied! Save $${data.validateCoupon.discount.toFixed(2)}`);
            }
          }).catch(err => {
            console.error('[Auto-apply coupon] Error:', err);
          });
        }
      }
    });
  }, [formData.lineItems, couponsData, validateCoupon]);

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
    <div className="max-w-[1600px] mx-auto">
      {/* Main Container with Two-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column - Form Section */}
        <div className="flex-1 lg:max-w-[65%]">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Form Header */}
            <div className="bg-indigo-600 px-6 py-5 border-b-4 border-indigo-700">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <h2 className="text-xl font-bold text-white">{isEditMode ? 'Edit Quotation' : 'Create New Quotation'}</h2>
                  <p className="text-white/90 text-sm">Fill in the details below</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
        {/* Sales Person Search - Smaller input (Hidden for Customers) */}
        {currentUser?.role !== 'Customer' && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-300">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Create quotation on behalf of (optional)
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
              className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-all"
              placeholder="Search sales person by name, email, or ID..."
              disabled={isLoading}
            />
            {showSalesPersonDropdown && salesPersonsData?.getSalesPersons && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
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
                      className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
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
            <div className="mt-3 p-3 bg-blue-50 border border-blue-300 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{selectedSalesPerson.name?.charAt(0)}</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{selectedSalesPerson.name}</div>
                  <div className="text-xs text-gray-600">{selectedSalesPerson.salesPersonId}</div>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Client Details */}
        <div className="bg-white rounded-lg p-5 border border-gray-300">
          <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
            Client Details
          </h3>
          {/* Hide client search for customers - auto-populated */}
          {currentUser?.role !== 'Customer' && (
          <div className="relative mb-4 client-dropdown">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
              placeholder="Search client by name, email, or phone..."
              disabled={isLoading}
            />
            {showClientDropdown && customersData?.getCustomers && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
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
                      className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <div className="font-semibold text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-600">{customer.email}</div>
                      {customer.phone && <div className="text-xs text-gray-500 mt-1">📞 {customer.phone}</div>}
                    </div>
                  ))}
                {customersData.getCustomers.filter(customer => 
                  !clientSearch || 
                  customer.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                  customer.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                  customer.phone?.toLowerCase().includes(clientSearch.toLowerCase())
                ).length === 0 && (
                  <div className="p-4 text-sm text-gray-500 text-center">
                    <span className="text-2xl block mb-2">🔍</span>
                    No clients found
                  </div>
                )}
              </div>
            )}
          </div>
          )}
          
          {/* Client selection info for non-customers */}
          {currentUser?.role !== 'Customer' && selectedClient && (
            <div className="mb-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{selectedClient.name?.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{selectedClient.name}</div>
                    <div className="text-xs text-gray-600">{selectedClient.email}</div>
                  </div>
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
                  className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-white hover:bg-red-500 border border-red-200 rounded-lg transition-all"
                >
                  ✕ Clear
                </button>
              </div>
            </div>
          )}

          {/* New Client Input Fields - Show when no client is selected (Admin/Sales Person only) */}
          {currentUser?.role !== 'Customer' && !selectedClient && (
            <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
              <h4 className="text-sm font-bold text-gray-900 mb-3">
                New Client Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
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
                    className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    placeholder="Enter client name"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
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
                    className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    placeholder="client@example.com"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-600">
                Note: Customer account will be created when quotation is sent
              </p>
            </div>
          )}

          {/* Existing Client Fields - Show when client is selected (Admin/Sales Person only) */}
          {currentUser?.role !== 'Customer' && selectedClient && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.to.businessName}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    to: { ...prev.to, businessName: e.target.value }
                  }))}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="Enter client name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Client Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.to.email}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    to: { ...prev.to, email: e.target.value }
                  }))}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="client@example.com"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}
          
          {/* Auto-populated client info for customers (readonly display) */}
          {currentUser?.role === 'Customer' && (
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border-2 border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Client Name</label>
                  <p className="text-sm font-bold text-gray-900">{formData.to.businessName || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Client Email</label>
                  <p className="text-sm text-gray-700">{formData.to.email || 'N/A'}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-blue-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Update your details in Settings if needed
              </p>
            </div>
          )}
        </div>

        {/* Products */}
        <div className="bg-white rounded-lg p-5 border border-gray-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 flex-1">
              Products & Services
            </h3>
            <div className="text-sm text-indigo-600 font-medium">
              Select from right panel →
            </div>
          </div>

          {/* Helper Message */}
          {formData.lineItems.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-300 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Tip:</strong> Click any product below to edit its options in the right panel
              </p>
            </div>
          )}

          {formData.lineItems.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-gray-600 font-medium mb-1">No products added yet</p>
              <p className="text-sm text-gray-500">Select products from the right panel</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.lineItems.map((item, index) => (
                <div key={item.id}                   className={`p-4 bg-white border-2 rounded-lg transition-all group cursor-pointer ${
                  editingLineItemIndex === index 
                    ? 'border-indigo-500 shadow-lg bg-indigo-50' 
                    : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                }`}>
                  <div className="flex items-center gap-4">
                    <div 
                      className="flex-1 flex items-center gap-4 min-w-0"
                      onClick={() => handleEditItem(index)}
                    >
                      {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.itemName} className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                    ) : (
                      <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 truncate">{item.itemName}</p>
                          {editingLineItemIndex === index && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              Editing →
                            </span>
                          )}
                          {editingLineItemIndex !== index && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              Click to edit →
                            </span>
                          )}
                        </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">${item.rate.toFixed(2)}/unit</span>
                        {item.isSubscription && (
                          <span className="text-xs font-medium bg-purple-600 text-white px-2 py-0.5 rounded-md">
                            Subscription
                          </span>
                        )}
                      </div>
                        {/* Selected Options Display */}
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.selectedOptions.map((opt, optIdx) => (
                              <span 
                                key={optIdx}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md ${
                                  opt.isSubscription 
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                                    : 'bg-indigo-50 text-indigo-700'
                                }`}
                              >
                                <span>{opt.attributeName}: {opt.optionLabel}</span>
                                {opt.isSubscription && opt.billingInterval && (
                                  <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-purple-600 text-white">
                                    {opt.billingInterval}
                                  </span>
                                )}
                                {opt.price > 0 && (
                                  <span className={opt.isSubscription ? 'text-purple-600' : 'text-indigo-500'}>
                                    (+${opt.price.toFixed(2)}{opt.isSubscription && opt.billingInterval ? `/${opt.billingInterval}` : ''})
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-24" onClick={(e) => e.stopPropagation()}>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                        className="w-full px-3 py-2 text-center border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="w-28 text-right">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Total</p>
                      <p className="text-lg font-bold text-indigo-600">${item.total.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        disabled={isLoading}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity"
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

        {/* Coupon Section - Completely removed, now shown in Order Summary only */}

        {/* Notes & Terms - Non-editable from Company Settings */}
        <div className="bg-white rounded-lg p-5 border border-gray-300">
          <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
            Notes & Terms
            <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded">From Settings</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Notes to Client</label>
              <div className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl min-h-[120px] max-h-[200px] overflow-y-auto">
                {formData.notes ? (
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{formData.notes}</div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Loading notes...</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Terms & Conditions</label>
              <div className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl min-h-[120px] max-h-[200px] overflow-y-auto">
                {formData.terms ? (
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{formData.terms}</div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Loading terms...</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-4 pt-6 border-t border-gray-200">
          <div>
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 font-medium"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Save as Draft / Update (No Email) - Only show for draft status or when creating new */}
            {(!isEditMode || (isEditMode && quotationData?.getQuotation?.status === 'draft')) && (
            <button
              onClick={() => handleSubmit(false)}
              disabled={isLoading}
              className="px-5 py-2.5 border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {isSavingDraft ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Draft'}
            </button>
            )}
            {/* Send Email - Available in both create and edit mode */}
            <button
              onClick={() => handleSubmit(true)}
              disabled={isLoading}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {isLoading && !isSavingDraft ? 'Sending...' : isEditMode ? 'Update & Send' : 'Create & Send'}
            </button>
          </div>
        </div>

            </div>
          </div>
        </div>

        {/* Right Column - Product Selector & Order Summary */}
        <div className="lg:w-[35%] lg:sticky lg:top-6 lg:self-start space-y-6">
          {/* Product Selector Panel */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden" style={{ height: '600px' }}>
            <ProductSelectorPanel
              products={productsData?.getProducts || []}
              onSelectProduct={handleAddProduct}
              loading={false}
              editingProduct={editingLineItemIndex !== null ? formData.lineItems[editingLineItemIndex] : null}
              onCancelEdit={() => setEditingLineItemIndex(null)}
            />
          </div>

          {/* Order Summary Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Summary Header */}
            <div className="bg-gray-800 px-6 py-5 border-b-4 border-gray-900">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <div>
                  <h3 className="text-lg font-bold text-white">Order Summary</h3>
                  <p className="text-gray-300 text-sm">{formData.lineItems.length} item{formData.lineItems.length !== 1 ? 's' : ''} in quotation</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Product List */}
              {formData.lineItems.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-500 font-medium">No products added</p>
                  <p className="text-sm text-gray-400">Add products to see summary</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {formData.lineItems.map((item, index) => (
                    <div 
                      key={item.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.itemName} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.itemName}</p>
                        <p className="text-xs text-gray-500">{item.quantity} × ${item.rate.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">${item.total.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Coupons Section (Hidden for Customers) */}
              {currentUser?.role !== 'Customer' && formData.lineItems.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-900">
                      Coupons
                    </h4>
                  </div>
                  
                  {/* Applied Coupons List */}
                  {appliedCoupons.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {appliedCoupons.map((coupon, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-mono font-bold text-green-800 truncate">{coupon.coupon.code}</p>
                            <p className="text-xs text-green-600">-${coupon.discount.toFixed(2)}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveCoupon(coupon.coupon.code)}
                            className="ml-2 p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                            title="Remove coupon"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Available Coupons by Category - Dropdown Selection */}
                  {couponsData?.getCoupons && (() => {
                    const now = new Date();
                    const availableCoupons = couponsData.getCoupons.filter(c => {
                      const validFrom = new Date(c.validFrom);
                      const validTo = new Date(c.validTo);
                      const isActive = c.status?.toLowerCase() === 'active';
                      const isDateValid = now >= validFrom && now <= validTo;
                      const hasUsageLeft = !c.usageLimit || c.usedCount < c.usageLimit;
                      const notApplied = !appliedCoupons.some(ac => ac.coupon.id === c.id);
                      return isActive && isDateValid && hasUsageLeft && notApplied && c.type !== 'group_discount';
                    });

                    if (availableCoupons.length === 0) return null;

                    // Group by type
                    const couponsByType = {
                      discount_coupon: availableCoupons.filter(c => c.type === 'discount_coupon'),
                      promo_code: availableCoupons.filter(c => c.type === 'promo_code'),
                      shipping_coupon: availableCoupons.filter(c => c.type === 'shipping_coupon'),
                      additional_discount: availableCoupons.filter(c => c.type === 'additional_discount'),
                    };

                    const getTypeLabel = (type) => {
                      switch (type) {
                        case 'discount_coupon': return 'Discount';
                        case 'promo_code': return 'Promo';
                        case 'shipping_coupon': return 'Shipping';
                        case 'additional_discount': return 'Extra Discount';
                        default: return 'Other';
                      }
                    };

                    return (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 mb-2">Apply coupons:</p>
                        {Object.entries(couponsByType).map(([type, coupons]) => {
                          if (coupons.length === 0) return null;
                          return (
                            <div key={type}>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                {getTypeLabel(type)}
                              </label>
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleApplyCoupon(e.target.value);
                                    e.target.value = ''; // Reset dropdown after selection
                                  }
                                }}
                                disabled={validatingCoupon}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">-- Select {getTypeLabel(type)} --</option>
                                {coupons.map(coupon => (
                                  <option key={coupon.id} value={coupon.code}>
                                    {coupon.code} - {coupon.discountType === 'percentage' 
                                      ? `${coupon.discountValue}% OFF` 
                                      : `$${coupon.discountValue} OFF`
                                    }
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Price Breakdown */}
              {formData.lineItems.length > 0 && (
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
                  </div>
                  
                  {totalCouponDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">
                        Total Discount ({appliedCoupons.length} coupon{appliedCoupons.length !== 1 ? 's' : ''})
                      </span>
                      <span className="font-semibold text-green-600">-${totalCouponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between pt-3 border-t border-dashed border-gray-300">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-indigo-600">
                      ${Math.max(0, subtotal - totalCouponDiscount).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Client Info Summary */}
            {(formData.to.businessName || formData.to.email) && (
              <div className="px-5 pb-5">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    Client
                  </p>
                  <p className="font-semibold text-gray-900">{formData.to.businessName || 'Not specified'}</p>
                  <p className="text-sm text-gray-600">{formData.to.email || 'No email'}</p>
                </div>
              </div>
            )}

            {/* Quick Tips */}
            <div className="px-5 pb-5">
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-300">
                <p className="text-xs font-bold text-gray-800 mb-2">
                  Quick Tips
                </p>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>• Use "Save Draft" to save progress</li>
                  <li>• Customer account created on first send</li>
                  <li>• Apply coupons for discounts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

QuotationFormSimplified.displayName = 'QuotationFormSimplified';

export default QuotationFormSimplified;

