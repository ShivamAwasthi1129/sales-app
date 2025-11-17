'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import ProductPreview from './ProductPreview';
import ProductDetailModal from './ProductDetailModal';

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
  mutation CreateGroup($name: String!, $slug: String, $description: String) {
    createGroup(name: $name, slug: $slug, description: $description) {
      id
      name
      slug
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

  const handleInputChange = (field, value) => {
    setProductData(prev => ({ ...prev, [field]: value }));
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
              const updated = { ...opt, [field]: value };
              // Calculate total if perUnitPrice and totalUnits are both set
              if (field === 'perUnitPrice' || field === 'totalUnits') {
                const perUnit = parseFloat(updated.perUnitPrice?.replace(/[^0-9.]/g, '') || 0);
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

  const handleAddGroup = async () => {
    if (groupSearchTerm.trim()) {
      try {
        setLoading(true);
        setError('');
        const result = await createGroup({
          variables: {
        name: groupSearchTerm.trim(),
        slug: groupSearchTerm.trim().toLowerCase().replace(/\s+/g, '-'),
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
      } catch (err) {
        setError(err.message || 'Failed to create group');
      } finally {
        setLoading(false);
      }
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
          description: '',
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
            description: '',
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
            description: '',
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
          description: `Slider value: ${sliderValue}`,
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
          description: `Quantity: ${numberValue}`,
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
    setLoading(true);

    try {
      // Validate required fields
      if (!productData.name.trim()) {
        throw new Error('Product name is required');
      }
      if (!productData.groupId) {
        throw new Error('Please select a group');
      }

      // Convert basePrice to PriceInput
      let basePriceInput = null;
      const basePriceAmount = productData.basePrice ? parseFloat(productData.basePrice.replace(/[^0-9.]/g, '')) || 0 : 0;
      const productDays = productData.days || 1;
      if (productData.basePrice) {
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

      // Create product via GraphQL (saves to database)
      await createProduct({
        variables: { input: productInput },
      });

      // Refetch products list from database to update UI immediately
      await refetchProducts();
    
    // Reset form
    setProductData({
      name: '',
      description: '',
      imageUrl: '',
      imageFile: null,
      billingMode: 'subscription',
      subscriptionCycle: 'monthly',
      basePrice: '',
      discount: '',
      groupId: '',
      groupName: '',
        attributes: [],
    });
    
    alert('Product saved successfully!');
    setActiveTab('list');
    } catch (err) {
      setError(err.message || 'Failed to save product');
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
      
      alert('Product deleted successfully!');
    } catch (err) {
      setError(err.message || 'Failed to delete product');
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
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white shadow-sm hover:shadow-md"
                />
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
                  <span>Add Product Image</span>
                </label>
                {productData.imageUrl && (
                  <div className="mt-4">
                    <div className="relative inline-block group">
                      <img src={productData.imageUrl} alt="Product" className="w-40 h-40 object-cover rounded-xl shadow-lg border-4 border-white" />
                      <button
                        type="button"
                        onClick={() => handleInputChange('imageUrl', '')}
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
                          onChange={(e) => handleInputChange('days', parseInt(e.target.value) || 1)}
                          placeholder="Enter days"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Base Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">$</span>
                  <input
                    type="number"
                    value={productData.basePrice}
                    onChange={(e) => handleInputChange('basePrice', e.target.value)}
                      placeholder="500"
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white shadow-sm hover:shadow-md"
                  />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Discount (%)
                  </label>
                  <div className="relative">
                  <input
                    type="number"
                    value={productData.discount}
                    onChange={(e) => handleInputChange('discount', e.target.value)}
                    placeholder="10"
                    min="0"
                    max="100"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white shadow-sm hover:shadow-md"
                  />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">%</span>
                  </div>
                </div>
              </div>

              {/* Select Group */}
              <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200 relative group-dropdown-container">
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Product Group
                </label>
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
                              handleAddGroup();
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
                {productData.attributes.map((attribute, index) => (
                  <ProductAttributeForm
                    key={attribute.id}
                    attribute={attribute}
                    index={index}
                    availableAttributes={availableAttributes}
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
                ))}
                <button
                  type="button"
                  onClick={handleAddAttribute}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span> Add Product Attribute</span>
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
                      <span>Saving Product...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
                  
                  // Convert options from database format to modal format
                  let convertedOptions = [];
                  if (attr.options && attr.options.length > 0) {
                    convertedOptions = attr.options.map(opt => ({
                      id: opt.id,
                      label: opt.label || opt.value || 'Unnamed Option',
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
                    attributeName: attr.name || 'Unnamed Attribute',
                    isMandatory: attr.isMandatory || false,
                    isSubscription: false, // Can be determined from option prices if needed
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
                        <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {product.attributes.length} attribute{product.attributes.length !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs text-purple-600 font-medium group-hover:underline">
                            View Details →
                          </span>
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
    </div>
  );
}

function ProductAttributeForm({
  attribute,
  index,
  availableAttributes,
  onDelete,
  onChange,
  onTypeToggle,
  onTypeValueChange,
  onAddOption,
  onOptionChange,
  onDeleteOption,
}) {
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
              onChange={(e) => onTypeValueChange('slider', 'value', parseInt(e.target.value))}
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
                      onChange={(e) => onTypeValueChange('slider', 'days', parseInt(e.target.value) || 1)}
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
                onChange={(e) => onTypeValueChange('number_input', 'value', parseInt(e.target.value) || 0)}
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
              onChange={(e) => onTypeValueChange('number_input', 'perUnitPrice', e.target.value)}
              placeholder="$500"
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
                    onChange={(e) => onOptionChange('dropdown', option.id, 'perUnitPrice', e.target.value)}
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
                    onChange={(e) => onOptionChange('dropdown', option.id, 'totalUnits', e.target.value)}
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
                          onChange={(e) => onOptionChange('dropdown', option.id, 'days', parseInt(e.target.value) || 1)}
                          placeholder="Enter days"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
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
                    onChange={(e) => onOptionChange('checkbox', option.id, 'perUnitPrice', e.target.value)}
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
                    onChange={(e) => onOptionChange('checkbox', option.id, 'totalUnits', e.target.value)}
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
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Subscription Cycle</label>
                    <select
                      value={option.subscriptionCycle || 'monthly'}
                      onChange={(e) => onOptionChange('checkbox', option.id, 'subscriptionCycle', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}
              </div>
              
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
                    onChange={(e) => onOptionChange('radio', option.id, 'perUnitPrice', e.target.value)}
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
                    onChange={(e) => onOptionChange('radio', option.id, 'totalUnits', e.target.value)}
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
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Subscription Cycle</label>
                    <select
                      value={option.subscriptionCycle || 'monthly'}
                      onChange={(e) => onOptionChange('radio', option.id, 'subscriptionCycle', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}
              </div>
              
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
