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

const GET_COMPANY_COUPONS = gql`
  query GetCompanyCoupons {
    getCoupons {
      id
      code
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
        
        // Re-validate and apply the coupon to restore appliedCoupon state
        // Use longer delay to ensure line items are fully loaded and formData is updated
        setTimeout(() => {
          handleApplyCoupon(quotation.couponCode);
        }, 1000); // Increased delay to ensure line items are loaded
      } else {
        // Clear coupon if not present
        setCouponCode('');
        setAppliedCoupon(null);
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
      
      // Different validation for Draft vs Send Email
      if (sendEmailFlag) {
        // STRICT VALIDATION FOR SENDING EMAIL
        // 1. Client Details Validation (Required)
        if (!formData.to.businessName?.trim()) {
          validationErrors.push('Client/Business name is required');
        }
        if (!formData.to.email?.trim()) {
          validationErrors.push('Client email is required');
        } else if (!formData.to.email.includes('@') || !formData.to.email.includes('.')) {
          validationErrors.push('Valid email address is required (e.g., client@example.com)');
        }
        
        // 2. Sales Person Validation (Recommended for sending)
        if (!selectedSalesPerson && !currentSalesPerson) {
          validationErrors.push('Sales person information is missing. Please select a sales person.');
        }
      } else {
        // RELAXED VALIDATION FOR DRAFT
        // Draft can be saved with minimal info
        console.log('[QuotationFormSimplified] 📝 Draft mode - relaxed validation');
      }
      
      // Common validation for both Draft and Send (Always required)
      // 1. Line Items Validation
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
          businessName: clientBusinessName || 'Draft Client',
          email: clientEmail || 'draft@placeholder.com',
          country: 'United States of America (USA)',
          phone: '',
          address: '',
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
        couponCode: appliedCoupon?.coupon?.code || '',
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
            setAppliedCoupon(null);
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
        if (firstError.includes('__typename')) {
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
      const groupIds = []; // You can extract group IDs from products if needed

      console.log('[CouponValidation] Starting validation...');
      console.log('[CouponValidation] Code:', codeToApply.toUpperCase());
      console.log('[CouponValidation] Subtotal:', subtotal);
      console.log('[CouponValidation] ProductIds:', productIds);

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
          setAppliedCoupon(data.validateCoupon);
          setCouponCode(data.validateCoupon.coupon.code);
          toast.success(`✅ Coupon "${data.validateCoupon.coupon.code}" applied! You save $${data.validateCoupon.discount.toFixed(2)}`);
        } else {
          setAppliedCoupon(null);
          toast.error(data.validateCoupon.error || 'Invalid coupon code');
        }
      } else {
        console.error('[CouponValidation] No data received');
        toast.error('Failed to validate coupon - no response from server');
        setAppliedCoupon(null);
      }
    } catch (error) {
      console.error('[CouponValidation] Exception:', error);
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
        optionValue: opt.value !== null && opt.value !== undefined ? String(opt.value) : '',
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

          {/* Existing Client Fields - Show when client is selected - Only Name and Email */}
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
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500 italic">
                  Note: Country, phone, and address can be updated in Customer Settings by the customer.
                </p>
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

        {/* Coupon Section - Playful Card Design */}
        {formData.lineItems.length > 0 && (
          <div className="border-t pt-6">
            {!appliedCoupon ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <span className="text-2xl mr-2">🎟️</span>
                    Available Coupons
                  </h3>
                  {validatingCoupon && (
                    <div className="flex items-center gap-2 text-orange-600">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm font-medium">Applying...</span>
                    </div>
                  )}
                </div>
                
                {/* Available Coupons Cards */}
                {(() => {
                  if (!couponsData?.getCoupons || couponsData.getCoupons.length === 0) {
                    return (
                      <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                        <div className="text-6xl mb-3">😔</div>
                        <p className="text-gray-600 font-medium">No coupons available</p>
                        <p className="text-sm text-gray-500 mt-1">Contact admin to create awesome deals!</p>
                      </div>
                    );
                  }
                  
                  const now = new Date();
                  const activeCoupons = couponsData.getCoupons.filter(c => {
                    const validFrom = new Date(c.validFrom);
                    const validTo = new Date(c.validTo);
                    const isActive = c.status?.toLowerCase() === 'active';
                    const isDateValid = now >= validFrom && now <= validTo;
                    const hasUsageLeft = !c.usageLimit || c.usedCount < c.usageLimit;
                    return isActive && isDateValid && hasUsageLeft;
                  });
                  
                  if (activeCoupons.length === 0) {
                    return (
                      <div className="relative bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-dashed border-yellow-300 rounded-xl p-8 text-center">
                        <div className="text-6xl mb-3">⏰</div>
                        <p className="text-yellow-800 font-medium">No active coupons right now</p>
                        <p className="text-sm text-yellow-600 mt-1">Check back later for amazing deals!</p>
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeCoupons.map((coupon, index) => (
                          <div
                            key={coupon.id}
                            onClick={() => handleApplyCoupon(coupon.code)}
                            className="group relative bg-gradient-to-br from-white to-orange-50 border-2 border-orange-200 rounded-xl p-4 cursor-pointer hover:border-orange-400 hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden"
                            style={{
                              animation: `fadeInUp 0.3s ease-out ${index * 0.1}s backwards`
                            }}
                          >
                            {/* Decorative circles */}
                            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-100 rounded-full -mr-10 -mt-10 opacity-50"></div>
                            <div className="absolute bottom-0 left-0 w-16 h-16 bg-yellow-100 rounded-full -ml-8 -mb-8 opacity-50"></div>
                            
                            {/* Coupon Content */}
                            <div className="relative z-10">
                              {/* Header */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">🎉</span>
                                  <span className="font-mono font-bold text-orange-600 text-lg bg-orange-100 px-3 py-1 rounded-lg shadow-sm">
                                    {coupon.code}
                                  </span>
                                </div>
                                <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                  {coupon.discountType === 'percentage' 
                                    ? `${coupon.discountValue}% OFF` 
                                    : `$${coupon.discountValue} OFF`
                                  }
                                </div>
                              </div>
                              
                              {/* Title & Description */}
                              <h4 className="text-base font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">
                                {coupon.name}
                              </h4>
                              {coupon.description && (
                                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{coupon.description}</p>
                              )}
                              
                              {/* Details */}
                              <div className="space-y-1 mb-3">
                                {coupon.minPurchase > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <span>💰</span>
                                    <span>Min. spend: ${coupon.minPurchase}</span>
                                  </div>
                                )}
                                {coupon.usageLimit && (
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <span>⏱️</span>
                                    <span>{coupon.usageLimit - coupon.usedCount} uses left</span>
                                  </div>
                                )}
                                {coupon.maxDiscount && (
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <span>🎯</span>
                                    <span>Max discount: ${coupon.maxDiscount}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Apply Button */}
                              <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 px-4 rounded-lg font-medium group-hover:from-orange-600 group-hover:to-orange-700 transition-all shadow-md">
                                <span>Click to Apply</span>
                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Helpful Tip */}
                      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-2xl mx-auto">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-blue-800">
                          <span className="font-semibold">Pro tip:</span> Just click any coupon card to apply it instantly! ✨
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              /* Applied Coupon Card */
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-green-700 flex items-center">
                    <span className="text-2xl mr-2">✅</span>
                    Coupon Applied!
                  </h3>
                </div>
                
                <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 shadow-lg overflow-hidden">
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-200 rounded-full -mr-16 -mt-16 opacity-30"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-200 rounded-full -ml-12 -mb-12 opacity-30"></div>
                  
                  {/* Confetti effect */}
                  <div className="absolute top-2 left-2 text-2xl animate-bounce">🎉</div>
                  <div className="absolute top-2 right-2 text-2xl animate-bounce" style={{animationDelay: '0.2s'}}>🎊</div>
                  <div className="absolute bottom-2 left-1/2 text-2xl animate-bounce" style={{animationDelay: '0.4s'}}>✨</div>
                  
                  <div className="relative z-10 flex items-start justify-between">
                    <div className="flex-1 pr-4">
                      {/* Code Badge */}
                      <div className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-md mb-3">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-mono font-bold text-lg">{appliedCoupon.coupon.code}</span>
                      </div>
                      
                      {/* Details */}
                      <h4 className="text-xl font-bold text-gray-900 mb-1">{appliedCoupon.coupon.name}</h4>
                      {appliedCoupon.coupon.description && (
                        <p className="text-sm text-gray-700 mb-3">{appliedCoupon.coupon.description}</p>
                      )}
                      
                      {/* Savings */}
                      <div className="bg-white rounded-lg p-3 inline-block shadow-sm border border-green-200">
                        <p className="text-sm text-gray-600 mb-1">You're saving</p>
                        <p className="text-2xl font-bold text-green-600">
                          ${appliedCoupon.discount.toFixed(2)}
                          {appliedCoupon.discountType === 'percentage' && (
                            <span className="text-sm ml-2 text-green-700">({appliedCoupon.discountValue}% off)</span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    {/* Remove Button */}
                    <button
                      onClick={handleRemoveCoupon}
                      className="flex-shrink-0 bg-red-500 hover:bg-red-600 text-white p-3 rounded-full transition-all hover:scale-110 shadow-lg"
                      title="Remove coupon"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Change Coupon Hint */}
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Want to try a different coupon? Remove this one and select another! 🔄
                </p>
              </div>
            )}
          </div>
        )}
        
        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

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
          {/* Save as Draft - Available in both create and edit mode */}
          <button
            onClick={() => handleSubmit(false)}
            disabled={isLoading}
            className="px-6 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {isSavingDraft ? 'Saving...' : isEditMode ? 'Update (No Email)' : 'Save as Draft'}
          </button>
          {/* Send Email - Available in both create and edit mode */}
          <button
            onClick={() => handleSubmit(true)}
            disabled={isLoading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {isLoading && !isSavingDraft ? 'Sending...' : isEditMode ? 'Update & Send Email' : 'Create & Send Email'}
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">📝 Important Information:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Quotation details (number, date) are auto-generated</li>
                <li>Your company information is auto-filled</li>
                <li><strong>"Save as Draft" / "Update (No Email)"</strong> - Saves changes without sending email. Customer will NOT be created on draft save.</li>
                <li><strong>"Create & Send Email" / "Update & Send Email"</strong> - Validates & sends email to client. Customer account created only on first send.</li>
                <li>All changes are tracked in quotation history</li>
                <li>Click on available coupons to apply them instantly!</li>
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

