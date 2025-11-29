'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { toast } from 'react-toastify';
import ProductPreview from './ProductPreview';
import ProductDetailModal from './ProductDetailModal';
import AddGroupModal from './AddGroupModal';

const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: ProductInput!) {
    createProduct(input: $input) {
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
      createdAt
    }
  }
`;

const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($id: ID!, $input: ProductInput!) {
    updateProduct(id: $id, input: $input) {
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
      createdAt
    }
  }
`;

const DELETE_PRODUCT = gql`
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id) {
      success
      message
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
      stripeProductId
      stripePriceId
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
        stripePriceId
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
            stripePriceId
          }
        }
      }
      createdAt
    }
  }
`;

const GET_GROUPS = gql`
  query GetGroups {
    getGroups {
      id
      name
      slug
      description
    }
  }
`;

const CREATE_GROUP = gql`
  mutation CreateGroup($name: String!, $slug: String, $description: String, $status: String) {
    createGroup(name: $name, slug: $slug, description: $description, status: $status) {
      id
      name
      slug
      description
      status
    }
  }
`;

export default function ProductForm() {
  const [activeTab, setActiveTab] = useState('add');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    imageFile: null,
    billingMode: 'subscription',
    subscriptionCycle: 'monthly',
    days: 1,
    basePrice: '',
    discount: '',
    groupId: '',
    groupName: '',
    attributes: [],
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null); // Store original product data for Stripe IDs
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductSearchResults, setShowProductSearchResults] = useState(false);
  const [imageInputMode, setImageInputMode] = useState('file'); // 'file' or 'url'
  const [validationErrors, setValidationErrors] = useState({});

  // GraphQL hooks
  const [createProduct] = useMutation(CREATE_PRODUCT);
  const [updateProduct] = useMutation(UPDATE_PRODUCT);
  const [deleteProduct] = useMutation(DELETE_PRODUCT);
  const [createGroup] = useMutation(CREATE_GROUP);

  // Load products and groups from API
  const { data: productsData, loading: productsLoading, refetch: refetchProducts } = useQuery(GET_PRODUCTS, {
    skip: false, // Always load products
  });

  const { data: groupsData, refetch: refetchGroups } = useQuery(GET_GROUPS);

  // Use products from GraphQL query (database)
  const savedProducts = productsData?.getProducts || [];
  const groups = groupsData?.getGroups || [];

  // Clear localStorage on mount to remove any old cached data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('savedProducts');
    }
  }, []);

  const [availableAttributes, setAvailableAttributes] = useState([
    { id: 'feat_1', name: 'Third Party API' },
    { id: 'feat_2', name: 'Payment Gateway' },
    { id: 'feat_3', name: 'Hosting' },
    { id: 'feat_4', name: 'SSL Certificate' },
    { id: 'feat_5', name: 'Email Support' },
  ]);

  // Validation helper functions
  const validateNumber = (value, min = null, max = null, allowDecimal = true) => {
    if (value === '' || value === null || value === undefined) return { valid: true, value: null };
    
    // Remove any non-numeric characters except decimal point
    let cleaned = String(value).replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // If decimal not allowed, remove decimal point
    if (!allowDecimal) {
      cleaned = cleaned.replace(/\./g, '');
    }
    
    const numValue = cleaned === '' ? null : (allowDecimal ? parseFloat(cleaned) : parseInt(cleaned));
    
    if (cleaned !== '' && (isNaN(numValue) || numValue === null)) {
      return { valid: false, value: null, error: 'Invalid number' };
    }
    
    if (numValue !== null) {
      if (min !== null && numValue < min) {
        return { valid: false, value: numValue, error: `Value must be at least ${min}` };
      }
      if (max !== null && numValue > max) {
        return { valid: false, value: numValue, error: `Value must be at most ${max}` };
      }
    }
    
    return { valid: true, value: cleaned === '' ? '' : numValue };
  };

  const validateURL = (url) => {
    if (!url || url.trim() === '') return { valid: true, value: '' };
    
    try {
      const urlObj = new URL(url);
      // Check if it's http or https
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, value: url, error: 'URL must start with http:// or https://' };
      }
      return { valid: true, value: url };
    } catch (e) {
      return { valid: false, value: url, error: 'Invalid URL format' };
    }
  };

  const validateRequired = (value, fieldName) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true };
  };

  const clearValidationError = (field) => {
    setValidationErrors(prev => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  const setValidationError = (field, message) => {
    setValidationErrors(prev => ({
      ...prev,
      [field]: message
    }));
  };

  const handleInputChange = (field, value) => {
    // Clear validation error for this field
    clearValidationError(field);
    
    // Apply validation based on field type
    let validatedValue = value;
    
    if (field === 'basePrice' || field === 'discount') {
      const result = validateNumber(value, 0, field === 'discount' ? 100 : null, true);
      if (!result.valid && result.error) {
        setValidationError(field, result.error);
      }
      validatedValue = result.value === null ? '' : result.value;
    } else if (field === 'days') {
      const result = validateNumber(value, 1, null, false);
      if (!result.valid && result.error) {
        setValidationError(field, result.error);
      }
      validatedValue = result.value === null ? 1 : result.value;
    } else if (field === 'imageUrl') {
      const result = validateURL(value);
      if (!result.valid && result.error) {
        setValidationError(field, result.error);
      }
      validatedValue = result.value;
    }
    
    setProductData(prev => ({ ...prev, [field]: validatedValue }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductData(prev => ({
          ...prev,
          imageUrl: reader.result,
          imageFile: file,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddAttribute = () => {
    const newAttribute = {
      id: `feat_${Date.now()}`,
      attributeId: '',
      attributeName: '',
      isMandatory: false,
      uiType: '', // No type selected by default
      // Type-specific configurations - all null by default
      slider: null,
      number_input: null,
      dropdown: null,
      checkbox: null,
      radio: null,
      displayOrder: productData.attributes.length + 1,
    };
    setProductData(prev => ({
      ...prev,
      attributes: [...prev.attributes, newAttribute],
    }));
  };

  const handleDeleteAttribute = (attributeId) => {
    setProductData(prev => ({
      ...prev,
      attributes: prev.attributes.filter(f => f.id !== attributeId),
    }));
  };

  const handleAttributeChange = (attributeId, field, value) => {
    setProductData(prev => ({
      ...prev,
      attributes: prev.attributes.map(f =>
        f.id === attributeId ? { ...f, [field]: value } : f
      ),
    }));
  };

  const handleAttributeTypeToggle = (attributeId, uiType, enabled) => {
    setProductData(prev => ({
      ...prev,
      attributes: prev.attributes.map(f => {
        if (f.id === attributeId) {
          const updated = { ...f };
          
          // Initialize type configs only if they don't exist (don't pre-initialize all)
          // Toggle the specific type
          if (uiType === 'slider') {
            updated.slider = enabled ? { value: 50, min: 0, max: 100, perUnitPrice: '', isSubscription: false, subscriptionCycle: 'monthly', days: 1 } : null;
          } else if (uiType === 'number_input') {
            updated.number_input = enabled ? { value: 0, perUnitPrice: '', isSubscription: false, subscriptionCycle: 'monthly', days: 1 } : null;
          } else if (uiType === 'dropdown') {
            updated.dropdown = enabled ? { options: [] } : null;
          } else if (uiType === 'checkbox') {
            updated.checkbox = enabled ? { options: [] } : null;
          } else if (uiType === 'radio') {
            updated.radio = enabled ? { options: [] } : null;
          }
          
          // Ensure other types remain null if not set
          if (updated.slider === undefined) updated.slider = null;
          if (updated.number_input === undefined) updated.number_input = null;
          if (updated.dropdown === undefined) updated.dropdown = null;
          if (updated.checkbox === undefined) updated.checkbox = null;
          if (updated.radio === undefined) updated.radio = null;
          
          // Set primary uiType to the first enabled type (for backward compatibility)
          const enabledTypes = [];
          if (updated.slider) enabledTypes.push('slider');
          if (updated.number_input) enabledTypes.push('number_input');
          if (updated.dropdown) enabledTypes.push('dropdown');
          if (updated.checkbox) enabledTypes.push('checkbox');
          if (updated.radio) enabledTypes.push('radio');
          
          updated.uiType = enabledTypes.length > 0 ? enabledTypes[0] : '';
          
          return updated;
        }
        return f;
      }),
    }));
  };

  const handleAttributeTypeValueChange = (attributeId, type, field, value) => {
    // Validate numeric fields for slider and number_input
    if ((type === 'slider' || type === 'number_input') && (field === 'value' || field === 'days')) {
      const result = validateNumber(value, field === 'days' ? 1 : 0, null, field === 'value' ? false : false);
      if (!result.valid && result.error) {
        console.warn(`Validation error for ${type}.${field}:`, result.error);
        // Still allow the value but log warning
      }
      value = result.value === null ? (field === 'days' ? 1 : 0) : result.value;
    }
    setProductData(prev => ({
      ...prev,
      attributes: prev.attributes.map(f => {
        if (f.id === attributeId) {
          return {
            ...f,
              [type]: {
              ...(f[type] || {}),
                [field]: value,
            },
          };
        }
        return f;
      }),
    }));
  };

  const handleAddOption = (attributeId, optionType) => {
    setProductData(prev => ({
      ...prev,
      attributes: prev.attributes.map(f => {
        if (f.id === attributeId) {
          const newOption = {
            id: `opt_${Date.now()}`,
            label: '',
            perUnitPrice: '',
            totalUnits: '',
            totalPrice: '',
            isSubscription: false,
            subscriptionCycle: 'monthly',
            days: 1,
          };
          return {
            ...f,
            [optionType]: {
              ...(f[optionType] || { options: [] }),
              options: [...(f[optionType]?.options || []), newOption],
            },
          };
        }
        return f;
      }),
    }));
  };

  const handleOptionChange = (attributeId, optionType, optionId, field, value) => {
    setProductData(prev => ({
      ...prev,
      attributes: prev.attributes.map(f => {
        if (f.id === attributeId) {
          const currentOptions = f[optionType]?.options || [];
          const updatedOptions = currentOptions.map(opt => {
            if (opt.id === optionId) {
              let validatedValue = value;
              
              // Validate numeric fields
              if (field === 'perUnitPrice') {
                const result = validateNumber(value, 0, null, true);
                validatedValue = result.value === null ? '' : (typeof result.value === 'number' ? `$${result.value.toFixed(2)}` : result.value);
                if (!result.valid && result.error) {
                  // Store error but don't block input
                  console.warn(`Validation error for ${field}:`, result.error);
                }
              } else if (field === 'totalUnits' || field === 'totalPrice') {
                const result = validateNumber(value, 0, null, true);
                validatedValue = result.value === null ? '' : result.value;
                if (!result.valid && result.error) {
                  console.warn(`Validation error for ${field}:`, result.error);
                }
              }
              
              const updated = { ...opt, [field]: validatedValue };
              
              // Calculate total if perUnitPrice and totalUnits are both set
              if (field === 'perUnitPrice' || field === 'totalUnits') {
                const perUnitStr = updated.perUnitPrice?.replace(/[^0-9.]/g, '') || '0';
                const perUnit = parseFloat(perUnitStr) || 0;
                const units = parseFloat(updated.totalUnits) || 0;
                updated.totalPrice = (perUnit * units).toFixed(2);
              }
              
              return updated;
            }
            return opt;
          });
          return {
            ...f,
            [optionType]: {
              ...(f[optionType] || {}),
                options: updatedOptions,
            },
          };
        }
        return f;
      }),
    }));
  };

  const handleDeleteOption = (attributeId, optionType, optionId) => {
    setProductData(prev => ({
      ...prev,
      attributes: prev.attributes.map(f => {
        if (f.id === attributeId) {
          const currentOptions = f[optionType]?.options || [];
          return {
            ...f,
            [optionType]: {
              ...(f[optionType] || {}),
              options: currentOptions.filter(opt => opt.id !== optionId),
            },
          };
        }
        return f;
      }),
    }));
  };

  const handleAddGroupClick = () => {
    // Open modal with the current search term as initial name
    setShowAddGroupModal(true);
  };

  const handleAddGroup = async (groupData) => {
    try {
      setError('');
      const result = await createGroup({
        variables: {
          name: groupData.name.trim(),
          slug: groupData.slug.trim(),
          description: groupData.description || '',
          status: groupData.status || 'active',
        },
      });
      const newGroup = result.data.createGroup;
      await refetchGroups();
      setProductData(prev => ({
        ...prev,
        groupId: newGroup.id,
        groupName: newGroup.name,
      }));
      setGroupSearchTerm('');
      setShowGroupDropdown(false);
      toast.success('Group created successfully!');
    } catch (err) {
      const errorMessage = err.message || 'Failed to create group';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err; // Re-throw so modal can handle it
    }
  };

  const handleGroupSelect = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setProductData(prev => ({
        ...prev,
        groupId: group.id,
        groupName: group.name,
      }));
    }
  };

  // Convert database product format back to form format
  const convertProductToFormData = (product) => {
    if (!product) return null;

    // Extract subscription cycle from basePrice
    let subscriptionCycle = 'monthly';
    let days = 1;
    if (product.basePrice) {
      if (product.basePrice.interval === 'day') {
        subscriptionCycle = 'days';
        days = product.basePrice.intervalCount || 1;
      } else if (product.basePrice.interval === 'month') {
        if (product.basePrice.intervalCount === 3) {
          subscriptionCycle = 'quarterly';
        } else {
          subscriptionCycle = 'monthly';
        }
      } else if (product.basePrice.interval === 'year') {
        subscriptionCycle = 'yearly';
      }
    }

    // Convert attributes from database format to form format
    const convertedAttributes = (product.attributes || []).map((attr) => {
      const uiType = attr.uiType || 'dropdown';
      const formAttr = {
        id: `feat_${Date.now()}_${Math.random()}`,
        attributeId: attr.id,
        attributeName: attr.name || '',
        isMandatory: attr.isMandatory || false,
        uiType: uiType,
        displayOrder: attr.order || 0,
        // Initialize all type-specific configs as null
        slider: null,
        number_input: null,
        dropdown: null,
        checkbox: null,
        radio: null,
      };

      // Convert options based on uiType
      if (uiType === 'dropdown' && attr.options && attr.options.length > 0) {
        formAttr.dropdown = {
          enabled: true, // Set enabled flag
          options: attr.options.map((opt) => {
            const priceAmount = opt.price?.amount ? (opt.price.amount / 100) : 0;
            const isSubscription = opt.price?.billingType === 'recurring';
            let optSubscriptionCycle = 'monthly';
            let optDays = 1;
            
            if (opt.price?.interval === 'day') {
              optSubscriptionCycle = 'days';
              optDays = opt.price.intervalCount || 1;
            } else if (opt.price?.interval === 'month') {
              if (opt.price.intervalCount === 3) {
                optSubscriptionCycle = 'quarterly';
              } else {
                optSubscriptionCycle = 'monthly';
              }
            } else if (opt.price?.interval === 'year') {
              optSubscriptionCycle = 'yearly';
            }

            return {
              id: opt.id || `opt_${Date.now()}`,
              label: opt.label || '',
              perUnitPrice: `$${priceAmount.toFixed(2)}`,
              totalUnits: '1',
              totalPrice: priceAmount.toFixed(2),
              isSubscription: isSubscription,
              subscriptionCycle: optSubscriptionCycle,
              days: optDays,
              defaultSelected: opt.defaultSelected || false,
            };
          }),
        };
      } else if (uiType === 'checkbox' && attr.options && attr.options.length > 0) {
        formAttr.checkbox = {
          enabled: true, // Set enabled flag
          options: attr.options.map((opt) => {
            const priceAmount = opt.price?.amount ? (opt.price.amount / 100) : 0;
            const isSubscription = opt.price?.billingType === 'recurring';
            let optSubscriptionCycle = 'monthly';
            let optDays = 1;
            
            if (opt.price?.interval === 'day') {
              optSubscriptionCycle = 'days';
              optDays = opt.price.intervalCount || 1;
            } else if (opt.price?.interval === 'month') {
              if (opt.price.intervalCount === 3) {
                optSubscriptionCycle = 'quarterly';
              } else {
                optSubscriptionCycle = 'monthly';
              }
            } else if (opt.price?.interval === 'year') {
              optSubscriptionCycle = 'yearly';
            }

            return {
              id: opt.id || `opt_${Date.now()}`,
              label: opt.label || '',
              perUnitPrice: `$${priceAmount.toFixed(2)}`,
              totalUnits: '1',
              totalPrice: priceAmount.toFixed(2),
              isSubscription: isSubscription,
              subscriptionCycle: optSubscriptionCycle,
              days: optDays,
              defaultSelected: opt.defaultSelected || false,
            };
          }),
        };
      } else if (uiType === 'radio' && attr.options && attr.options.length > 0) {
        formAttr.radio = {
          enabled: true, // Set enabled flag
          options: attr.options.map((opt) => {
            const priceAmount = opt.price?.amount ? (opt.price.amount / 100) : 0;
            const isSubscription = opt.price?.billingType === 'recurring';
            let optSubscriptionCycle = 'monthly';
            let optDays = 1;
            
            if (opt.price?.interval === 'day') {
              optSubscriptionCycle = 'days';
              optDays = opt.price.intervalCount || 1;
            } else if (opt.price?.interval === 'month') {
              if (opt.price.intervalCount === 3) {
                optSubscriptionCycle = 'quarterly';
              } else {
                optSubscriptionCycle = 'monthly';
              }
            } else if (opt.price?.interval === 'year') {
              optSubscriptionCycle = 'yearly';
            }

            return {
              id: opt.id || `opt_${Date.now()}`,
              label: opt.label || '',
              perUnitPrice: `$${priceAmount.toFixed(2)}`,
              totalUnits: '1',
              totalPrice: priceAmount.toFixed(2),
              isSubscription: isSubscription,
              subscriptionCycle: optSubscriptionCycle,
              days: optDays,
              defaultSelected: opt.defaultSelected || false,
            };
          }),
        };
      } else if (uiType === 'slider') {
        // For slider, extract from first option if available
        const firstOpt = attr.options?.[0];
        if (firstOpt) {
          const priceAmount = firstOpt.price?.amount ? (firstOpt.price.amount / 100) : 0;
          const isSubscription = firstOpt.price?.billingType === 'recurring';
          let optSubscriptionCycle = 'monthly';
          let optDays = 1;
          
          if (firstOpt.price?.interval === 'day') {
            optSubscriptionCycle = 'days';
            optDays = firstOpt.price.intervalCount || 1;
          } else if (firstOpt.price?.interval === 'month') {
            if (firstOpt.price.intervalCount === 3) {
              optSubscriptionCycle = 'quarterly';
            } else {
              optSubscriptionCycle = 'monthly';
            }
          } else if (firstOpt.price?.interval === 'year') {
            optSubscriptionCycle = 'yearly';
          }

          formAttr.slider = {
            enabled: true, // Set enabled flag
            min: 0,
            max: 100,
            value: 50,
            perUnitPrice: `$${priceAmount.toFixed(2)}`,
            isSubscription: isSubscription,
            subscriptionCycle: optSubscriptionCycle,
            days: optDays,
          };
        }
      } else if (uiType === 'number_input') {
        // For number input, extract from first option if available
        const firstOpt = attr.options?.[0];
        if (firstOpt) {
          const priceAmount = firstOpt.price?.amount ? (firstOpt.price.amount / 100) : 0;
          const isSubscription = firstOpt.price?.billingType === 'recurring';
          let optSubscriptionCycle = 'monthly';
          let optDays = 1;
          
          if (firstOpt.price?.interval === 'day') {
            optSubscriptionCycle = 'days';
            optDays = firstOpt.price.intervalCount || 1;
          } else if (firstOpt.price?.interval === 'month') {
            if (firstOpt.price.intervalCount === 3) {
              optSubscriptionCycle = 'quarterly';
            } else {
              optSubscriptionCycle = 'monthly';
            }
          } else if (firstOpt.price?.interval === 'year') {
            optSubscriptionCycle = 'yearly';
          }

          formAttr.number_input = {
            enabled: true, // Set enabled flag
            min: 0,
            max: 1000,
            value: 0,
            perUnitPrice: `$${priceAmount.toFixed(2)}`,
            isSubscription: isSubscription,
            subscriptionCycle: optSubscriptionCycle,
            days: optDays,
          };
        }
      }

      return formAttr;
    });

    return {
      name: product.name || '',
      description: product.description || '',
      imageUrl: product.imageUrl || product.image || '',
      imageFile: null,
      billingMode: product.billingMode || (product.basePrice?.billingType === 'recurring' ? 'subscription' : 'one-time'),
      subscriptionCycle: subscriptionCycle,
      days: days,
      basePrice: product.basePrice ? `$${(product.basePrice.amount / 100).toFixed(2)}` : '',
      discount: product.discount ? product.discount.toString() : '',
      groupId: product.groupId || product.group?.id || '',
      groupName: product.group?.name || '',
      attributes: convertedAttributes,
    };
  };

  // Handle product selection from search
  const handleProductSelect = (product) => {
    const formData = convertProductToFormData(product);
    if (formData) {
      setProductData(formData);
      setEditingProductId(product.id);
      setEditingProduct(product); // Store original product for Stripe IDs
      setProductSearchTerm('');
      setShowProductSearchResults(false);
    }
  };

  // Handle clear/new product
  const handleNewProduct = () => {
    setProductData({
      name: '',
      description: '',
      imageUrl: '',
      imageFile: null,
      billingMode: 'subscription',
      subscriptionCycle: 'monthly',
      days: 1,
      basePrice: '',
      discount: '',
      groupId: '',
      groupName: '',
      attributes: [],
    });
    setEditingProductId(null);
    setEditingProduct(null); // Clear original product data
    setProductSearchTerm('');
    setShowProductSearchResults(false);
  };

  // Filter products for search
  const filteredProducts = savedProducts.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProductSearchResults && !event.target.closest('.product-search-container')) {
        setShowProductSearchResults(false);
      }
    };

    if (showProductSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showProductSearchResults]);

  // Convert frontend attribute structure to GraphQL input format
  const convertAttributesToInput = (attributes) => {
    return attributes.map((attr) => {
      const uiType = attr.uiType || 'dropdown';
      let options = [];
      
      // Convert options based on uiType
      if (uiType === 'dropdown' && attr.dropdown?.options) {
        options = attr.dropdown.options.map((opt) => {
          const isSubscription = opt.isSubscription || false;
          const subscriptionCycle = opt.subscriptionCycle || 'monthly';
          const days = opt.days || 1;
          return {
          label: opt.label || 'Unnamed Option',
          value: opt.label?.toLowerCase().replace(/\s+/g, '_') || `option_${Date.now()}`,
          description: opt.description || '',
          price: {
            amount: parseFloat(opt.perUnitPrice?.replace(/[^0-9.]/g, '') || 0) * 100, // Convert to cents
            currency: 'usd',
              billingType: isSubscription ? 'recurring' : 'one_time',
              interval: isSubscription ? (subscriptionCycle === 'days' ? 'day' : 
                        subscriptionCycle === 'monthly' ? 'month' : 
                        subscriptionCycle === 'quarterly' ? 'month' : 
                        subscriptionCycle === 'yearly' ? 'year' : 'month') : undefined,
              intervalCount: subscriptionCycle === 'days' ? days : (subscriptionCycle === 'quarterly' ? 3 : 1),
            nickname: `${opt.label} - ${opt.perUnitPrice || '$0'}`,
          },
          defaultSelected: false,
          order: 0,
          };
        });
      } else if (uiType === 'checkbox' && attr.checkbox?.options) {
        options = attr.checkbox.options.map((opt) => {
          const isSubscription = opt.isSubscription || false;
          const subscriptionCycle = opt.subscriptionCycle || 'monthly';
          const days = opt.days || 1;
          return {
            label: opt.label || 'Unnamed Option',
            value: opt.label?.toLowerCase().replace(/\s+/g, '_') || `option_${Date.now()}`,
            description: opt.description || '',
            price: {
              amount: parseFloat(opt.perUnitPrice?.replace(/[^0-9.]/g, '') || 0) * 100,
              currency: 'usd',
              billingType: isSubscription ? 'recurring' : 'one_time',
              interval: isSubscription ? (subscriptionCycle === 'days' ? 'day' : 
                        subscriptionCycle === 'monthly' ? 'month' : 
                        subscriptionCycle === 'quarterly' ? 'month' : 
                        subscriptionCycle === 'yearly' ? 'year' : 'month') : undefined,
              intervalCount: subscriptionCycle === 'days' ? days : (subscriptionCycle === 'quarterly' ? 3 : 1),
              nickname: `${opt.label} - ${opt.perUnitPrice || '$0'}`,
            },
            defaultSelected: false,
            order: 0,
          };
        });
      } else if (uiType === 'radio' && attr.radio?.options) {
        options = attr.radio.options.map((opt) => {
          const isSubscription = opt.isSubscription || false;
          const subscriptionCycle = opt.subscriptionCycle || 'monthly';
          const days = opt.days || 1;
          return {
            label: opt.label || 'Unnamed Option',
            value: opt.label?.toLowerCase().replace(/\s+/g, '_') || `option_${Date.now()}`,
            description: opt.description || '',
            price: {
              amount: parseFloat(opt.perUnitPrice?.replace(/[^0-9.]/g, '') || 0) * 100,
              currency: 'usd',
              billingType: isSubscription ? 'recurring' : 'one_time',
              interval: isSubscription ? (subscriptionCycle === 'days' ? 'day' : 
                        subscriptionCycle === 'monthly' ? 'month' : 
                        subscriptionCycle === 'quarterly' ? 'month' : 
                        subscriptionCycle === 'yearly' ? 'year' : 'month') : undefined,
              intervalCount: subscriptionCycle === 'days' ? days : (subscriptionCycle === 'quarterly' ? 3 : 1),
              nickname: `${opt.label} - ${opt.perUnitPrice || '$0'}`,
            },
            defaultSelected: false,
            order: 0,
          };
        });
      } else if (uiType === 'slider' && attr.slider) {
        // For slider, create a single option representing the slider
        const sliderValue = attr.slider.value || 50;
        const perUnitPrice = parseFloat(attr.slider.perUnitPrice?.replace(/[^0-9.]/g, '') || 0);
        const isSubscription = attr.slider.isSubscription || false;
        const subscriptionCycle = attr.slider.subscriptionCycle || 'monthly';
        const days = attr.slider.days || 1;
        options = [{
          label: `${attr.attributeName} - ${sliderValue}`,
          value: `slider_${sliderValue}`,
          description: attr.slider.description || `Slider value: ${sliderValue}`,
          price: {
            amount: (perUnitPrice * sliderValue) * 100, // Convert to cents
            currency: 'usd',
            billingType: isSubscription ? 'recurring' : 'one_time',
            interval: isSubscription ? (subscriptionCycle === 'days' ? 'day' : 
                      subscriptionCycle === 'monthly' ? 'month' : 
                      subscriptionCycle === 'quarterly' ? 'month' : 
                      subscriptionCycle === 'yearly' ? 'year' : 'month') : undefined,
            intervalCount: subscriptionCycle === 'days' ? days : (subscriptionCycle === 'quarterly' ? 3 : 1),
            nickname: `${attr.attributeName} Slider`,
          },
          defaultSelected: false,
          order: 0,
        }];
      } else if (uiType === 'number_input' && attr.number_input) {
        // For number input, create a single option
        const numberValue = attr.number_input.value || 0;
        const perUnitPrice = parseFloat(attr.number_input.perUnitPrice?.replace(/[^0-9.]/g, '') || 0);
        const isSubscription = attr.number_input.isSubscription || false;
        const subscriptionCycle = attr.number_input.subscriptionCycle || 'monthly';
        const days = attr.number_input.days || 1;
        options = [{
          label: `${attr.attributeName} - ${numberValue} units`,
          value: `number_${numberValue}`,
          description: attr.number_input.description || `Quantity: ${numberValue}`,
          price: {
            amount: (perUnitPrice * numberValue) * 100, // Convert to cents
            currency: 'usd',
            billingType: isSubscription ? 'recurring' : 'one_time',
            interval: isSubscription ? (subscriptionCycle === 'days' ? 'day' : 
                      subscriptionCycle === 'monthly' ? 'month' : 
                      subscriptionCycle === 'quarterly' ? 'month' : 
                      subscriptionCycle === 'yearly' ? 'year' : 'month') : undefined,
            intervalCount: subscriptionCycle === 'days' ? days : (subscriptionCycle === 'quarterly' ? 3 : 1),
            nickname: `${attr.attributeName} Number`,
          },
          defaultSelected: false,
          order: 0,
        }];
      }

      // If no options, create a default zero-price option
      if (options.length === 0) {
        options = [{
          label: attr.attributeName || 'Default',
          value: 'default',
          description: '',
          price: {
            amount: 0,
            currency: 'usd',
            billingType: 'one_time',
            nickname: `${attr.attributeName} - Included`,
          },
          defaultSelected: true,
          order: 0,
        }];
      }

      return {
        name: attr.attributeName || 'Unnamed Attribute',
        description: '',
        uiType,
        isMandatory: attr.isMandatory || false,
        options,
        order: attr.displayOrder || 0,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});
    setLoading(true);

    try {
      // Validate required fields
      const nameValidation = validateRequired(productData.name, 'Product name');
      if (!nameValidation.valid) {
        setValidationError('name', nameValidation.error);
        throw new Error(nameValidation.error);
      }

      const groupValidation = validateRequired(productData.groupId, 'Product group');
      if (!groupValidation.valid) {
        setValidationError('groupId', groupValidation.error);
        throw new Error(groupValidation.error);
      }

      // Validate base price
      if (!productData.basePrice || productData.basePrice === '') {
        setValidationError('basePrice', 'Base price is required');
        throw new Error('Base price is required');
      }
      
      const basePriceNum = typeof productData.basePrice === 'string' 
        ? parseFloat(productData.basePrice.replace(/[^0-9.]/g, '')) 
        : parseFloat(productData.basePrice);
      
      if (isNaN(basePriceNum) || basePriceNum <= 0) {
        setValidationError('basePrice', 'Base price must be a valid number greater than 0');
        throw new Error('Base price must be a valid number greater than 0');
      }

      // Validate discount if provided
      if (productData.discount && productData.discount !== '') {
        const discountNum = typeof productData.discount === 'string' 
          ? parseFloat(productData.discount.replace(/[^0-9.]/g, '')) 
          : parseFloat(productData.discount);
        
        if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
          setValidationError('discount', 'Discount must be a number between 0 and 100');
          throw new Error('Discount must be a number between 0 and 100');
        }
      }

      // Validate days if subscription cycle is 'days'
      if (productData.billingMode === 'subscription' && productData.subscriptionCycle === 'days') {
        const daysNum = parseInt(productData.days) || 0;
        if (daysNum < 1) {
          setValidationError('days', 'Number of days must be at least 1');
          throw new Error('Number of days must be at least 1');
        }
      }

      // Validate image URL if provided
      if (imageInputMode === 'url' && productData.imageUrl) {
        const urlValidation = validateURL(productData.imageUrl);
        if (!urlValidation.valid) {
          setValidationError('imageUrl', urlValidation.error);
          throw new Error(urlValidation.error);
        }
      }

      // Validate attributes
      for (let i = 0; i < productData.attributes.length; i++) {
        const attr = productData.attributes[i];
        
        // Validate attribute name
        if (!attr.attributeName || attr.attributeName.trim() === '') {
          throw new Error(`Attribute ${i + 1}: Attribute name is required`);
        }

        // Validate based on enabled types
        const enabledTypes = [];
        if (attr.dropdown?.enabled) enabledTypes.push('dropdown');
        if (attr.checkbox?.enabled) enabledTypes.push('checkbox');
        if (attr.radio?.enabled) enabledTypes.push('radio');
        if (attr.slider?.enabled) enabledTypes.push('slider');
        if (attr.number_input?.enabled) enabledTypes.push('number_input');

        // Also check if uiType is set (for backwards compatibility with database format)
        if (attr.uiType) {
          if (!enabledTypes.includes(attr.uiType)) {
            enabledTypes.push(attr.uiType);
          }
        }

        if (enabledTypes.length === 0) {
          throw new Error(`Attribute "${attr.attributeName}": At least one type (dropdown, checkbox, radio, slider, or number input) must be enabled`);
        }

        // Validate options for dropdown, checkbox, radio
        for (const type of ['dropdown', 'checkbox', 'radio']) {
          if (attr[type]?.enabled && attr[type]?.options) {
            if (attr[type].options.length === 0) {
              throw new Error(`Attribute "${attr.attributeName}": ${type} requires at least one option`);
            }
            
            for (let j = 0; j < attr[type].options.length; j++) {
              const option = attr[type].options[j];
              
              if (!option.label || option.label.trim() === '') {
                throw new Error(`Attribute "${attr.attributeName}": ${type} option ${j + 1} label is required`);
              }
              
              // Validate per unit price
              if (option.perUnitPrice) {
                const priceStr = option.perUnitPrice.replace(/[^0-9.]/g, '');
                const priceNum = parseFloat(priceStr);
                if (isNaN(priceNum) || priceNum < 0) {
                  throw new Error(`Attribute "${attr.attributeName}": ${type} option "${option.label}" has invalid per unit price`);
                }
              }
              
              // Validate total units
              if (option.totalUnits) {
                const unitsNum = parseFloat(option.totalUnits);
                if (isNaN(unitsNum) || unitsNum < 0) {
                  throw new Error(`Attribute "${attr.attributeName}": ${type} option "${option.label}" has invalid total units`);
                }
              }
            }
          }
        }

        // Validate slider values
        if (attr.slider?.enabled) {
          if (attr.slider.value !== undefined && attr.slider.value !== null && attr.slider.value !== '') {
            const sliderValue = parseInt(attr.slider.value);
            if (isNaN(sliderValue) || sliderValue < 0) {
              throw new Error(`Attribute "${attr.attributeName}": Slider value must be a valid non-negative number`);
            }
          }
          if (attr.slider.days !== undefined && attr.slider.days !== null && attr.slider.days !== '') {
            const sliderDays = parseInt(attr.slider.days);
            if (isNaN(sliderDays) || sliderDays < 1) {
              throw new Error(`Attribute "${attr.attributeName}": Slider days must be at least 1`);
            }
          }
        }

        // Validate number input values
        if (attr.number_input?.enabled) {
          if (attr.number_input.value !== undefined && attr.number_input.value !== null && attr.number_input.value !== '') {
            const numValue = parseInt(attr.number_input.value);
            if (isNaN(numValue) || numValue < 0) {
              throw new Error(`Attribute "${attr.attributeName}": Number input value must be a valid non-negative number`);
            }
          }
          if (attr.number_input.days !== undefined && attr.number_input.days !== null && attr.number_input.days !== '') {
            const numDays = parseInt(attr.number_input.days);
            if (isNaN(numDays) || numDays < 1) {
              throw new Error(`Attribute "${attr.attributeName}": Number input days must be at least 1`);
            }
          }
        }
      }

      // Convert basePrice to PriceInput
      let basePriceInput = null;
      // Handle basePrice - it might be string, number, or object
      let basePriceAmount = 0;
      if (productData.basePrice) {
        if (typeof productData.basePrice === 'string') {
          // If string (like "$50.00"), remove non-numeric characters
          basePriceAmount = parseFloat(productData.basePrice.replace(/[^0-9.]/g, '')) || 0;
        } else if (typeof productData.basePrice === 'number') {
          // If already a number, use directly
          basePriceAmount = productData.basePrice;
        } else if (typeof productData.basePrice === 'object' && productData.basePrice !== null) {
          // If object, it might be a Price object with amount field
          basePriceAmount = productData.basePrice.amount ? (productData.basePrice.amount / 100) : 0;
        }
      }
      const productDays = productData.days || 1;
      if (basePriceAmount > 0) {
        basePriceInput = {
          amount: basePriceAmount * 100, // Convert to cents
          currency: 'usd',
          billingType: productData.billingMode === 'subscription' ? 'recurring' : 'one_time',
          interval: productData.billingMode === 'subscription' ? 
                    (productData.subscriptionCycle === 'days' ? 'day' : 
                     productData.subscriptionCycle === 'monthly' ? 'month' : 
                     productData.subscriptionCycle === 'quarterly' ? 'month' : 
                     productData.subscriptionCycle === 'yearly' ? 'year' : 'month') : undefined,
          intervalCount: productData.subscriptionCycle === 'days' ? productDays : (productData.subscriptionCycle === 'quarterly' ? 3 : 1),
          nickname: `${productData.name} - Base Price`,
        };
      }

      // Convert attributes
      const attributesInput = convertAttributesToInput(productData.attributes);

      // Prepare product input
      const productInput = {
        name: productData.name.trim(),
        description: productData.description || '',
        imageUrl: productData.imageUrl || '',
        groupId: productData.groupId,
        basePrice: basePriceInput,
        discount: productData.discount ? parseFloat(productData.discount) : null,
        billingMode: productData.billingMode,
        attributes: attributesInput,
        tags: [],
      };

      // Update or create product
      if (editingProductId) {
        // Update existing product
        await updateProduct({
          variables: { 
            id: editingProductId,
            input: productInput 
          },
        });
        toast.success('Product updated successfully!');
      } else {
        // Create new product
        await createProduct({
          variables: { input: productInput },
        });
        toast.success('Product saved successfully!');
      }

      // Refetch products list from database to update UI immediately
      await refetchProducts();
    
    // Reset form
    handleNewProduct();
    
    setActiveTab('list');
    } catch (err) {
      const errorMessage = err.message || 'Failed to save product';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error saving product:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await deleteProduct({
        variables: { id: productId },
      });

      // Refetch products from database
      await refetchProducts();
      
      toast.success('Product deleted successfully!');
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete product';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error deleting product:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(groupSearchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showGroupDropdown && !event.target.closest('.group-dropdown-container')) {
        setShowGroupDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGroupDropdown]);

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Enhanced Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-2 inline-flex space-x-2">
        <button
          onClick={() => setActiveTab('add')}
          className={`px-6 py-3 font-semibold rounded-lg transition-all duration-300 ${
            activeTab === 'add'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg transform scale-105'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Product</span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`px-6 py-3 font-semibold rounded-lg transition-all duration-300 relative ${
            activeTab === 'list'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg transform scale-105'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span>My Products</span>
            {savedProducts.length > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'list' ? 'bg-white/30 text-white' : 'bg-purple-100 text-purple-600'
              }`}>
                {savedProducts.length}
              </span>
            )}
          </span>
        </button>
      </div>

      {activeTab === 'add' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Enhanced Form */}
          <div className="space-y-6">
            {/* Product Search Bar */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-sm font-semibold text-gray-700">Search & Edit Existing Product</span>
              </div>
              <div className="relative product-search-container">
                <input
                  type="text"
                  value={productSearchTerm}
                  onChange={(e) => {
                    setProductSearchTerm(e.target.value);
                    setShowProductSearchResults(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowProductSearchResults(productSearchTerm.length > 0)}
                  placeholder="Type product name to search..."
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                {productSearchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductSearchTerm('');
                      setShowProductSearchResults(false);
                    }}
                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                {showProductSearchResults && filteredProducts.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => handleProductSelect(product)}
                        className="p-3 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{product.name}</div>
                        {product.group?.name && (
                          <div className="text-xs text-gray-500 mt-1">{product.group.name}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {showProductSearchResults && productSearchTerm && filteredProducts.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl p-3 text-sm text-gray-500">
                    No products found
                  </div>
                )}
              </div>
              {editingProductId && (
                <div className="mt-3 flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="text-sm font-medium text-purple-900">Editing: {productData.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleNewProduct}
                    className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                  >
                    New Product
                  </button>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <span>Product Name</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={productData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Product Name e.g. Wordpress Website"
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all bg-white shadow-sm hover:shadow-md ${
                    validationErrors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-purple-500'
                  }`}
                />
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                )}
              </div>

              {/* Product Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Product Description
                </label>
                <textarea
                  value={productData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  placeholder="Enter product description..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white shadow-sm hover:shadow-md resize-none"
                />
              </div>

              {/* Product Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Image
                </label>
                
                {/* Image Input Mode Toggle */}
                <div className="flex items-center space-x-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setImageInputMode('file');
                      handleInputChange('imageUrl', '');
                      handleInputChange('imageFile', null);
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      imageInputMode === 'file'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>Upload File</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageInputMode('url');
                      handleInputChange('imageUrl', '');
                      handleInputChange('imageFile', null);
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      imageInputMode === 'url'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span>Image URL</span>
                    </span>
                  </button>
                </div>

                {/* File Upload Mode */}
                {imageInputMode === 'file' && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl cursor-pointer hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>Choose Image File</span>
                    </label>
                  </>
                )}

                {/* URL Input Mode */}
                {imageInputMode === 'url' && (
                  <div>
                    <input
                      type="url"
                      value={productData.imageUrl}
                      onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all bg-white shadow-sm hover:shadow-md ${
                        validationErrors.imageUrl ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-purple-500'
                      }`}
                    />
                    {validationErrors.imageUrl && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.imageUrl}</p>
                    )}
                  </div>
                )}

                {/* Image Preview */}
                {productData.imageUrl && (
                  <div className="mt-4">
                    <div className="relative inline-block group">
                      <img src={productData.imageUrl} alt="Product" className="w-40 h-40 object-cover rounded-xl shadow-lg border-4 border-white" />
                      <button
                        type="button"
                        onClick={() => {
                          handleInputChange('imageUrl', '');
                          handleInputChange('imageFile', null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Billing Mode */}
              <div className="space-y-4 bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Billing Configuration
                </label>
                <div className="flex items-center space-x-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productData.billingMode === 'subscription'}
                      onChange={(e) =>
                        handleInputChange('billingMode', e.target.checked ? 'subscription' : 'one-time')
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    <span className="ml-3 text-sm text-gray-700">
                      {productData.billingMode === 'subscription' ? (
                        <span className="text-green-600 font-medium">Subscription Mode</span>
                      ) : (
                        <span className="text-purple-600">Toggle to make the product one time</span>
                      )}
                    </span>
                  </label>
                </div>

                {productData.billingMode === 'subscription' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subscription Cycle
                      </label>
                      <select
                        value={productData.subscriptionCycle}
                        onChange={(e) => handleInputChange('subscriptionCycle', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="days">Days</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    {productData.subscriptionCycle === 'days' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Number of Days
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={productData.days || 1}
                          onChange={(e) => {
                            const val = e.target.value;
                            // Only allow positive integers
                            if (val === '' || /^\d+$/.test(val)) {
                              handleInputChange('days', val === '' ? 1 : parseInt(val) || 1);
                            }
                          }}
                          onKeyDown={(e) => {
                            // Prevent non-numeric characters
                            if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          placeholder="Enter days"
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                            validationErrors.days ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-transparent'
                          }`}
                        />
                        {validationErrors.days && (
                          <p className="mt-1 text-sm text-red-600">{validationErrors.days}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Base Price <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={productData.basePrice}
                    onChange={(e) => handleInputChange('basePrice', e.target.value)}
                    onKeyDown={(e) => {
                      // Allow: numbers, decimal point, backspace, delete, arrows, tab
                      if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                      placeholder="500.00"
                      className={`w-full pl-8 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all bg-white shadow-sm hover:shadow-md ${
                        validationErrors.basePrice ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-purple-500'
                      }`}
                  />
                  </div>
                  {validationErrors.basePrice && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.basePrice}</p>
                  )}
                  {editingProduct && (editingProduct.stripePriceId || editingProduct.basePrice?.stripePriceId) && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Stripe Price ID:</span>
                        <span className="text-xs font-mono text-blue-700">
                          {editingProduct.stripePriceId || editingProduct.basePrice?.stripePriceId}
                        </span>
                      </div>
                    </div>
                  )}
                  {editingProduct && editingProduct.stripeProductId && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Stripe Product ID:</span>
                        <span className="text-xs font-mono text-blue-700">
                          {editingProduct.stripeProductId}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Discount (%)
                  </label>
                  <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={productData.discount}
                    onChange={(e) => handleInputChange('discount', e.target.value)}
                    onKeyDown={(e) => {
                      // Allow: numbers, decimal point, backspace, delete, arrows, tab
                      if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="10"
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all bg-white shadow-sm hover:shadow-md ${
                      validationErrors.discount ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-purple-500'
                    }`}
                  />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">%</span>
                  </div>
                  {validationErrors.discount && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.discount}</p>
                  )}
                  {!validationErrors.discount && productData.discount && (
                    <p className="mt-1 text-xs text-gray-500">Enter a value between 0 and 100</p>
                  )}
                </div>
              </div>

              {/* Select Group */}
              <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200 relative group-dropdown-container">
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Product Group <span className="text-red-500">*</span>
                </label>
                {validationErrors.groupId && (
                  <p className="mb-2 text-sm text-red-600">{validationErrors.groupId}</p>
                )}
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                  <input
                    type="text"
                    value={groupSearchTerm}
                      onChange={(e) => {
                        setGroupSearchTerm(e.target.value);
                        setShowGroupDropdown(true);
                      }}
                      onFocus={() => setShowGroupDropdown(true)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                          const exactMatch = groups.find(g => g.name.toLowerCase() === groupSearchTerm.toLowerCase());
                          if (exactMatch) {
                            handleGroupSelect(exactMatch.id);
                            setGroupSearchTerm('');
                            setShowGroupDropdown(false);
                          } else if (groupSearchTerm.trim()) {
                        handleAddGroup();
                          }
                        }
                      }}
                      placeholder="Search/Select a Group or type to add new..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    {/* Dropdown */}
                    {showGroupDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 space-y-1 max-h-60 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg z-50">
                        {filteredGroups.length > 0 ? (
                          filteredGroups.map((group) => (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => {
                                handleGroupSelect(group.id);
                                setGroupSearchTerm('');
                                setShowGroupDropdown(false);
                              }}
                              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                productData.groupId === group.id
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-white text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {group.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">No groups found</div>
                        )}
                        {/* Show Add button if typing something new */}
                  {groupSearchTerm && !groups.find(g => g.name.toLowerCase() === groupSearchTerm.toLowerCase()) && (
                    <button
                      type="button"
                            onClick={() => {
                              handleAddGroupClick();
                              setShowGroupDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium transition-colors border-t border-gray-200"
                          >
                            + Add "{groupSearchTerm}"
                    </button>
                  )}
                      </div>
                    )}
                  </div>
                </div>
                {productData.groupId && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-sm">
                      {productData.groupName}
                      <button
                        type="button"
                        onClick={() => {
                          handleInputChange('groupId', '');
                          handleInputChange('groupName', '');
                          setGroupSearchTerm('');
                        }}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                )}
              </div>

              {/* Product Attributes */}
              <div className="space-y-4 bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Product Attributes</h3>
                  <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full font-medium">
                    {productData.attributes.length} added
                  </span>
                </div>
                {productData.attributes.map((attribute, index) => {
                  // Find matching attribute from original product
                  const originalAttribute = editingProduct?.attributes?.find(
                    attr => attr.id === attribute.attributeId || attr.name === attribute.attributeName
                  );
                  
                  return (
                    <ProductAttributeForm
                      key={attribute.id}
                      attribute={attribute}
                      index={index}
                      availableAttributes={availableAttributes}
                      originalAttribute={originalAttribute}
                      onDelete={() => handleDeleteAttribute(attribute.id)}
                      onChange={(field, value) => handleAttributeChange(attribute.id, field, value)}
                      onTypeToggle={(uiType, enabled) => handleAttributeTypeToggle(attribute.id, uiType, enabled)}
                      onTypeValueChange={(type, field, value) => handleAttributeTypeValueChange(attribute.id, type, field, value)}
                      onAddOption={(optionType) => handleAddOption(attribute.id, optionType)}
                      onOptionChange={(optionType, optionId, field, value) =>
                        handleOptionChange(attribute.id, optionType, optionId, field, value)
                      }
                      onDeleteOption={(optionType, optionId) =>
                        handleDeleteOption(attribute.id, optionType, optionId)
                      }
                    />
                  );
                })}
                <button
                  type="button"
                  onClick={handleAddAttribute}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span> {editingProductId ? 'Add Attribute' : 'Add Product Attribute'}</span>
                </button>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t-2 border-gray-200">
              <button
                type="submit"
                disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 transition-all shadow-2xl hover:shadow-3xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center space-x-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{editingProductId ? 'Updating Product...' : 'Saving Product...'}</span>
                    </span>
                  ) : editingProductId ? (
                    <span className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Update Product</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Save Product</span>
                    </span>
                  )}
              </button>
              </div>
            </form>
            </div>
          </div>

          {/* Right Side - Preview */}
          <div className="lg:sticky lg:top-8 h-fit">
            <ProductPreview productData={productData} />
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="space-y-4">
          {productsLoading ? (
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border-2 border-gray-200 p-16 text-center">
              <div className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-lg font-medium text-gray-600">Loading products from database...</span>
              </div>
            </div>
          ) : savedProducts.length === 0 ? (
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border-2 border-gray-200 p-16 text-center">
              <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Products Yet</h3>
              <p className="text-gray-500 text-lg mb-6">Start building your catalogue by adding your first product</p>
              <button
                onClick={() => setActiveTab('add')}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Your First Product</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedProducts.map((product) => {
                // Extract subscriptionCycle from basePrice interval/intervalCount
                let subscriptionCycle = null;
                if (product.billingMode === 'subscription' && product.basePrice) {
                  const interval = product.basePrice.interval;
                  const intervalCount = product.basePrice.intervalCount || 1;
                  if (interval === 'month' && intervalCount === 1) {
                    subscriptionCycle = 'monthly';
                  } else if (interval === 'month' && intervalCount === 3) {
                    subscriptionCycle = 'quarterly';
                  } else if (interval === 'year' && intervalCount === 1) {
                    subscriptionCycle = 'yearly';
                  }
                }

                // Convert database attributes to modal format
                const attributes = (product.attributes || []).map(attr => {
                  const uiType = attr.uiType || 'dropdown';
                  
                  // Convert options from database format to modal format - preserve all data
                  let convertedOptions = [];
                  if (attr.options && attr.options.length > 0) {
                    convertedOptions = attr.options.map(opt => ({
                      id: opt.id,
                      label: opt.label || opt.value || 'Unnamed Option',
                      value: opt.value,
                      description: opt.description,
                      price: opt.price, // Preserve full price object
                      perUnitPrice: opt.price ? `$${(opt.price.amount / 100).toFixed(2)}` : '$0',
                      totalUnits: '1', // Default, can be calculated if needed
                      totalPrice: opt.price ? (opt.price.amount / 100).toFixed(2) : '0',
                    }));
                  }

                  // Determine which type is enabled based on uiType
                  const types = {
                    slider: { enabled: false },
                    number: { enabled: false },
                    dropdown: { enabled: false },
                    checkbox: { enabled: false },
                    radio: { enabled: false },
                  };

                  if (uiType === 'slider') {
                    types.slider = { enabled: true, value: 50, min: 0, max: 100 };
                  } else if (uiType === 'number_input') {
                    types.number = { enabled: true, value: 0 };
                  } else if (uiType === 'dropdown') {
                    types.dropdown = { enabled: true, options: convertedOptions };
                  } else if (uiType === 'checkbox') {
                    types.checkbox = { enabled: true, options: convertedOptions };
                  } else if (uiType === 'radio') {
                    types.radio = { enabled: true, options: convertedOptions };
                  }

                  return {
                    id: attr.id,
                    name: attr.name || 'Unnamed Attribute', // Also include 'name' for modal compatibility
                    attributeName: attr.name || 'Unnamed Attribute',
                    isMandatory: attr.isMandatory || false,
                    isSubscription: false, // Can be determined from option prices if needed
                    uiType: uiType, // Include uiType directly
                    options: convertedOptions, // Also include options directly for easier access
                    types: types,
                  };
                });

                // Convert product format to modal format
                const modalProduct = {
                  id: product.id,
                  name: product.name,
                  description: product.description || '',
                  imageUrl: product.imageUrl || '',
                  groupName: product.group?.name || '',
                  billingMode: product.billingMode || 'one-time',
                  subscriptionCycle: subscriptionCycle,
                  basePrice: product.basePrice ? (product.basePrice.amount / 100).toString() : '0',
                  discount: product.discount?.toString() || '',
                  attributes: attributes,
                };

                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      setSelectedProduct(modalProduct);
                      setIsModalOpen(true);
                    }}
                    className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6 hover:shadow-2xl hover:border-purple-300 transition-all cursor-pointer transform hover:-translate-y-1 group"
                  >
                    {product.imageUrl ? (
                      <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden mb-4 group-hover:scale-105 transition-transform duration-300">
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg mb-4 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <svg className="w-16 h-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                          {product.name}
                        </h3>
                  {product.group?.name && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {product.group.name}
                          </span>
                  )}
                      </div>
                  {product.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                      )}
                      {product.stripeProductId && (
                        <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          <span className="text-xs font-medium text-gray-600">Stripe ID:</span>
                          <span className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-200">
                            {product.stripeProductId}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <div>
                          <span className="text-2xl font-bold text-gray-900">
                            {product.basePrice ? `$${(product.basePrice.amount / 100).toFixed(2)}` : 'N/A'}
                          </span>
                      {product.discount && (
                            <span className="ml-2 text-sm font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                              -{product.discount}%
                            </span>
                      )}
                        </div>
                        <span className="text-xs font-medium text-gray-500 capitalize bg-gray-100 px-3 py-1 rounded-full">
                          {product.billingMode || 'N/A'}
                    </span>
                  </div>
                  {product.attributes && product.attributes.length > 0 && (
                        <div className="pt-3 border-t border-gray-200 space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-700">
                              Attributes ({product.attributes.length})
                            </span>
                            <span className="text-xs text-purple-600 font-medium group-hover:underline">
                              View Details →
                            </span>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {product.attributes.map((attr, attrIndex) => {
                              const uiType = attr.uiType || 'dropdown';
                              
                              return (
                                <div key={attr.id || attrIndex} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-medium text-gray-800">
                                      {attr.name || `Attribute ${attrIndex + 1}`}
                                      {attr.isMandatory && <span className="text-red-500 ml-1">*</span>}
                                    </span>
                                  </div>
                                  
                                  {/* Slider Display */}
                                  {uiType === 'slider' && (
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-600">Value:</span>
                                        <span className="font-semibold text-purple-600">
                                          {attr.configuration?.value || attr.configuration?.min || 0}
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                          className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full"
                                          style={{
                                            width: `${((attr.configuration?.value || attr.configuration?.min || 0) / (attr.configuration?.max || 100)) * 100}%`
                                          }}
                                        ></div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Number Input Display */}
                                  {uiType === 'number_input' && (
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="number"
                                        value={attr.value || attr.configuration?.value || 0}
                                        readOnly
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-700"
                                      />
                                    </div>
                                  )}
                                  
                                  {/* Dropdown Display */}
                                  {uiType === 'dropdown' && attr.options && attr.options.length > 0 && (
                                    <select
                                      disabled
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-700 cursor-not-allowed"
                                    >
                                      <option value="">Select option...</option>
                                      {attr.options.map((opt, optIdx) => (
                                        <option key={opt.id || optIdx} value={opt.value || opt.label}>
                                          {opt.label || opt.value || `Option ${optIdx + 1}`}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                  
                                  {/* Checkbox Display */}
                                  {uiType === 'checkbox' && attr.options && attr.options.length > 0 && (
                                    <div className="space-y-1">
                                      {attr.options.slice(0, 3).map((opt, optIdx) => (
                                        <label key={opt.id || optIdx} className="flex items-center space-x-2 text-xs">
                                          <input
                                            type="checkbox"
                                            checked={opt.defaultSelected || false}
                                            disabled
                                            className="w-3 h-3 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                          />
                                          <span className="text-gray-700">
                                            {opt.label || opt.value || `Option ${optIdx + 1}`}
                                          </span>
                                        </label>
                                      ))}
                                      {attr.options.length > 3 && (
                                        <span className="text-xs text-gray-500">
                                          +{attr.options.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Radio Display */}
                                  {uiType === 'radio' && attr.options && attr.options.length > 0 && (
                                    <div className="space-y-1">
                                      {attr.options.slice(0, 3).map((opt, optIdx) => (
                                        <label key={opt.id || optIdx} className="flex items-center space-x-2 text-xs">
                                          <input
                                            type="radio"
                                            name={`attr-${attr.id || attrIndex}`}
                                            checked={opt.defaultSelected || false}
                                            disabled
                                            className="w-3 h-3 text-purple-600 border-gray-300 focus:ring-purple-500"
                                          />
                                          <span className="text-gray-700">
                                            {opt.label || opt.value || `Option ${optIdx + 1}`}
                                          </span>
                                        </label>
                                      ))}
                                      {attr.options.length > 3 && (
                                        <span className="text-xs text-gray-500">
                                          +{attr.options.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                    </div>
                  )}
                      <div className="pt-2 flex items-center justify-end space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
                              handleDeleteProduct(product.id);
                            }
                          }}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors font-medium"
                        >
                          Delete
                        </button>
                </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Product Detail Modal */}
          <ProductDetailModal
            product={selectedProduct}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedProduct(null);
            }}
          />
        </div>
      )}
      
      {/* Add Group Modal - Outside tab conditionals so it's always available */}
      <AddGroupModal
        isOpen={showAddGroupModal}
        onClose={() => setShowAddGroupModal(false)}
        onAdd={handleAddGroup}
        initialName={groupSearchTerm}
      />
    </div>
  );
}

function ProductAttributeForm({
  attribute,
  index,
  availableAttributes,
  originalAttribute,
  onDelete,
  onChange,
  onTypeToggle,
  onTypeValueChange,
  onAddOption,
  onOptionChange,
  onDeleteOption,
}) {
  // Helper to find original option by label or id
  const findOriginalOption = (optionLabel, optionId) => {
    if (!originalAttribute?.options) return null;
    return originalAttribute.options.find(
      opt => opt.id === optionId || opt.label === optionLabel
    );
  };
  const [searchTerm, setSearchTerm] = useState(attribute.attributeName || '');

  // Check which types are enabled
  const enabledTypes = {
    slider: !!attribute.slider,
    number_input: !!attribute.number_input,
    dropdown: !!attribute.dropdown,
    checkbox: !!attribute.checkbox,
    radio: !!attribute.radio,
  };
  const filteredAttributes = availableAttributes.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAttributeNameChange = (value) => {
    setSearchTerm(value);
    onChange('attributeName', value);
    if (value && !availableAttributes.find(f => f.name === value)) {
      onChange('attributeId', `feat_new_${Date.now()}`);
    }
  };

  // Get configuration for a specific type
  const getTypeConfig = (type) => {
    switch (type) {
      case 'slider':
        return attribute.slider || { value: 50, min: 0, max: 100, perUnitPrice: '' };
      case 'number_input':
        return attribute.number_input || { value: 0, perUnitPrice: '' };
      case 'dropdown':
        return attribute.dropdown || { options: [] };
      case 'checkbox':
        return attribute.checkbox || { options: [] };
      case 'radio':
        return attribute.radio || { options: [] };
      default:
        return { options: [] };
    }
  };

  return (
    <div className="border-2 border-gray-200 rounded-xl p-6 space-y-5 bg-white shadow-md hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-gray-100">
        <h4 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            {index + 1}
          </div>
          <span>Product Attribute</span>
        </h4>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-sm">Delete</span>
        </button>
      </div>

      {/* Search/Add Attribute */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleAttributeNameChange(e.target.value)}
          onBlur={() => {
            if (searchTerm) {
              onChange('attributeName', searchTerm);
            }
          }}
          placeholder="Search/Add Additional Attribute"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white shadow-sm hover:shadow-md"
        />
        {searchTerm && filteredAttributes.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 border border-gray-200 rounded-lg bg-white shadow-lg max-h-40 overflow-y-auto z-50 hide-scrollbar">
            {filteredAttributes.map((feat) => (
              <button
                key={feat.id}
                type="button"
                onClick={() => {
                  onChange('attributeId', feat.id);
                  onChange('attributeName', feat.name);
                  setSearchTerm(feat.name);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
              >
                {feat.name}
              </button>
            ))}
            {searchTerm && !filteredAttributes.find(f => f.name.toLowerCase() === searchTerm.toLowerCase()) && (
              <button
                type="button"
                onClick={() => {
                  const newAttribute = {
                    id: `feat_new_${Date.now()}`,
                    name: searchTerm,
                  };
                  onChange('attributeId', newAttribute.id);
                  onChange('attributeName', newAttribute.name);
                }}
                className="w-full text-left px-4 py-2 hover:bg-purple-50 transition-colors text-purple-600 font-medium"
              >
                + Add "{searchTerm}" as new attribute
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mandatory Toggle */}
      <div className="flex items-center space-x-6 bg-gray-50 rounded-xl p-4">
        <label className="flex items-center space-x-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={attribute.isMandatory}
            onChange={(e) => onChange('isMandatory', e.target.checked)}
            className="w-5 h-5 text-purple-600 border-2 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
          />
          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Make This Mandatory</span>
        </label>
      </div>

      {/* Attribute Type Selection - Multiple Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Select Attribute Types
        </label>
        <div className="grid grid-cols-5 gap-3">
          {['dropdown', 'checkbox', 'radio', 'slider', 'number_input'].map((type) => {
            const isEnabled = enabledTypes[type];
            return (
              <label
                key={type}
                className={`p-4 border-2 rounded-xl transition-all cursor-pointer transform hover:scale-105 ${
                  isEnabled
                  ? 'border-purple-500 bg-purple-50 shadow-lg'
                  : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => onTypeToggle(type, e.target.checked)}
                  className="sr-only"
                />
                <div className="text-center">
                  <div className="text-xs font-bold text-gray-700 capitalize mb-1">
                    {type === 'number_input' ? 'Number' : type}
                  </div>
                  {isEnabled && (
                    <svg className="w-5 h-5 mx-auto text-purple-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Slider Configuration */}
      {enabledTypes.slider && (
        <div className="space-y-3 p-3 bg-purple-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Slider Configuration
            </label>
            <button
              type="button"
              onClick={() => onTypeToggle('slider', false)}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slider Value: {getTypeConfig('slider').value || 50}
            </label>
                  <input
                    type="range"
              min={getTypeConfig('slider').min || 0}
              max={getTypeConfig('slider').max || 100}
              value={getTypeConfig('slider').value || 50}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) {
                  onTypeValueChange('slider', 'value', val);
                }
              }}
              className="w-full"
            />
                  </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Per Unit Price
            </label>
            <input
              type="text"
              value={getTypeConfig('slider').perUnitPrice || ''}
              onChange={(e) => onTypeValueChange('slider', 'perUnitPrice', e.target.value)}
              placeholder="$500"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={getTypeConfig('slider').description || ''}
              onChange={(e) => onTypeValueChange('slider', 'description', e.target.value)}
              placeholder="Enter slider description..."
              rows="2"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          {/* Subscription Mode for Slider */}
          <div className="border-t border-gray-200 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={getTypeConfig('slider').isSubscription || false}
                  onChange={(e) => onTypeValueChange('slider', 'isSubscription', e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Subscription Mode</span>
              </label>
            </div>
            {getTypeConfig('slider').isSubscription && (
              <div className="space-y-2">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Subscription Cycle</label>
                  <select
                    value={getTypeConfig('slider').subscriptionCycle || 'monthly'}
                    onChange={(e) => onTypeValueChange('slider', 'subscriptionCycle', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="days">Days</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                {getTypeConfig('slider').subscriptionCycle === 'days' && (
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Number of Days</label>
                    <input
                      type="number"
                      min="1"
                      value={getTypeConfig('slider').days || 1}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d+$/.test(val)) {
                          onTypeValueChange('slider', 'days', val === '' ? 1 : parseInt(val) || 1);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      placeholder="Enter days"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Number Input Configuration */}
      {enabledTypes.number_input && (
        <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Number Input Configuration
            </label>
            <button
              type="button"
              onClick={() => onTypeToggle('number_input', false)}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Remove
            </button>
              </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Value
            </label>
            <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                onClick={() => {
                  const currentValue = parseInt(getTypeConfig('number_input').value || 0);
                  onTypeValueChange('number_input', 'value', Math.max(0, currentValue - 1));
                    }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                value={getTypeConfig('number_input').value || 0}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d+$/.test(val)) {
                    onTypeValueChange('number_input', 'value', val === '' ? 0 : parseInt(val) || 0);
                  }
                }}
                onKeyDown={(e) => {
                  if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-center"
                  />
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                onClick={() => {
                  const currentValue = parseInt(getTypeConfig('number_input').value || 0);
                  onTypeValueChange('number_input', 'value', currentValue + 1);
                    }}
                  >
                    +
                  </button>
                </div>
            </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Per Unit Price
            </label>
            <input
              type="text"
              value={getTypeConfig('number_input').perUnitPrice || ''}
              onChange={(e) => {
                const val = e.target.value;
                // Allow $ sign and numbers with decimal
                const cleaned = val.replace(/[^0-9.]/g, '');
                if (cleaned === '' || /^\d*\.?\d*$/.test(cleaned)) {
                  onTypeValueChange('number_input', 'perUnitPrice', cleaned === '' ? '' : `$${cleaned}`);
                }
              }}
              onKeyDown={(e) => {
                if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              placeholder="$500"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={getTypeConfig('number_input').description || ''}
              onChange={(e) => onTypeValueChange('number_input', 'description', e.target.value)}
              placeholder="Enter number input description..."
              rows="2"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          {/* Subscription Mode for Number Input */}
          <div className="border-t border-gray-200 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={getTypeConfig('number_input').isSubscription || false}
                  onChange={(e) => onTypeValueChange('number_input', 'isSubscription', e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Subscription Mode</span>
              </label>
            </div>
            {getTypeConfig('number_input').isSubscription && (
              <div className="space-y-2">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Subscription Cycle</label>
                  <select
                    value={getTypeConfig('number_input').subscriptionCycle || 'monthly'}
                    onChange={(e) => onTypeValueChange('number_input', 'subscriptionCycle', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="days">Days</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                {getTypeConfig('number_input').subscriptionCycle === 'days' && (
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Number of Days</label>
                    <input
                      type="number"
                      min="1"
                      value={getTypeConfig('number_input').days || 1}
                      onChange={(e) => onTypeValueChange('number_input', 'days', parseInt(e.target.value) || 1)}
                      placeholder="Enter days"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Options Configuration (for dropdown, checkbox, radio) */}
      {enabledTypes.dropdown && (
        <div className="space-y-3 p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 capitalize">
              Dropdown Options
            </label>
            <button
              type="button"
              onClick={() => onTypeToggle('dropdown', false)}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Options:</span>
            <button
              type="button"
              onClick={() => onAddOption('dropdown')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + Add Option
            </button>
          </div>
          {getTypeConfig('dropdown').options?.map((option, optIndex) => (
            <div key={option.id} className="space-y-2 p-3 bg-white rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Option Name</label>
                  <input
                    type="text"
                    value={option.label || ''}
                    onChange={(e) => onOptionChange('dropdown', option.id, 'label', e.target.value)}
                    placeholder={`Option ${optIndex + 1} e.g. Portfolio Website`}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Per Unit Price</label>
                  <input
                    type="text"
                    value={option.perUnitPrice || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const cleaned = val.replace(/[^0-9.]/g, '');
                      if (cleaned === '' || /^\d*\.?\d*$/.test(cleaned)) {
                        onOptionChange('dropdown', option.id, 'perUnitPrice', cleaned === '' ? '' : `$${cleaned}`);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="$200"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Total Units</label>
                  <input
                    type="number"
                    value={option.totalUnits || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d+$/.test(val)) {
                        onOptionChange('dropdown', option.id, 'totalUnits', val === '' ? '' : val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="1"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Total Price</label>
                  <input
                    type="text"
                    value={option.totalPrice ? `$${option.totalPrice}` : ''}
                    disabled
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Description</label>
                <textarea
                  value={option.description || ''}
                  onChange={(e) => onOptionChange('dropdown', option.id, 'description', e.target.value)}
                  placeholder="Enter option description..."
                  rows="2"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Subscription Mode for Option */}
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={option.isSubscription || false}
                      onChange={(e) => onOptionChange('dropdown', option.id, 'isSubscription', e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-xs font-medium text-gray-700">Subscription Mode</span>
                  </label>
                </div>
                {option.isSubscription && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Subscription Cycle</label>
                      <select
                        value={option.subscriptionCycle || 'monthly'}
                        onChange={(e) => onOptionChange('dropdown', option.id, 'subscriptionCycle', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="days">Days</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    {option.subscriptionCycle === 'days' && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Number of Days</label>
                        <input
                          type="number"
                          min="1"
                          value={option.days || 1}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d+$/.test(val)) {
                              onOptionChange('dropdown', option.id, 'days', val === '' ? 1 : parseInt(val) || 1);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          placeholder="Enter days"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Show Stripe Price ID if available */}
              {(() => {
                const originalOpt = findOriginalOption(option.label, option.id);
                const stripePriceId = originalOpt?.price?.stripePriceId;
                if (!stripePriceId) return null;
                return (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                      <span className="text-xs text-gray-600">Stripe Price ID:</span>
                      <span className="text-xs font-mono text-blue-700">
                        {stripePriceId}
                      </span>
                    </div>
                  </div>
                );
              })()}
              
              <button
                type="button"
                onClick={() => onDeleteOption('dropdown', option.id)}
                className="w-full mt-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete Option</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {enabledTypes.checkbox && (
        <div className="space-y-3 p-3 bg-yellow-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 capitalize">
              Checkbox Options
            </label>
            <button
              type="button"
              onClick={() => onTypeToggle('checkbox', false)}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Options:</span>
            <button
              type="button"
              onClick={() => onAddOption('checkbox')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + Add Option
            </button>
          </div>
          {getTypeConfig('checkbox').options?.map((option, optIndex) => (
            <div key={option.id} className="space-y-2 p-3 bg-white rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Option Name</label>
            <input
              type="text"
                    value={option.label || ''}
                    onChange={(e) => onOptionChange('checkbox', option.id, 'label', e.target.value)}
                    placeholder={`Option ${optIndex + 1} e.g. Portfolio Website`}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Per Unit Price</label>
                  <input
                    type="text"
                    value={option.perUnitPrice || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const cleaned = val.replace(/[^0-9.]/g, '');
                      if (cleaned === '' || /^\d*\.?\d*$/.test(cleaned)) {
                        onOptionChange('checkbox', option.id, 'perUnitPrice', cleaned === '' ? '' : `$${cleaned}`);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="$200"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
        </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
          <div>
                  <label className="block text-xs text-gray-600 mb-1">Total Units</label>
                  <input
                    type="number"
                    value={option.totalUnits || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d+$/.test(val)) {
                        onOptionChange('checkbox', option.id, 'totalUnits', val === '' ? '' : val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="1"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Total Price</label>
            <input
              type="text"
                    value={option.totalPrice ? `$${option.totalPrice}` : ''}
                    disabled
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
            />
          </div>
        </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Description</label>
                <textarea
                  value={option.description || ''}
                  onChange={(e) => onOptionChange('checkbox', option.id, 'description', e.target.value)}
                  placeholder="Enter option description..."
                  rows="2"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Subscription Mode for Option */}
              <div className="border-t border-gray-200 pt-3 space-y-2">
          <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={option.isSubscription || false}
                      onChange={(e) => onOptionChange('checkbox', option.id, 'isSubscription', e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-xs font-medium text-gray-700">Subscription Mode</span>
            </label>
                </div>
                {option.isSubscription && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Subscription Cycle</label>
                      <select
                        value={option.subscriptionCycle || 'monthly'}
                        onChange={(e) => onOptionChange('checkbox', option.id, 'subscriptionCycle', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="days">Days</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    {option.subscriptionCycle === 'days' && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Number of Days</label>
                        <input
                          type="number"
                          min="1"
                          value={option.days || 1}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d+$/.test(val)) {
                              onOptionChange('checkbox', option.id, 'days', val === '' ? 1 : parseInt(val) || 1);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          placeholder="Enter days"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Show Stripe Price ID if available */}
              {(() => {
                const originalOpt = findOriginalOption(option.label, option.id);
                const stripePriceId = originalOpt?.price?.stripePriceId;
                if (!stripePriceId) return null;
                return (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                      <span className="text-xs text-gray-600">Stripe Price ID:</span>
                      <span className="text-xs font-mono text-blue-700">
                        {stripePriceId}
                      </span>
                    </div>
                  </div>
                );
              })()}
              
            <button
              type="button"
                onClick={() => onDeleteOption('checkbox', option.id)}
                className="w-full mt-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete Option</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {enabledTypes.radio && (
        <div className="space-y-3 p-3 bg-pink-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 capitalize">
              Radio Options
            </label>
            <button
              type="button"
              onClick={() => onTypeToggle('radio', false)}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Options:</span>
            <button
              type="button"
              onClick={() => onAddOption('radio')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + Add Option
            </button>
          </div>
          {getTypeConfig('radio').options?.map((option, optIndex) => (
            <div key={option.id} className="space-y-2 p-3 bg-white rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Option Name</label>
                  <input
                    type="text"
                    value={option.label || ''}
                    onChange={(e) => onOptionChange('radio', option.id, 'label', e.target.value)}
                    placeholder={`Option ${optIndex + 1} e.g. Portfolio Website`}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Per Unit Price</label>
                  <input
                    type="text"
                    value={option.perUnitPrice || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const cleaned = val.replace(/[^0-9.]/g, '');
                      if (cleaned === '' || /^\d*\.?\d*$/.test(cleaned)) {
                        onOptionChange('radio', option.id, 'perUnitPrice', cleaned === '' ? '' : `$${cleaned}`);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="$200"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Total Units</label>
                  <input
                    type="number"
                    value={option.totalUnits || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d+$/.test(val)) {
                        onOptionChange('radio', option.id, 'totalUnits', val === '' ? '' : val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="1"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Total Price</label>
                  <input
                    type="text"
                    value={option.totalPrice ? `$${option.totalPrice}` : ''}
                    disabled
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Description</label>
                <textarea
                  value={option.description || ''}
                  onChange={(e) => onOptionChange('radio', option.id, 'description', e.target.value)}
                  placeholder="Enter option description..."
                  rows="2"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              {/* Subscription Mode for Option */}
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={option.isSubscription || false}
                      onChange={(e) => onOptionChange('radio', option.id, 'isSubscription', e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-xs font-medium text-gray-700">Subscription Mode</span>
                  </label>
                </div>
                {option.isSubscription && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Subscription Cycle</label>
                      <select
                        value={option.subscriptionCycle || 'monthly'}
                        onChange={(e) => onOptionChange('radio', option.id, 'subscriptionCycle', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="days">Days</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    {option.subscriptionCycle === 'days' && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Number of Days</label>
                        <input
                          type="number"
                          min="1"
                          value={option.days || 1}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d+$/.test(val)) {
                              onOptionChange('radio', option.id, 'days', val === '' ? 1 : parseInt(val) || 1);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          placeholder="Enter days"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Show Stripe Price ID if available */}
              {(() => {
                const originalOpt = findOriginalOption(option.label, option.id);
                const stripePriceId = originalOpt?.price?.stripePriceId;
                if (!stripePriceId) return null;
                return (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                      <span className="text-xs text-gray-600">Stripe Price ID:</span>
                      <span className="text-xs font-mono text-blue-700">
                        {stripePriceId}
                      </span>
                    </div>
                  </div>
                );
              })()}
              
              <button
                type="button"
                onClick={() => onDeleteOption('radio', option.id)}
                className="w-full mt-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete Option</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
