'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { toast } from 'react-toastify';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import ProductSelectorModal from './ProductSelectorModal';
import SendQuotationEmailModal from './SendQuotationEmailModal';

const CREATE_QUOTATION = gql`
  mutation CreateQuotation($input: QuotationInput!) {
    createQuotation(input: $input) {
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
      totalAmount
      notes
      terms
      businessLogo
      status
      createdAt
      updatedAt
    }
  }
`;

const GET_ALL_QUOTATIONS = gql`
  query GetAllQuotations {
    getQuotations {
      id
      quotationNo
      quotationDate
      from {
        businessName
      }
      to {
        country
        businessName
        phone
        address
        email
      }
      status
    }
  }
`;

const GET_SALES_PERSONS = gql`
  query GetSalesPersons {
    getSalesPersons {
      id
      name
      phone
      email
      salesPersonId
      role
      companyName
      address
      photo
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

const QuotationForm = forwardRef(({ onQuotationCreated }, ref) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [originalQuotation, setOriginalQuotation] = useState(null);
  const [salesPersonSearchTerm, setSalesPersonSearchTerm] = useState('');
  const [salesPersonSearchResults, setSalesPersonSearchResults] = useState([]);
  const [showSalesPersonSearch, setShowSalesPersonSearch] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [showClientSearch, setShowClientSearch] = useState(false);

  const [formData, setFormData] = useState({
    quotationNo: '',
    quotationDate: new Date().toISOString().split('T')[0],
    from: {
      country: 'United States of America (USA)',
      businessName: '',
      phone: '+1',
      address: '',
      email: '',
      salesPersonName: '',
      salesPersonId: '',
    },
    to: {
      country: 'United States of America (USA)',
      businessName: '',
      phone: '+1',
      address: '',
      email: '',
    },
    currency: 'USD',
    lineItems: [],
    subtotal: 0,
    totalTax: 0,
    totalAmount: 0,
    notes: '',
    terms: '',
    businessLogo: '',
    status: 'draft',
  });

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingLineItemIndex, setEditingLineItemIndex] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const { data: productsData, loading: productsLoading, error: productsError } = useQuery(GET_PRODUCTS, {
    fetchPolicy: 'network-only', // Always fetch fresh data
  });
  const { data: allQuotationsData } = useQuery(GET_ALL_QUOTATIONS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: salesPersonsData } = useQuery(GET_SALES_PERSONS, {
    fetchPolicy: 'network-only',
  });
  const [createQuotation, { loading: creatingQuotation }] = useMutation(CREATE_QUOTATION);
  const [updateQuotation, { loading: updatingQuotation }] = useMutation(UPDATE_QUOTATION);
  const [getQuotation, { data: quotationData, loading: loadingQuotation }] = useLazyQuery(GET_QUOTATION, {
    fetchPolicy: 'network-only',
  });

  // Generate quotation number preview (actual number will be generated by backend)
  const generateQuotationNumber = () => {
    const date = new Date(formData.quotationDate || new Date());
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    // Generate a preview number - actual number will be set by backend
    // Format: QT-YYYYMMDD-XXXX (XXXX will be sequence number from backend)
    return `QT-${dateStr}-0001`;
  };

  // Update quotation number preview when date changes
  useEffect(() => {
    if (formData.quotationDate && !formData.quotationNo && !isEditMode) {
      const generatedNo = generateQuotationNumber();
      setFormData(prev => ({ ...prev, quotationNo: generatedNo }));
    }
  }, [formData.quotationDate, isEditMode]);

  // Load quotation data when fetched
  useEffect(() => {
    if (quotationData?.getQuotation && isEditMode) {
      const quotation = quotationData.getQuotation;
      setOriginalQuotation(JSON.parse(JSON.stringify(quotation))); // Deep copy
      
      setFormData({
        quotationNo: quotation.quotationNo,
        quotationDate: quotation.quotationDate ? quotation.quotationDate.split('T')[0] : new Date().toISOString().split('T')[0],
        dueDate: quotation.dueDate ? quotation.dueDate.split('T')[0] : '',
        from: quotation.from || {
          country: 'United States of America (USA)',
          businessName: '',
          phone: '+1',
          address: '',
          email: '',
          salesPersonName: '',
          salesPersonId: '',
        },
        to: quotation.to || {
          country: 'United States of America (USA)',
          businessName: '',
          phone: '+1',
          address: '',
          email: '',
        },
        currency: quotation.currency || 'USD',
        lineItems: quotation.lineItems || [],
        subtotal: quotation.subtotal || 0,
        totalTax: quotation.totalTax || 0,
        totalAmount: quotation.totalAmount || 0,
        notes: quotation.notes || '',
        terms: quotation.terms || '',
        businessLogo: quotation.businessLogo || '',
        status: quotation.status || 'draft',
      });
      
      if (quotation.businessLogo) {
        setLogoPreview(quotation.businessLogo);
      }
    }
  }, [quotationData, isEditMode]);

  // Search quotations
  useEffect(() => {
    if (allQuotationsData?.getQuotations && searchTerm) {
      const filtered = allQuotationsData.getQuotations.filter(q =>
        q.quotationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.from.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.to.businessName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 10)); // Limit to 10 results
      setShowSearchResults(filtered.length > 0);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchTerm, allQuotationsData]);

  // Search sales persons
  useEffect(() => {
    if (salesPersonsData?.getSalesPersons && salesPersonSearchTerm) {
      const filtered = salesPersonsData.getSalesPersons.filter(sp =>
        sp.name.toLowerCase().includes(salesPersonSearchTerm.toLowerCase()) ||
        sp.email.toLowerCase().includes(salesPersonSearchTerm.toLowerCase()) ||
        sp.salesPersonId.toLowerCase().includes(salesPersonSearchTerm.toLowerCase()) ||
        sp.companyName.toLowerCase().includes(salesPersonSearchTerm.toLowerCase())
      );
      setSalesPersonSearchResults(filtered.slice(0, 10)); // Limit to 10 results
    } else {
      setSalesPersonSearchResults([]);
    }
  }, [salesPersonSearchTerm, salesPersonsData]);

  // Search clients from existing quotations
  useEffect(() => {
    if (allQuotationsData?.getQuotations && clientSearchTerm) {
      // Extract unique clients from quotations
      const clientMap = new Map();
      allQuotationsData.getQuotations.forEach(q => {
        if (q.to && q.to.businessName) {
          const key = `${q.to.businessName}_${q.to.email || ''}`.toLowerCase();
          if (!clientMap.has(key)) {
            clientMap.set(key, q.to);
          }
        }
      });

      const clients = Array.from(clientMap.values());
      const filtered = clients.filter(client =>
        client.businessName?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
        client.phone?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
        client.address?.toLowerCase().includes(clientSearchTerm.toLowerCase())
      );
      setClientSearchResults(filtered.slice(0, 10)); // Limit to 10 results
    } else {
      setClientSearchResults([]);
    }
  }, [clientSearchTerm, allQuotationsData]);

  const handleSalesPersonSelect = (salesPerson) => {
    setFormData(prev => ({
      ...prev,
      from: {
        ...prev.from,
        businessName: salesPerson.companyName || prev.from.businessName,
        phone: salesPerson.phone || prev.from.phone,
        email: salesPerson.email || prev.from.email,
        address: salesPerson.address || prev.from.address,
        salesPersonName: salesPerson.name || '',
        salesPersonId: salesPerson.salesPersonId || '',
      },
    }));
    setSalesPersonSearchTerm('');
    setShowSalesPersonSearch(false);
    toast.success('Sales person information filled');
  };

  const handleClientSelect = (client) => {
    setFormData(prev => ({
      ...prev,
      to: {
        ...prev.to,
        country: client.country || prev.to.country,
        businessName: client.businessName || prev.to.businessName,
        phone: client.phone || prev.to.phone,
        address: client.address || prev.to.address,
        email: client.email || prev.to.email,
      },
    }));
    setClientSearchTerm('');
    setShowClientSearch(false);
    toast.success('Client information filled');
  };

  const handleSearchSelect = (quotation) => {
    setEditingQuotationId(quotation.id);
    setIsEditMode(true);
    setSearchTerm('');
    setShowSearchResults(false);
    getQuotation({ variables: { id: quotation.id } });
    toast.info('Loading quotation for editing...');
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingQuotationId(null);
    setOriginalQuotation(null);
    setSearchTerm('');
    setLogoPreview(null);
    // Reset form
    setFormData({
      quotationNo: '',
      quotationDate: new Date().toISOString().split('T')[0],
      from: {
        country: 'United States of America (USA)',
        businessName: '',
        phone: '+1',
        address: '',
        email: '',
        salesPersonName: '',
        salesPersonId: '',
      },
      to: {
        country: 'United States of America (USA)',
        businessName: '',
        phone: '+1',
        address: '',
        email: '',
      },
      currency: 'USD',
      lineItems: [],
      subtotal: 0,
      totalTax: 0,
      totalAmount: 0,
      notes: '',
      terms: '',
      businessLogo: '',
      status: 'draft',
    });
  };

  // Calculate totals whenever line items change
  useEffect(() => {
    calculateTotals();
  }, [formData.lineItems]);

  const calculateTotals = () => {
    let subtotal = 0;

    formData.lineItems.forEach(item => {
      subtotal += item.amount;
    });

    const totalAmount = subtotal;

    setFormData(prev => ({
      ...prev,
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalTax: 0,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
    }));
  };

  const handleInputChange = (section, field, value) => {
    if (section === 'main') {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        setFormData(prev => ({ ...prev, businessLogo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addLineItem = (product, selectedOptions = []) => {
    // Calculate price based on product and selected options
    let rate = product.basePrice ? product.basePrice.amount / 100 : 0;
    let isSubscription = product.billingMode === 'subscription';
    let subscriptionDetails = null;
    let subscriptionPrice = null;

    if (isSubscription && product.basePrice) {
      subscriptionDetails = {
        billingType: product.basePrice.billingType,
        interval: product.basePrice.interval,
        intervalCount: product.basePrice.intervalCount,
      };
      subscriptionPrice = parseFloat(rate.toFixed(2));
    }

    // Add prices from selected options
    selectedOptions.forEach(option => {
      if (option.price) {
        rate += option.price.amount / 100;
      }
    });

    const quantity = 1;
    const amount = rate * quantity;
    const total = amount; // No tax

    const newLineItem = {
      id: `item_${Date.now()}_${Math.random()}`,
      productId: product.id,
      itemName: product.name,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
      quantity: quantity,
      rate: parseFloat(rate.toFixed(2)),
      amount: parseFloat(amount.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      isSubscription: isSubscription,
      subscriptionDetails: subscriptionDetails,
      subscriptionPrice: subscriptionPrice,
      selectedOptions: selectedOptions.map(opt => ({
        attributeName: opt.attributeName,
        optionLabel: opt.label,
        optionValue: opt.value,
        price: opt.price ? opt.price.amount / 100 : 0,
      })),
    };

    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, newLineItem],
    }));

    setShowProductModal(false);
    toast.success('Product added to quotation');
  };

  const updateLineItem = (index, field, value) => {
    const updatedItems = [...formData.lineItems];
    const item = updatedItems[index];

    item[field] = parseFloat(value) || 0;

    // Recalculate amounts
    if (field === 'quantity' || field === 'rate') {
      item.amount = item.quantity * item.rate;
      item.total = item.amount; // No tax
    }

    setFormData(prev => ({
      ...prev,
      lineItems: updatedItems,
    }));
  };

  const removeLineItem = (index) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
    toast.info('Item removed from quotation');
  };

  const duplicateLineItem = (index) => {
    const itemToDuplicate = { ...formData.lineItems[index] };
    itemToDuplicate.id = `item_${Date.now()}_${Math.random()}`;
    
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, itemToDuplicate],
    }));
    toast.success('Item duplicated');
  };

  // Utility function to remove __typename from objects and arrays
  const removeTypename = (obj) => {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => removeTypename(item));
    }
    
    if (typeof obj === 'object') {
      const cleaned = {};
      for (const key in obj) {
        if (key !== '__typename') {
          cleaned[key] = removeTypename(obj[key]);
        }
      }
      return cleaned;
    }
    
    return obj;
  };

  // Prepare input data for mutation (removes __typename and ensures correct structure)
  const prepareInput = () => {
    return {
      quotationDate: formData.quotationDate,
      dueDate: formData.dueDate || null,
      from: removeTypename({
        country: formData.from.country,
        businessName: formData.from.businessName,
        phone: formData.from.phone,
        address: formData.from.address,
        email: formData.from.email,
        salesPersonName: formData.from.salesPersonName || undefined,
        salesPersonId: formData.from.salesPersonId || undefined,
      }),
      to: removeTypename({
        country: formData.to.country,
        businessName: formData.to.businessName,
        phone: formData.to.phone,
        address: formData.to.address,
        email: formData.to.email,
      }),
      currency: formData.currency,
      lineItems: formData.lineItems.map(item => removeTypename({
        id: item.id, // Preserve ID for change tracking
        productId: item.productId,
        itemName: item.itemName,
        description: item.description,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        total: item.total,
        isSubscription: item.isSubscription,
        subscriptionDetails: item.subscriptionDetails ? removeTypename(item.subscriptionDetails) : null,
        subscriptionPrice: item.subscriptionPrice,
        selectedOptions: item.selectedOptions ? item.selectedOptions.map(opt => removeTypename({
          attributeName: opt.attributeName,
          optionLabel: opt.optionLabel,
          optionValue: opt.optionValue,
          price: typeof opt.price === 'number' ? opt.price : (opt.price?.amount ? opt.price.amount / 100 : 0),
        })) : [],
      })),
      subtotal: formData.subtotal,
      totalTax: formData.totalTax,
      totalAmount: formData.totalAmount,
      notes: formData.notes,
      terms: formData.terms,
      businessLogo: formData.businessLogo,
    };
  };

  const handleSaveDraft = async () => {
    // Validation for draft - only business names required
    if (!formData.from.businessName) {
      toast.error('Please enter your business name');
      return;
    }

    if (!formData.to.businessName) {
      toast.error('Please enter client business name');
      return;
    }

    try {
      const input = {
        ...prepareInput(),
        status: 'draft',
      };

      if (isEditMode && editingQuotationId) {
        // Update existing quotation as draft
        const { data } = await updateQuotation({ 
          variables: { 
            id: editingQuotationId, 
            input 
          } 
        });
        
        if (data?.updateQuotation) {
          toast.success(`Quotation ${data.updateQuotation.quotationNo} saved as draft!`);
          
          // Callback to refresh list
          if (onQuotationCreated) {
            onQuotationCreated();
          }
          
          // Reset to create mode
          handleCancelEdit();
        }
      } else {
        // Create new quotation as draft
        const { data } = await createQuotation({ variables: { input } });
        
        if (data?.createQuotation) {
          toast.success(`Quotation ${data.createQuotation.quotationNo} saved as draft!`);
          
          // Callback to refresh list
          if (onQuotationCreated) {
            onQuotationCreated();
          }
          
          // Reset form
          setFormData({
            quotationNo: '',
            quotationDate: new Date().toISOString().split('T')[0],
            dueDate: '',
            from: {
              country: 'United States of America (USA)',
              businessName: '',
              phone: '+1',
              address: '',
              city: '',
              postalCode: '',
              state: '',
              email: '',
            },
            to: {
              country: 'United States of America (USA)',
              businessName: '',
              phone: '+1',
              address: '',
              city: '',
              postalCode: '',
              state: '',
              email: '',
            },
            currency: 'USD',
            lineItems: [],
            subtotal: 0,
            totalTax: 0,
            totalAmount: 0,
            notes: '',
            terms: '',
            businessLogo: '',
            status: 'draft',
          });
          setLogoPreview(null);
        }
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error(error.message || 'Failed to save draft');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.from.businessName) {
      toast.error('Please enter your business name');
      return;
    }

    if (!formData.to.businessName) {
      toast.error('Please enter client business name');
      return;
    }

    if (formData.lineItems.length === 0) {
      toast.error('Please add at least one item to the quotation');
      return;
    }

    // Open email modal instead of directly saving
    setShowEmailModal(true);
  };

  const handleCreateAndSendQuotation = async (emailBody) => {
    try {
      // First, create/update the quotation in the database
      const input = {
        ...prepareInput(),
        status: 'sent',
      };

      let quotationResult;
      if (isEditMode && editingQuotationId) {
        // Update existing quotation
        const { data } = await updateQuotation({ 
          variables: { 
            id: editingQuotationId, 
            input 
          } 
        });
        quotationResult = data?.updateQuotation;
      } else {
        // Create new quotation
        const { data } = await createQuotation({ variables: { input } });
        quotationResult = data?.createQuotation;
      }

      if (!quotationResult) {
        toast.error('Failed to save quotation');
        return;
      }

      // Prepare quotation data for email (use the saved quotation data)
      const quotationDataForEmail = {
        ...formData,
        quotationNo: quotationResult.quotationNo,
      };

      // Send email
      const response = await fetch('/api/send-quotation-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quotationData: quotationDataForEmail,
          emailBody: emailBody,
        }),
      });

      const emailResult = await response.json();

      if (emailResult.success) {
        toast.success(`Quotation ${quotationResult.quotationNo} created and sent successfully!`);
        
        // Callback to refresh list
        if (onQuotationCreated) {
          onQuotationCreated();
        }
        
        // Close modal and reset form
        setShowEmailModal(false);
        handleCancelEdit();
      } else {
        // Quotation was saved but email failed
        toast.warning(`Quotation ${quotationResult.quotationNo} saved, but email failed: ${emailResult.error || 'Unknown error'}`);
        
        // Still refresh and reset
        if (onQuotationCreated) {
          onQuotationCreated();
        }
        setShowEmailModal(false);
        handleCancelEdit();
      }
    } catch (error) {
      console.error('Error creating and sending quotation:', error);
      toast.error(error.message || 'Failed to create and send quotation');
    }
  };

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
  ];

  const getCurrentCurrencySymbol = () => {
    const currency = currencies.find(c => c.code === formData.currency);
    return currency ? currency.symbol : '$';
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Search Bar for Editing Quotations */}
          {!isEditMode && (
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search existing quotations to edit (by quotation number, business name)..."
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
                  {/* Search Results Dropdown */}
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((quotation) => (
                        <button
                          key={quotation.id}
                          type="button"
                          onClick={() => handleSearchSelect(quotation)}
                          className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-gray-900">{quotation.quotationNo}</div>
                              <div className="text-sm text-gray-600">
                                {quotation.from.businessName} → {quotation.to.businessName}
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              quotation.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                              quotation.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                              quotation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {quotation.status}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Edit Mode Indicator */}
          {isEditMode && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="font-medium text-yellow-800">Editing: {formData.quotationNo}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-yellow-700 hover:text-yellow-900 text-sm font-medium"
                >
                  Cancel Edit
                </button>
              </div>
            </div>
          )}

          {loadingQuotation && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-blue-700">Loading quotation...</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Header Section with Gradient Background */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 mb-8 shadow-lg">
              <div className="flex justify-between items-start">
                <div className="text-white">
                  <h2 className="text-3xl font-bold mb-2">Create Quotation</h2>
                  <p className="text-indigo-100 text-sm">Fill in the details below to create a new quotation</p>
                </div>
            <label className="cursor-pointer bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors backdrop-blur-sm">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <div className="w-32 h-32 border-2 border-white/30 rounded-lg flex items-center justify-center bg-white/10 backdrop-blur-sm">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Business Logo"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-center text-white">
                    <svg className="mx-auto h-10 w-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs">Add Logo</p>
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

            {/* Quotation Details Card */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Quotation Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quotation No<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.quotationNo || generateQuotationNumber()}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quotation Date<span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.quotationDate}
                onChange={(e) => handleInputChange('main', 'quotationDate', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date (optional)
              </label>
              <input
                type="date"
                value={formData.dueDate || ''}
                onChange={(e) => handleInputChange('main', 'dueDate', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
              />
            </div>
          </div>
        </div>

            {/* From and To Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quotation From */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Quotation From <span className="text-sm font-normal text-gray-500 ml-2">(Your Details)</span>
              </h3>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSalesPersonSearch(!showSalesPersonSearch)}
                  className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Search Sales Person</span>
                </button>
                {showSalesPersonSearch && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <div className="p-3 border-b border-gray-200">
                      <input
                        type="text"
                        placeholder="Search by name, email, ID, or company..."
                        value={salesPersonSearchTerm}
                        onChange={(e) => setSalesPersonSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {salesPersonSearchResults.length > 0 ? (
                        salesPersonSearchResults.map((sp) => (
                          <button
                            key={sp.id}
                            type="button"
                            onClick={() => handleSalesPersonSelect(sp)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex items-center space-x-3">
                              {sp.photo ? (
                                <img src={sp.photo} alt={sp.name} className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-500 text-sm font-medium">{sp.name.charAt(0).toUpperCase()}</span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">{sp.name}</div>
                                <div className="text-xs text-gray-500 truncate">{sp.email}</div>
                                <div className="text-xs text-gray-500">ID: {sp.salesPersonId} | {sp.companyName}</div>
                              </div>
                            </div>
                          </button>
                        ))
                      ) : salesPersonSearchTerm ? (
                        <div className="px-4 py-8 text-center text-gray-500 text-sm">
                          No sales persons found
                        </div>
                      ) : (
                        <div className="px-4 py-8 text-center text-gray-500 text-sm">
                          Start typing to search...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <select
                  value={formData.from.country}
                  onChange={(e) => handleInputChange('from', 'country', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option>United States of America (USA)</option>
                  <option>United Kingdom (UK)</option>
                  <option>Canada</option>
                  <option>Australia</option>
                  <option>Germany</option>
                  <option>France</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter your business name"
                  value={formData.from.businessName}
                  onChange={(e) => handleInputChange('from', 'businessName', e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <PhoneInput
                  international
                  defaultCountry="US"
                  value={formData.from.phone}
                  onChange={(value) => handleInputChange('from', 'phone', value || '')}
                  className="phone-input-wrapper"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  placeholder="Enter your address"
                  value={formData.from.address}
                  onChange={(e) => handleInputChange('from', 'address', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={formData.from.email}
                  onChange={(e) => handleInputChange('from', 'email', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sales Person Name</label>
                  <input
                    type="text"
                    placeholder="Sales person name"
                    value={formData.from.salesPersonName}
                    onChange={(e) => handleInputChange('from', 'salesPersonName', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sales Person ID</label>
                  <input
                    type="text"
                    placeholder="SP-0001"
                    value={formData.from.salesPersonId}
                    onChange={(e) => handleInputChange('from', 'salesPersonId', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quotation For */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Quotation For <span className="text-sm font-normal text-gray-500 ml-2">(Client's Details)</span>
              </h3>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowClientSearch(!showClientSearch)}
                  className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Search Client</span>
                </button>
                {showClientSearch && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <div className="p-3 border-b border-gray-200">
                      <input
                        type="text"
                        placeholder="Search by business name, email, phone, or address..."
                        value={clientSearchTerm}
                        onChange={(e) => setClientSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {clientSearchResults.length > 0 ? (
                        clientSearchResults.map((client, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleClientSelect(client)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <span className="text-indigo-600 text-sm font-medium">
                                  {client.businessName?.charAt(0).toUpperCase() || 'C'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">{client.businessName}</div>
                                {client.email && (
                                  <div className="text-xs text-gray-500 truncate">{client.email}</div>
                                )}
                                {client.phone && (
                                  <div className="text-xs text-gray-500">{client.phone}</div>
                                )}
                              </div>
                            </div>
                          </button>
                        ))
                      ) : clientSearchTerm ? (
                        <div className="px-4 py-8 text-center text-gray-500 text-sm">
                          No clients found
                        </div>
                      ) : (
                        <div className="px-4 py-8 text-center text-gray-500 text-sm">
                          Start typing to search...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <select
                  value={formData.to.country}
                  onChange={(e) => handleInputChange('to', 'country', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option>United States of America (USA)</option>
                  <option>United Kingdom (UK)</option>
                  <option>Canada</option>
                  <option>Australia</option>
                  <option>Germany</option>
                  <option>France</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Client's Business Name (required)"
                  value={formData.to.businessName}
                  onChange={(e) => handleInputChange('to', 'businessName', e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <PhoneInput
                  international
                  defaultCountry="US"
                  value={formData.to.phone}
                  onChange={(value) => handleInputChange('to', 'phone', value || '')}
                  className="phone-input-wrapper"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  placeholder="Address (optional)"
                  value={formData.to.address}
                  onChange={(e) => handleInputChange('to', 'address', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={formData.to.email}
                  onChange={(e) => handleInputChange('to', 'email', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        </div>

            {/* Currency Section */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Currency & Items
              </h3>
              <div className="flex items-center space-x-4">
                <div className="flex-1 max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency<span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleInputChange('main', 'currency', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    {currencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.name} ({currency.code}, {currency.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mb-8">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-indigo-600 text-white">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Item</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Quantity</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Rate</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Amount</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Total</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.lineItems.map((item, index) => (
                      <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-start space-x-3">
                            {/* Product Image */}
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.itemName}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900">{item.itemName}</div>
                              {item.description && (
                                <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                              )}
                              {item.isSubscription && (
                                <div className="mt-1 flex items-center space-x-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                    Subscription
                                  </span>
                                  {item.subscriptionPrice && (
                                    <span className="text-xs text-gray-600">
                                      {getCurrentCurrencySymbol()}{item.subscriptionPrice.toFixed(2)}/{item.subscriptionDetails?.interval || 'month'}
                                    </span>
                                  )}
                                </div>
                              )}
                              {item.selectedOptions && item.selectedOptions.length > 0 && (
                                <div className="mt-1 text-xs text-gray-600">
                                  {item.selectedOptions.map((opt, i) => (
                                    <div key={i}>• {opt.attributeName}: {opt.optionLabel}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center">
                            <span className="mr-1">{getCurrentCurrencySymbol()}</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.rate}
                              onChange={(e) => updateLineItem(index, 'rate', e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-900 font-medium">
                          {getCurrentCurrencySymbol()}{item.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-900 font-bold">
                          {getCurrentCurrencySymbol()}{item.total.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              type="button"
                              onClick={() => duplicateLineItem(index)}
                              className="text-indigo-600 hover:text-indigo-700"
                              title="Duplicate"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeLineItem(index)}
                              className="text-red-600 hover:text-red-700"
                              title="Remove"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add New Line Button */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowProductModal(true)}
                  className="inline-flex items-center px-4 py-2 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add New Item
                </button>
              </div>
            </div>

            {/* Summary Section */}
            <div className="flex justify-end mb-8">
              <div className="w-96 bg-gray-50 rounded-lg p-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-medium">{getCurrentCurrencySymbol()}{formData.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-3 flex justify-between text-lg font-bold text-gray-900">
                    <span>Total Amount:</span>
                    <span>{getCurrentCurrencySymbol()}{formData.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes and Terms */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('main', 'notes', e.target.value)}
                  rows="4"
                  placeholder="Add any additional notes here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terms & Conditions
                </label>
                <textarea
                  value={formData.terms}
                  onChange={(e) => handleInputChange('main', 'terms', e.target.value)}
                  rows="4"
                  placeholder="Add terms and conditions here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              {isEditMode && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all shadow-sm"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={creatingQuotation || updatingQuotation}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingQuotation || updatingQuotation ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="submit"
                disabled={creatingQuotation || updatingQuotation}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg hover:shadow-xl"
              >
                {creatingQuotation || updatingQuotation ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditMode ? 'Update Quotation' : 'Create Quotation'
                )}
              </button>
            </div>
          </form>

          {/* Debug info for products */}
          {productsError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">Error loading products: {productsError.message}</p>
            </div>
          )}
          {!productsLoading && productsData && productsData.getProducts && productsData.getProducts.length === 0 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-700 text-sm">No products found. Please create products first in the Catalogue section.</p>
            </div>
          )}

          {/* Product Selector Modal */}
          {showProductModal && (
            <ProductSelectorModal
              isOpen={showProductModal}
              onClose={() => setShowProductModal(false)}
              products={productsData?.getProducts || []}
              onSelectProduct={addLineItem}
              loading={productsLoading}
            />
          )}

          {/* Send Quotation Email Modal */}
          {showEmailModal && (
            <SendQuotationEmailModal
              isOpen={showEmailModal}
              onClose={() => setShowEmailModal(false)}
              quotationData={formData}
              onSend={handleCreateAndSendQuotation}
            />
          )}
        </div>
      </div>
    </div>
  );
});

QuotationForm.displayName = 'QuotationForm';

export default QuotationForm;

