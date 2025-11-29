'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

export default function ProductSelectorModal({ isOpen, onClose, products, onSelectProduct, loading, editingProduct = null }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedCheckboxes, setSelectedCheckboxes] = useState({}); // For multiple checkbox selections
  const [filteredProducts, setFilteredProducts] = useState([]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // If editing, pre-populate the product
      if (editingProduct && products && products.length > 0) {
        const product = products.find(p => p.id === editingProduct.productId);
        if (product) {
          console.log('[ProductSelectorModal] Pre-populating product for editing:', product);
          setSelectedProduct(product);
          
          // Pre-populate selected options from editingProduct
          // This is a simplified version - you may need to enhance based on your data structure
          const initialOptions = {};
          const initialCheckboxes = {};
          
          if (editingProduct.selectedOptions && Array.isArray(editingProduct.selectedOptions)) {
            // Group options by attribute
            editingProduct.selectedOptions.forEach(opt => {
              // Find the attribute and option in the product
              const attribute = product.attributes?.find(attr => attr.name === opt.attributeName);
              if (attribute) {
                const option = attribute.options?.find(o => o.label === opt.optionLabel);
                if (option) {
                  if (attribute.uiType === 'checkbox') {
                    if (!initialCheckboxes[attribute.id]) {
                      initialCheckboxes[attribute.id] = [];
                    }
                    initialCheckboxes[attribute.id].push({ ...option, attributeName: attribute.name });
                  } else {
                    initialOptions[attribute.id] = { ...option, attributeName: attribute.name };
                  }
                }
              }
            });
          }
          
          setSelectedOptions(initialOptions);
          setSelectedCheckboxes(initialCheckboxes);
        }
      }
    } else {
      document.body.style.overflow = 'unset';
      // Reset when modal closes
      setSearchTerm('');
      setSelectedProduct(null);
      setSelectedOptions({});
      setSelectedCheckboxes({});
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, editingProduct, products]);

  useEffect(() => {
    if (products && Array.isArray(products)) {
      // Show all products (not just active) or filter by search term
      let filtered = products;
      
      // Filter by search term if provided
      if (searchTerm.trim()) {
        filtered = products.filter(product => 
          product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.group?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [searchTerm, products]);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    
    // Initialize selected options with default selections
    const initialOptions = {};
    const initialCheckboxes = {};
    
    product.attributes?.forEach(attr => {
      if (attr.uiType === 'checkbox') {
        // For checkboxes, initialize as empty array
        initialCheckboxes[attr.id] = [];
      } else {
        // For other types, select default or first option if mandatory
        const defaultOption = attr.options?.find(opt => opt.defaultSelected);
        if (defaultOption) {
          initialOptions[attr.id] = defaultOption;
        } else if (attr.isMandatory && attr.options && attr.options.length > 0) {
          initialOptions[attr.id] = attr.options[0];
        }
      }
    });
    
    setSelectedOptions(initialOptions);
    setSelectedCheckboxes(initialCheckboxes);
  };

  const handleOptionChange = (attributeId, option, attribute) => {
    setSelectedOptions(prev => ({
      ...prev,
      [attributeId]: {
        ...option,
        attributeName: attribute.name,
      },
    }));
  };

  const calculateTotalPrice = () => {
    if (!selectedProduct) return 0;

    let total = 0;
    
    // Add base price
    if (selectedProduct.basePrice?.amount) {
      total += selectedProduct.basePrice.amount / 100;
    }
    
    // Add prices from selected options (radio, dropdown, slider, number_input)
    Object.values(selectedOptions).forEach(option => {
      if (option?.price?.amount) {
        total += option.price.amount / 100;
      }
    });
    
    // Add prices from selected checkboxes
    Object.values(selectedCheckboxes).forEach(optionsArray => {
      if (Array.isArray(optionsArray)) {
        optionsArray.forEach(option => {
          if (option?.price?.amount) {
            total += option.price.amount / 100;
          }
        });
      }
    });

    return isNaN(total) ? 0 : total;
  };

  const handleAddToQuotation = () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    // Check if all mandatory attributes are selected
    const mandatoryAttributes = selectedProduct.attributes?.filter(attr => attr.isMandatory) || [];
    
    for (const attr of mandatoryAttributes) {
      if (attr.uiType === 'checkbox') {
        // For mandatory checkboxes, at least one should be selected
        if (!selectedCheckboxes[attr.id] || selectedCheckboxes[attr.id].length === 0) {
          toast.error(`Please select at least one option for ${attr.name}`);
          return;
        }
      } else {
        // For other types, check if option is selected
        if (!selectedOptions[attr.id]) {
          toast.error(`Please select an option for ${attr.name}`);
          return;
        }
      }
    }

    // Combine all selected options
    const allOptions = [
      ...Object.values(selectedOptions),
      ...Object.values(selectedCheckboxes).flat()
    ].filter(Boolean);
    
    onSelectProduct(selectedProduct, allOptions);
    
    // Reset state
    setSelectedProduct(null);
    setSelectedOptions({});
    setSearchTerm('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal panel */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl transform transition-all w-full max-w-6xl max-h-[90vh] overflow-hidden z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Select Product</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/20 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-8rem)]">
          {/* Products List - Left Side */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto p-6">
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
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
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : !products || products.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="mt-4 text-gray-500">No products available</p>
                <p className="mt-2 text-sm text-gray-400">Please create products in the Catalogue section first.</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="mt-4 text-gray-500">No products match your search</p>
                <p className="mt-2 text-sm text-gray-400">Try a different search term.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedProduct?.id === product.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-gray-900 truncate">{product.name}</h4>
                          {selectedProduct?.id === product.id && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Selected
                            </span>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>
                        )}
                        <div className="flex items-center mt-2 space-x-2">
                          {product.group && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {product.group.name}
                            </span>
                          )}
                          {product.billingMode === 'subscription' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              Subscription
                            </span>
                          )}
                        </div>
                        {product.basePrice && (
                          <div className="mt-2 text-lg font-bold text-indigo-600">
                            ${(product.basePrice.amount / 100).toFixed(2)}
                            {product.basePrice.billingType === 'recurring' && (
                              <span className="text-sm font-normal text-gray-500">
                                /{product.basePrice.interval}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Configuration - Right Side */}
          <div className="w-1/2 overflow-y-auto p-6 bg-gray-50">
            {selectedProduct ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedProduct.name}</h3>
                  {selectedProduct.description && (
                    <p className="mt-2 text-gray-600">{selectedProduct.description}</p>
                  )}
                </div>

                {/* Base Price */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Base Price</span>
                    <span className="text-xl font-bold text-gray-900">
                      {selectedProduct.basePrice?.amount
                        ? `$${((selectedProduct.basePrice.amount || 0) / 100).toFixed(2)}`
                        : '$0.00'}
                    </span>
                  </div>
                  {selectedProduct.basePrice?.billingType === 'recurring' && selectedProduct.basePrice?.interval && (
                    <p className="text-sm text-gray-500 mt-1">
                      Billed {selectedProduct.basePrice.interval}ly
                    </p>
                  )}
                </div>

                {/* Attributes/Options */}
                {selectedProduct.attributes && selectedProduct.attributes.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Configure Options</h4>
                    {selectedProduct.attributes.map((attribute) => (
                      <div key={attribute.id} className="bg-white rounded-lg p-4 border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {attribute.name}
                          {attribute.isMandatory && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {attribute.description && (
                          <p className="text-xs text-gray-500 mb-3">{attribute.description}</p>
                        )}

                        {attribute.uiType === 'dropdown' && (
                          <div className="space-y-2">
                            <select
                              value={selectedOptions[attribute.id]?.id || ''}
                              onChange={(e) => {
                                const option = attribute.options.find(opt => opt.id === e.target.value);
                                if (option) handleOptionChange(attribute.id, option, attribute);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              required={attribute.isMandatory}
                            >
                              {!attribute.isMandatory && <option value="">-- Select an option --</option>}
                              {attribute.options.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label} - ${((option.price?.amount || 0) / 100).toFixed(2)}
                                  {option.price?.billingType === 'recurring' && option.price?.interval && ` /${option.price.interval}`}
                                </option>
                              ))}
                            </select>
                            {selectedOptions[attribute.id] && (() => {
                              const selectedOption = attribute.options.find(opt => opt.id === selectedOptions[attribute.id]?.id);
                              if (selectedOption && selectedOption.description) {
                                return (
                                  <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                                    <p className="text-sm text-gray-700">{selectedOption.description}</p>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}

                        {attribute.uiType === 'radio' && (
                          <div className="space-y-2">
                            {attribute.options.map((option) => {
                              const isSelected = selectedOptions[attribute.id]?.id === option.id;
                              
                              return (
                                <label 
                                  key={option.id} 
                                  className={`flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                    isSelected 
                                      ? 'border-indigo-600 bg-indigo-50' 
                                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                  }`}
                                  onClick={(e) => {
                                    // Prevent unselecting by clicking the same radio
                                    if (isSelected) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      return;
                                    }
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name={`attr_${attribute.id}`}
                                    value={option.id}
                                    checked={isSelected}
                                    onChange={() => {
                                      // Only change if not already selected
                                      if (!isSelected) {
                                        handleOptionChange(attribute.id, option, attribute);
                                      }
                                    }}
                                    onClick={(e) => {
                                      // Prevent unselecting when clicking the input directly
                                      if (isSelected) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }
                                    }}
                                    required={attribute.isMandatory}
                                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-900 font-medium">{option.label}</span>
                                      <span className="font-semibold text-gray-900">
                                        ${((option.price?.amount || 0) / 100).toFixed(2)}
                                        {option.price?.billingType === 'recurring' && option.price?.interval && (
                                          <span className="text-sm text-gray-500">/{option.price.interval}</span>
                                        )}
                                      </span>
                                    </div>
                                    {option.description && (
                                      <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <div className="flex-shrink-0">
                                      <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {attribute.uiType === 'checkbox' && (
                          <div className="space-y-2">
                            {attribute.options.map((option) => {
                              const isChecked = selectedCheckboxes[attribute.id]?.some(opt => opt.id === option.id) || false;
                              
                              return (
                                <label key={option.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      setSelectedCheckboxes(prev => {
                                        const currentSelections = prev[attribute.id] || [];
                                        let newSelections;
                                        
                                        if (e.target.checked) {
                                          // Add option with attributeName
                                          newSelections = [...currentSelections, { ...option, attributeName: attribute.name }];
                                        } else {
                                          // Remove option
                                          newSelections = currentSelections.filter(opt => opt.id !== option.id);
                                        }
                                        
                                        return {
                                          ...prev,
                                          [attribute.id]: newSelections
                                        };
                                      });
                                    }}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                  />
                                  <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-900">{option.label}</span>
                                      <span className="font-medium text-gray-900">
                                        ${((option.price?.amount || 0) / 100).toFixed(2)}
                                        {option.price?.billingType === 'recurring' && option.price?.interval && (
                                          <span className="text-sm text-gray-500">/{option.price.interval}</span>
                                        )}
                                      </span>
                                    </div>
                                    {option.description && (
                                      <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {attribute.uiType === 'slider' && attribute.options && attribute.options.length > 0 && (
                          <div className="space-y-4">
                            {attribute.options.map((option) => {
                              const sliderValue = parseInt(selectedOptions[attribute.id]?.value) || parseInt(option.value) || 0;
                              const min = parseInt(option.min) || 0;
                              const max = parseInt(option.max) || 100;
                              const perUnitPrice = (option.price?.amount || 0) / 100;
                              const totalPrice = sliderValue * perUnitPrice;

                              return (
                                <div key={option.id} className="p-4 border border-gray-200 rounded-lg">
                                  <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-medium text-gray-700">{option.label}</label>
                                    <span className="text-sm font-bold text-indigo-600">
                                      {sliderValue} × ${perUnitPrice.toFixed(2)} = ${(isNaN(totalPrice) ? 0 : totalPrice).toFixed(2)}
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min={min}
                                    max={max}
                                    value={sliderValue}
                                    onChange={(e) => {
                                      const newValue = parseInt(e.target.value) || 0;
                                      handleOptionChange(attribute.id, {
                                        ...option,
                                        value: newValue,
                                        price: {
                                          ...option.price,
                                          amount: newValue * perUnitPrice * 100,
                                        },
                                      }, attribute);
                                    }}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                  />
                                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Min: {min}</span>
                                    <span>Max: {max}</span>
                                  </div>
                                  {option.description && (
                                    <p className="text-xs text-gray-500 mt-2">{option.description}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {attribute.uiType === 'number_input' && attribute.options && attribute.options.length > 0 && (
                          <div className="space-y-2">
                            {attribute.options.map((option) => {
                              const inputValue = parseInt(selectedOptions[attribute.id]?.value) || parseInt(option.value) || 0;
                              const perUnitPrice = (option.price?.amount || 0) / 100;
                              const totalPrice = inputValue * perUnitPrice;

                              return (
                                <div key={option.id} className="p-3 border border-gray-200 rounded-lg">
                                  <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-medium text-gray-700">{option.label}</label>
                                    <span className="text-sm font-bold text-indigo-600">
                                      ${(isNaN(totalPrice) ? 0 : totalPrice).toFixed(2)}
                                    </span>
                                  </div>
                                  <input
                                    type="number"
                                    min={option.min || 0}
                                    max={option.max || 999999}
                                    value={inputValue}
                                    onChange={(e) => {
                                      const newValue = parseInt(e.target.value) || 0;
                                      handleOptionChange(attribute.id, {
                                        ...option,
                                        value: newValue,
                                        price: {
                                          ...option.price,
                                          amount: newValue * perUnitPrice * 100,
                                        },
                                      }, attribute);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  />
                                  {option.description && (
                                    <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Total Price */}
                <div className="bg-indigo-50 rounded-lg p-6 border-2 border-indigo-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total Price</span>
                    <span className="text-3xl font-bold text-indigo-600">
                      ${calculateTotalPrice().toFixed(2)}
                    </span>
                  </div>
                  {selectedProduct.basePrice?.billingType === 'recurring' && (
                    <p className="text-sm text-gray-600 mt-2">
                      Per {selectedProduct.basePrice.interval}
                    </p>
                  )}
                </div>

                {/* Add/Update Button */}
                <button
                  type="button"
                  onClick={handleAddToQuotation}
                  className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-colors"
                >
                  {editingProduct ? 'Update Product' : 'Add to Quotation'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="mt-4 text-gray-500">Select a product to configure</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


