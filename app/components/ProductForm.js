'use client';

import { useState, useEffect } from 'react';
import ProductPreview from './ProductPreview';

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

  const [savedProducts, setSavedProducts] = useState([]);
  const [groupSearchTerm, setGroupSearchTerm] = useState('');

  // Load saved products from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('savedProducts');
    if (saved) {
      setSavedProducts(JSON.parse(saved));
    }
  }, []);

  // Load groups from localStorage or use default
  const [groups, setGroups] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('productGroups');
      return saved ? JSON.parse(saved) : [
        { id: '1', name: 'Website Development', slug: 'website-development' },
        { id: '2', name: 'Web Hosting Services', slug: 'web-hosting-services' },
        { id: '3', name: 'Digital Marketing', slug: 'digital-marketing' },
      ];
    }
    return [
      { id: '1', name: 'Website Development', slug: 'website-development' },
      { id: '2', name: 'Web Hosting Services', slug: 'web-hosting-services' },
      { id: '3', name: 'Digital Marketing', slug: 'digital-marketing' },
    ];
  });

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
      selectedTypes: [], // Array to hold multiple types
      types: {
        slider: { enabled: false, value: 50, min: 0, max: 100, perUnitPrice: '' },
        number: { enabled: false, value: 0, perUnitPrice: '' },
        dropdown: { enabled: false, options: [] },
      },
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

  const handleAttributeTypeToggle = (attributeId, type) => {
    setProductData(prev => ({
      ...prev,
      attributes: prev.attributes.map(f => {
        if (f.id === attributeId) {
          // Ensure types object exists
          const currentTypes = f.types || {
            slider: { enabled: false, value: 50, min: 0, max: 100, perUnitPrice: '' },
            number: { enabled: false, value: 0, perUnitPrice: '' },
            dropdown: { enabled: false, options: [] },
          };
          
          // Ensure the specific type exists
          if (!currentTypes[type]) {
            if (type === 'slider') {
              currentTypes[type] = { enabled: false, value: 50, min: 0, max: 100, perUnitPrice: '' };
            } else if (type === 'number') {
              currentTypes[type] = { enabled: false, value: 0, perUnitPrice: '' };
            } else if (type === 'dropdown') {
              currentTypes[type] = { enabled: false, options: [] };
            }
          }
          
          const newTypes = { ...currentTypes };
          newTypes[type] = {
            ...newTypes[type],
            enabled: !newTypes[type].enabled,
          };
          
          const selectedTypes = Object.keys(newTypes).filter(t => newTypes[t].enabled);
          
          return {
            ...f,
            types: newTypes,
            selectedTypes,
          };
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
            types: {
              ...f.types,
              [type]: {
                ...f.types[type],
                [field]: value,
              },
            },
          };
        }
        return f;
      }),
    }));
  };

  const handleAddDropdownOption = (attributeId) => {
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
            types: {
              ...f.types,
              dropdown: {
                ...f.types.dropdown,
                options: [...(f.types.dropdown.options || []), newOption],
              },
            },
          };
        }
        return f;
      }),
    }));
  };

  const handleDropdownOptionChange = (attributeId, optionId, field, value) => {
    setProductData(prev => ({
      ...prev,
      attributes: prev.attributes.map(f => {
        if (f.id === attributeId) {
          const updatedOptions = f.types.dropdown.options.map(opt => {
            if (opt.id === optionId) {
              const updated = { ...opt, [field]: value };
              // Calculate total if perUnitPrice and totalUnits are both set
              if (field === 'perUnitPrice' || field === 'totalUnits') {
                const perUnit = parseFloat(updated.perUnitPrice) || 0;
                const units = parseFloat(updated.totalUnits) || 0;
                updated.totalPrice = (perUnit * units).toFixed(2);
              }
              return updated;
            }
            return opt;
          });
          return {
            ...f,
            types: {
              ...f.types,
              dropdown: {
                ...f.types.dropdown,
                options: updatedOptions,
              },
            },
          };
        }
        return f;
      }),
    }));
  };

  const handleDeleteDropdownOption = (attributeId, optionId) => {
    setProductData(prev => ({
      ...prev,
      attributes: prev.attributes.map(f => {
        if (f.id === attributeId) {
          return {
            ...f,
            types: {
              ...f.types,
              dropdown: {
                ...f.types.dropdown,
                options: f.types.dropdown.options.filter(opt => opt.id !== optionId),
              },
            },
          };
        }
        return f;
      }),
    }));
  };

  const handleAddGroup = () => {
    if (groupSearchTerm.trim()) {
      const newGroup = {
        id: `group_${Date.now()}`,
        name: groupSearchTerm.trim(),
        slug: groupSearchTerm.trim().toLowerCase().replace(/\s+/g, '-'),
      };
      const updatedGroups = [...groups, newGroup];
      setGroups(updatedGroups);
      localStorage.setItem('productGroups', JSON.stringify(updatedGroups));
      setProductData(prev => ({
        ...prev,
        groupId: newGroup.id,
        groupName: newGroup.name,
      }));
      setGroupSearchTerm('');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const newProduct = {
      ...productData,
      id: `prod_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updatedProducts = [...savedProducts, newProduct];
    setSavedProducts(updatedProducts);
    localStorage.setItem('savedProducts', JSON.stringify(updatedProducts));
    
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
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(groupSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
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
              <div>
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
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg">
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
                    onTypeToggle={(type) => handleAttributeTypeToggle(attribute.id, type)}
                    onTypeValueChange={(type, field, value) => handleAttributeTypeValueChange(attribute.id, type, field, value)}
                    onAddDropdownOption={() => handleAddDropdownOption(attribute.id)}
                    onDropdownOptionChange={(optionId, field, value) =>
                      handleDropdownOptionChange(attribute.id, optionId, field, value)
                    }
                    onDeleteDropdownOption={(optionId) =>
                      handleDeleteDropdownOption(attribute.id, optionId)
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
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                Save Product
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
                  {product.groupName && (
                    <p className="text-sm text-gray-600 mb-2">{product.groupName}</p>
                  )}
                  {product.description && (
                    <p className="text-sm text-gray-700 mb-4 line-clamp-2">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-900">
                      ${product.basePrice}
                      {product.discount && (
                        <span className="text-sm text-red-600 ml-2">-{product.discount}%</span>
                      )}
                    </span>
                    <span className="text-sm text-gray-500 capitalize">{product.billingMode}</span>
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
  onTypeToggle,
  onTypeValueChange,
  onAddDropdownOption,
  onDropdownOptionChange,
  onDeleteDropdownOption,
}) {
  const [searchTerm, setSearchTerm] = useState(attribute.attributeName || '');

  // Ensure types are always initialized
  const attributeTypes = attribute.types || {
    slider: { enabled: false, value: 50, min: 0, max: 100, perUnitPrice: '' },
    number: { enabled: false, value: 0, perUnitPrice: '' },
    dropdown: { enabled: false, options: [] },
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
      <div>
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
          <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-lg max-h-40 overflow-y-auto z-10">
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

      {/* Attribute Type Selection - Multiple Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Attribute Type (Multiple Selection Allowed)
        </label>
        <div className="grid grid-cols-3 gap-4">
          {/* Slider */}
          <div
            className={`p-4 border-2 rounded-lg transition-all transform hover:scale-105 cursor-pointer ${
              attributeTypes.slider?.enabled
                ? 'border-purple-500 bg-purple-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onTypeToggle('slider');
            }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 font-medium">Slider</span>
                {attributeTypes.slider?.enabled && (
                  <svg className="w-5 h-5 text-blue-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {attributeTypes.slider?.enabled && (
                <div className="relative animate-slide-down" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="range"
                    min={attributeTypes.slider.min || 0}
                    max={attributeTypes.slider.max || 100}
                    value={attributeTypes.slider.value || 50}
                    onChange={(e) => {
                      e.stopPropagation();
                      onTypeValueChange('slider', 'value', parseInt(e.target.value));
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full slider-animated"
                  />
                  <div className="text-center text-sm font-medium mt-1">
                    {attributeTypes.slider.value || 50}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Number Input */}
          <div
            className={`p-4 border-2 rounded-lg transition-all transform hover:scale-105 cursor-pointer ${
              attributeTypes.number?.enabled
                ? 'border-purple-500 bg-purple-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onTypeToggle('number');
            }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 font-medium">Number</span>
                {attributeTypes.number?.enabled && (
                  <svg className="w-5 h-5 text-blue-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {attributeTypes.number?.enabled && (
                <div className="flex items-center space-x-2 animate-slide-down" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentValue = parseInt(attributeTypes.number.value || 0);
                      onTypeValueChange('number', 'value', Math.max(0, currentValue - 1));
                    }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={attributeTypes.number.value || 0}
                    onChange={(e) => {
                      e.stopPropagation();
                      onTypeValueChange('number', 'value', parseInt(e.target.value) || 0);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-center number-animated"
                  />
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentValue = parseInt(attributeTypes.number.value || 0);
                      onTypeValueChange('number', 'value', currentValue + 1);
                    }}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Dropdown */}
          <div
            className={`p-4 border-2 rounded-lg transition-all transform hover:scale-105 cursor-pointer ${
              attributeTypes.dropdown?.enabled
                ? 'border-purple-500 bg-purple-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onTypeToggle('dropdown');
            }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 font-medium">Dropdown</span>
                {attributeTypes.dropdown?.enabled && (
                  <svg className="w-5 h-5 text-blue-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="border border-gray-300 rounded px-2 py-1 text-sm">
                Dropdown
                <svg className="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slider Configuration */}
      {attributeTypes.slider?.enabled && (
        <div className="space-y-3 p-3 bg-purple-50 rounded-lg animate-slide-down">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Per Unit Price (Slider)
            </label>
            <input
              type="text"
              value={attributeTypes.slider.perUnitPrice || ''}
              onChange={(e) => onTypeValueChange('slider', 'perUnitPrice', e.target.value)}
              placeholder="$500"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Number Configuration */}
      {attributeTypes.number?.enabled && (
        <div className="space-y-3 p-3 bg-purple-50 rounded-lg animate-slide-down">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Per Unit Price (Number)
            </label>
            <input
              type="text"
              value={attributeTypes.number.perUnitPrice || ''}
              onChange={(e) => onTypeValueChange('number', 'perUnitPrice', e.target.value)}
              placeholder="$500"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Dropdown Options */}
      {attributeTypes.dropdown?.enabled && (
        <div className="space-y-3 p-3 bg-purple-50 rounded-lg animate-slide-down">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Dropdown Options
            </label>
            <button
              type="button"
              onClick={onAddDropdownOption}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + Add Option
            </button>
          </div>
          {attributeTypes.dropdown.options?.map((option, optIndex) => (
            <div key={option.id} className="space-y-2 p-3 bg-white rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Option Name</label>
                  <input
                    type="text"
                    value={option.label || ''}
                    onChange={(e) => onDropdownOptionChange(option.id, 'label', e.target.value)}
                    placeholder={`Option ${optIndex + 1} e.g. Portfolio Website`}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Per Unit Price</label>
                  <input
                    type="text"
                    value={option.perUnitPrice || ''}
                    onChange={(e) => onDropdownOptionChange(option.id, 'perUnitPrice', e.target.value)}
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
                    onChange={(e) => onDropdownOptionChange(option.id, 'totalUnits', e.target.value)}
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
                onClick={() => onDeleteDropdownOption(option.id)}
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
