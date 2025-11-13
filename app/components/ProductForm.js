'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import ProductPreview from './ProductPreview';

const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: ProductInput!) {
    createProduct(input: $input) {
      id
      name
      description
      imageUrl
      status
      createdAt
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
      }
      attributes {
        id
        name
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
  const [productData, setProductData] = useState({
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

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [groupSearchTerm, setGroupSearchTerm] = useState('');

  // GraphQL hooks
  const [createProduct] = useMutation(CREATE_PRODUCT);
  const [createGroup] = useMutation(CREATE_GROUP);

  // Load products and groups from API
  const { data: productsData, refetch: refetchProducts } = useQuery(GET_PRODUCTS, {
    skip: activeTab !== 'list',
  });

  const { data: groupsData, refetch: refetchGroups } = useQuery(GET_GROUPS);

  const savedProducts = productsData?.getProducts || [];
  const groups = groupsData?.getGroups || [];

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
      isSubscription: false,
      uiType: 'dropdown', // Single uiType as per schema
      // Type-specific configurations
      slider: { value: 50, min: 0, max: 100, perUnitPrice: '' },
      number_input: { value: 0, perUnitPrice: '' },
      dropdown: { options: [] },
      checkbox: { options: [] },
      radio: { options: [] },
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

  const handleAttributeTypeChange = (attributeId, uiType) => {
    setProductData(prev => ({
      ...prev,
      attributes: prev.attributes.map(f => {
        if (f.id === attributeId) {
          // Initialize type-specific configs if they don't exist
          const updated = { ...f, uiType };
          
          if (!updated.slider) {
            updated.slider = { value: 50, min: 0, max: 100, perUnitPrice: '' };
          }
          if (!updated.number_input) {
            updated.number_input = { value: 0, perUnitPrice: '' };
          }
          if (!updated.dropdown) {
            updated.dropdown = { options: [] };
          }
          if (!updated.checkbox) {
            updated.checkbox = { options: [] };
          }
          if (!updated.radio) {
            updated.radio = { options: [] };
          }
          
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
        options = attr.dropdown.options.map((opt) => ({
          label: opt.label || 'Unnamed Option',
          value: opt.label?.toLowerCase().replace(/\s+/g, '_') || `option_${Date.now()}`,
          description: '',
          price: {
            amount: parseFloat(opt.perUnitPrice?.replace(/[^0-9.]/g, '') || 0) * 100, // Convert to cents
            currency: 'usd',
            billingType: attr.isSubscription ? 'recurring' : 'one_time',
            interval: attr.isSubscription ? productData.subscriptionCycle === 'monthly' ? 'month' : 
                      productData.subscriptionCycle === 'quarterly' ? 'month' : 
                      productData.subscriptionCycle === 'yearly' ? 'year' : 'month' : undefined,
            intervalCount: productData.subscriptionCycle === 'quarterly' ? 3 : 1,
            nickname: `${opt.label} - ${opt.perUnitPrice || '$0'}`,
          },
          defaultSelected: false,
          order: 0,
        }));
      } else if (uiType === 'checkbox' && attr.checkbox?.options) {
        options = attr.checkbox.options.map((opt) => ({
          label: opt.label || 'Unnamed Option',
          value: opt.label?.toLowerCase().replace(/\s+/g, '_') || `option_${Date.now()}`,
          description: '',
          price: {
            amount: parseFloat(opt.perUnitPrice?.replace(/[^0-9.]/g, '') || 0) * 100,
            currency: 'usd',
            billingType: attr.isSubscription ? 'recurring' : 'one_time',
            interval: attr.isSubscription ? productData.subscriptionCycle === 'monthly' ? 'month' : 
                      productData.subscriptionCycle === 'quarterly' ? 'month' : 
                      productData.subscriptionCycle === 'yearly' ? 'year' : 'month' : undefined,
            intervalCount: productData.subscriptionCycle === 'quarterly' ? 3 : 1,
            nickname: `${opt.label} - ${opt.perUnitPrice || '$0'}`,
          },
          defaultSelected: false,
          order: 0,
        }));
      } else if (uiType === 'radio' && attr.radio?.options) {
        options = attr.radio.options.map((opt) => ({
          label: opt.label || 'Unnamed Option',
          value: opt.label?.toLowerCase().replace(/\s+/g, '_') || `option_${Date.now()}`,
          description: '',
          price: {
            amount: parseFloat(opt.perUnitPrice?.replace(/[^0-9.]/g, '') || 0) * 100,
            currency: 'usd',
            billingType: attr.isSubscription ? 'recurring' : 'one_time',
            interval: attr.isSubscription ? productData.subscriptionCycle === 'monthly' ? 'month' : 
                      productData.subscriptionCycle === 'quarterly' ? 'month' : 
                      productData.subscriptionCycle === 'yearly' ? 'year' : 'month' : undefined,
            intervalCount: productData.subscriptionCycle === 'quarterly' ? 3 : 1,
            nickname: `${opt.label} - ${opt.perUnitPrice || '$0'}`,
          },
          defaultSelected: false,
          order: 0,
        }));
      } else if (uiType === 'slider' && attr.slider) {
        // For slider, create a single option representing the slider
        const sliderValue = attr.slider.value || 50;
        const perUnitPrice = parseFloat(attr.slider.perUnitPrice?.replace(/[^0-9.]/g, '') || 0);
        options = [{
          label: `${attr.attributeName} - ${sliderValue}`,
          value: `slider_${sliderValue}`,
          description: `Slider value: ${sliderValue}`,
          price: {
            amount: (perUnitPrice * sliderValue) * 100, // Convert to cents
            currency: 'usd',
            billingType: attr.isSubscription ? 'recurring' : 'one_time',
            interval: attr.isSubscription ? productData.subscriptionCycle === 'monthly' ? 'month' : 
                      productData.subscriptionCycle === 'quarterly' ? 'month' : 
                      productData.subscriptionCycle === 'yearly' ? 'year' : 'month' : undefined,
            intervalCount: productData.subscriptionCycle === 'quarterly' ? 3 : 1,
            nickname: `${attr.attributeName} Slider`,
          },
          defaultSelected: false,
          order: 0,
        }];
      } else if (uiType === 'number_input' && attr.number_input) {
        // For number input, create a single option
        const numberValue = attr.number_input.value || 0;
        const perUnitPrice = parseFloat(attr.number_input.perUnitPrice?.replace(/[^0-9.]/g, '') || 0);
        options = [{
          label: `${attr.attributeName} - ${numberValue} units`,
          value: `number_${numberValue}`,
          description: `Quantity: ${numberValue}`,
          price: {
            amount: (perUnitPrice * numberValue) * 100, // Convert to cents
            currency: 'usd',
            billingType: attr.isSubscription ? 'recurring' : 'one_time',
            interval: attr.isSubscription ? productData.subscriptionCycle === 'monthly' ? 'month' : 
                      productData.subscriptionCycle === 'quarterly' ? 'month' : 
                      productData.subscriptionCycle === 'yearly' ? 'year' : 'month' : undefined,
            intervalCount: productData.subscriptionCycle === 'quarterly' ? 3 : 1,
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
      if (productData.basePrice) {
        const basePriceAmount = parseFloat(productData.basePrice.replace(/[^0-9.]/g, '')) || 0;
        basePriceInput = {
          amount: basePriceAmount * 100, // Convert to cents
          currency: 'usd',
          billingType: productData.billingMode === 'subscription' ? 'recurring' : 'one_time',
          interval: productData.billingMode === 'subscription' ? 
                    (productData.subscriptionCycle === 'monthly' ? 'month' : 
                     productData.subscriptionCycle === 'quarterly' ? 'month' : 
                     productData.subscriptionCycle === 'yearly' ? 'year' : 'month') : undefined,
          intervalCount: productData.subscriptionCycle === 'quarterly' ? 3 : 1,
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

      // Create product via GraphQL
      await createProduct({
        variables: { input: productInput },
      });

      // Refetch products list
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

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(groupSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('add')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'add'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700'
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
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'list'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          My Products ({savedProducts.length})
        </button>
      </div>

      {activeTab === 'add' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Form */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  value={productData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Product Name e.g. Wordpress Website"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Product Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Description
                </label>
                <textarea
                  value={productData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  placeholder="Enter product description..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg cursor-pointer hover:bg-purple-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Add Product Image</span>
                </label>
                {productData.imageUrl && (
                  <div className="mt-2">
                    <img src={productData.imageUrl} alt="Product" className="w-32 h-32 object-cover rounded-lg" />
                  </div>
                )}
              </div>

              {/* Billing Mode */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Billing Mode
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subscription Cycle
                    </label>
                    <select
                      value={productData.subscriptionCycle}
                      onChange={(e) => handleInputChange('subscriptionCycle', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Price
                  </label>
                  <input
                    type="number"
                    value={productData.basePrice}
                    onChange={(e) => handleInputChange('basePrice', e.target.value)}
                    placeholder="$500"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    value={productData.discount}
                    onChange={(e) => handleInputChange('discount', e.target.value)}
                    placeholder="10"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Select Group */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Group
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={groupSearchTerm}
                    onChange={(e) => setGroupSearchTerm(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddGroup();
                      }
                    }}
                    placeholder="Search/Add a Group e.g. Website, Digital..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {groupSearchTerm && !groups.find(g => g.name.toLowerCase() === groupSearchTerm.toLowerCase()) && (
                    <button
                      type="button"
                      onClick={handleAddGroup}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Add
                    </button>
                  )}
                </div>
                {productData.groupId && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-sm">
                      {productData.groupName}
                      <button
                        type="button"
                        onClick={() => handleInputChange('groupId', '')}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                )}
                {groupSearchTerm && filteredGroups.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg z-50 hide-scrollbar">
                    {filteredGroups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          handleGroupSelect(group.id);
                          setGroupSearchTerm('');
                        }}
                        className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          productData.groupId === group.id
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {group.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Attributes */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Product Attributes</h3>
                {productData.attributes.map((attribute, index) => (
                  <ProductAttributeForm
                    key={attribute.id}
                    attribute={attribute}
                    index={index}
                    availableAttributes={availableAttributes}
                    onDelete={() => handleDeleteAttribute(attribute.id)}
                    onChange={(field, value) => handleAttributeChange(attribute.id, field, value)}
                    onTypeChange={(uiType) => handleAttributeTypeChange(attribute.id, uiType)}
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
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>+ Add Product Attribute</span>
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Product'}
              </button>
            </form>
          </div>

          {/* Right Side - Preview */}
          <div className="lg:sticky lg:top-8 h-fit">
            <ProductPreview productData={productData} />
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="space-y-4">
          {savedProducts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-gray-500 text-lg">No products saved yet</p>
              <p className="text-gray-400 text-sm mt-2">Add your first product to see it here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
                  {product.imageUrl && (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover rounded-lg mb-4" />
                  )}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                  {product.group?.name && (
                    <p className="text-sm text-gray-600 mb-2">{product.group.name}</p>
                  )}
                  {product.description && (
                    <p className="text-sm text-gray-700 mb-4 line-clamp-2">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-900">
                      {product.basePrice ? `$${(product.basePrice.amount / 100).toFixed(2)}` : 'Price not set'}
                      {product.discount && (
                        <span className="text-sm text-red-600 ml-2">-{product.discount}%</span>
                      )}
                    </span>
                    <span className="text-sm text-gray-500 capitalize">{product.billingMode || 'N/A'}</span>
                  </div>
                  {product.attributes && product.attributes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500">{product.attributes.length} attribute(s)</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
  onTypeChange,
  onTypeValueChange,
  onAddOption,
  onOptionChange,
  onDeleteOption,
}) {
  const [searchTerm, setSearchTerm] = useState(attribute.attributeName || '');

  const uiType = attribute.uiType || 'dropdown';
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

  // Get the current type's configuration
  const getTypeConfig = () => {
    switch (uiType) {
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

  const typeConfig = getTypeConfig();
  const optionType = ['dropdown', 'checkbox', 'radio'].includes(uiType) ? uiType : null;

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">Add Product Attribute</h4>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center space-x-1 text-red-600 hover:text-red-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-sm">Delete This Section</span>
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
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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

      {/* Mandatory and Subscription Toggle */}
      <div className="flex items-center space-x-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={attribute.isMandatory}
            onChange={(e) => onChange('isMandatory', e.target.checked)}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <span className="text-sm text-gray-700">Make This Mandatory</span>
        </label>
        <label className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Subscription Mode</span>
          <input
            type="checkbox"
            checked={attribute.isSubscription}
            onChange={(e) => onChange('isSubscription', e.target.checked)}
            className="w-11 h-6 bg-gray-200 rounded-full appearance-none cursor-pointer relative transition-colors checked:bg-green-500"
            style={{
              background: attribute.isSubscription ? '#10b981' : '#e5e7eb',
            }}
          />
        </label>
      </div>

      {/* Attribute Type Selection - Single Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Attribute Type
        </label>
        <div className="grid grid-cols-5 gap-2">
          {['dropdown', 'checkbox', 'radio', 'slider', 'number_input'].map((type) => (
            <label
              key={type}
              className={`p-3 border-2 rounded-lg transition-all cursor-pointer ${
                uiType === type
                ? 'border-purple-500 bg-purple-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            >
                  <input
                type="radio"
                name={`attribute-type-${attribute.id}`}
                value={type}
                checked={uiType === type}
                onChange={(e) => onTypeChange(e.target.value)}
                className="sr-only"
              />
              <div className="text-center">
                <div className="text-xs font-medium text-gray-700 capitalize">
                  {type === 'number_input' ? 'Number' : type}
                  </div>
                {uiType === type && (
                  <svg className="w-4 h-4 mx-auto mt-1 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Slider Configuration */}
      {uiType === 'slider' && (
        <div className="space-y-3 p-3 bg-purple-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slider Value: {typeConfig.value || 50}
            </label>
            <input
              type="range"
              min={typeConfig.min || 0}
              max={typeConfig.max || 100}
              value={typeConfig.value || 50}
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
              value={typeConfig.perUnitPrice || ''}
              onChange={(e) => onTypeValueChange('slider', 'perUnitPrice', e.target.value)}
              placeholder="$500"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Number Input Configuration */}
      {uiType === 'number_input' && (
        <div className="space-y-3 p-3 bg-purple-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Value
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                onClick={() => {
                  const currentValue = parseInt(typeConfig.value || 0);
                  onTypeValueChange('number_input', 'value', Math.max(0, currentValue - 1));
                }}
              >
                -
              </button>
              <input
                type="number"
                value={typeConfig.value || 0}
                onChange={(e) => onTypeValueChange('number_input', 'value', parseInt(e.target.value) || 0)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-center"
              />
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                onClick={() => {
                  const currentValue = parseInt(typeConfig.value || 0);
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
              value={typeConfig.perUnitPrice || ''}
              onChange={(e) => onTypeValueChange('number_input', 'perUnitPrice', e.target.value)}
              placeholder="$500"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Options Configuration (for dropdown, checkbox, radio) */}
      {optionType && (
        <div className="space-y-3 p-3 bg-purple-50 rounded-lg">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 capitalize">
              {optionType} Options
            </label>
            <button
              type="button"
              onClick={() => onAddOption(optionType)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + Add Option
            </button>
          </div>
          {typeConfig.options?.map((option, optIndex) => (
            <div key={option.id} className="space-y-2 p-3 bg-white rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Option Name</label>
                  <input
                    type="text"
                    value={option.label || ''}
                    onChange={(e) => onOptionChange(optionType, option.id, 'label', e.target.value)}
                    placeholder={`Option ${optIndex + 1} e.g. Portfolio Website`}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Per Unit Price</label>
                  <input
                    type="text"
                    value={option.perUnitPrice || ''}
                    onChange={(e) => onOptionChange(optionType, option.id, 'perUnitPrice', e.target.value)}
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
                    onChange={(e) => onOptionChange(optionType, option.id, 'totalUnits', e.target.value)}
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
              <button
                type="button"
                onClick={() => onDeleteOption(optionType, option.id)}
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
