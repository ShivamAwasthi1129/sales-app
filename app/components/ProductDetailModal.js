'use client';

import { useEffect, useState } from 'react';

export default function ProductDetailModal({ product, isOpen, onClose }) {
  const [selectedValues, setSelectedValues] = useState({});

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Initialize selected values
      if (product?.attributes) {
        const initialValues = {};
        product.attributes.forEach((attr) => {
          if (attr.uiType === 'checkbox') {
            initialValues[attr.id] = [];
          } else if (attr.uiType === 'radio' || attr.uiType === 'dropdown') {
            const firstOption = attr.options?.[0];
            if (firstOption) {
              initialValues[attr.id] = firstOption.id || firstOption.value;
            }
          }
        });
        setSelectedValues(initialValues);
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const calculateDiscountPrice = () => {
    if (!product.basePrice || !product.discount) return null;
    const base = parseFloat(product.basePrice) || 0;
    const discount = parseFloat(product.discount) || 0;
    const discountMultiplier = discount * 0.01;
    const discountAmount = base * discountMultiplier;
    const discounted = base - discountAmount;
    return discounted.toFixed(2);
  };

  const discountedPrice = calculateDiscountPrice();
  
  const calculateSliderWidth = (value, max) => {
    if (max <= 0) return 0;
    const multiplier = 100;
    const inverseMax = Math.pow(max, -1);
    const percentage = value * multiplier * inverseMax;
    return Math.round(percentage);
  };

  const formatPrice = (price) => {
    if (!price) return '$0.00';
    const amount = typeof price === 'object' ? (price.amount / 100) : parseFloat(price) || 0;
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-gray-900 transition-opacity"
        style={{ opacity: 0.75 }}
        onClick={onClose}
      ></div>

      {/* Modal panel */}
      <div
        className="relative bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all w-full max-w-4xl max-h-[90vh] flex flex-col z-10"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white">Product Details</h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-white hover:bg-opacity-20"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="bg-white p-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Product Image */}
                {product.imageUrl ? (
                  <div className="w-full h-64 bg-gray-100 rounded-xl overflow-hidden shadow-lg">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                    <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                {/* Product Name & Group */}
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h2>
                  {product.groupName && (
                    <div className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                      {product.groupName}
                    </div>
                  )}
                </div>

                {/* Description */}
                {product.description && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
                    <p className="text-gray-600 leading-relaxed">{product.description}</p>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Pricing Information */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">Pricing Information</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Billing Mode:</span>
                      <span className="text-sm font-medium text-gray-900 capitalize px-3 py-1 bg-white rounded-lg">
                        {product.billingMode === 'subscription' ? 'Subscription' : 'One-Time'}
                      </span>
                    </div>
                    
                    {product.billingMode === 'subscription' && product.subscriptionCycle && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Cycle:</span>
                        <span className="text-sm font-medium text-gray-900 capitalize px-3 py-1 bg-white rounded-lg">
                          {product.subscriptionCycle}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <span className="text-base font-semibold text-gray-900">Base Price:</span>
                      <div className="flex items-center space-x-2">
                        {discountedPrice ? (
                          <>
                            <span className="text-base line-through text-gray-400">
                              ${product.basePrice}
                            </span>
                            <span className="text-xl font-bold text-purple-600">
                              ${discountedPrice}
                            </span>
                          </>
                        ) : (
                          <span className="text-xl font-bold text-gray-900">
                            ${product.basePrice || '0'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {product.discount && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Discount:</span>
                        <span className="text-sm font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg">
                          {product.discount}% OFF
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Attributes */}
                {product.attributes && product.attributes.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Attributes</h4>
                    <div className="space-y-3">
                      {product.attributes.map((attribute, index) => {
                        // Get UI type directly from attribute
                        const uiType = attribute.uiType || 
                                      (attribute.types?.dropdown?.enabled ? 'dropdown' : 
                                      attribute.types?.slider?.enabled ? 'slider' :
                                      attribute.types?.number?.enabled ? 'number_input' :
                                      attribute.types?.checkbox?.enabled ? 'checkbox' :
                                      attribute.types?.radio?.enabled ? 'radio' : 'dropdown');
                        
                        // Get options from attribute - check both database format and converted format
                        let options = [];
                        if (attribute.options && attribute.options.length > 0) {
                          // Database format - options are directly on attribute
                          options = attribute.options;
                        } else if (attribute.types) {
                          // Converted format - options are in types
                          options = attribute.types?.dropdown?.options ||
                                   attribute.types?.checkbox?.options ||
                                   attribute.types?.radio?.options || [];
                        }
                        
                        const attributeName = attribute.name || attribute.attributeName || `Attribute ${index + 1}`;
                        
                        // Get UI type display name
                        const uiTypeDisplay = uiType === 'number_input' ? 'Number Input' : 
                                            uiType === 'checkbox' ? 'Checkbox' :
                                            uiType === 'radio' ? 'Radio' :
                                            uiType === 'slider' ? 'Slider' : 'Dropdown';
                        
                        return (
                          <div
                            key={attribute.id || index}
                            className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-gray-800">
                                {attributeName}
                                {attribute.isMandatory && <span className="text-red-500 ml-1">*</span>}
                              </span>
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded capitalize">
                                {uiTypeDisplay}
                              </span>
                            </div>
                            
                            {/* Dropdown Display */}
                            {uiType === 'dropdown' && options && options.length > 0 && (
                              <div className="space-y-3">
                                <select
                                  value={selectedValues[attribute.id] || ''}
                                  onChange={(e) => setSelectedValues(prev => ({ ...prev, [attribute.id]: e.target.value }))}
                                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 cursor-pointer"
                                >
                                  <option value="">Select an option...</option>
                                  {options.map((opt, optIdx) => {
                                    const optionId = opt.id || opt.value || optIdx;
                                    const optionLabel = opt.label || opt.value || `Option ${optIdx + 1}`;
                                    const price = opt.price ? formatPrice(opt.price) : '';
                                    const displayText = price ? `${optionLabel} - ${price}` : optionLabel;
                                    return (
                                      <option key={optionId} value={optionId}>
                                        {displayText}
                                      </option>
                                    );
                                  })}
                                </select>
                                {selectedValues[attribute.id] && (() => {
                                  const selectedOption = options.find(opt => (opt.id || opt.value) === selectedValues[attribute.id]);
                                  if (selectedOption) {
                                    const priceAmount = selectedOption.price?.amount ? (selectedOption.price.amount / 100) : 0;
                                    const perUnitPrice = selectedOption.perUnitPrice || formatPrice(selectedOption.price);
                                    const totalUnits = selectedOption.totalUnits || '1';
                                    const totalPrice = selectedOption.totalPrice || priceAmount.toFixed(2);
                                    
                                    return (
                                      <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                                        <div className="text-sm font-semibold text-purple-900 mb-2">{selectedOption.label || selectedOption.value}</div>
                                        {selectedOption.description && (
                                          <div className="text-xs text-gray-600 mb-2">{selectedOption.description}</div>
                                        )}
                                        <div className="space-y-1 text-xs text-gray-700">
                                          {perUnitPrice && (
                                            <div className="flex justify-between">
                                              <span>Per Unit Price:</span>
                                              <span className="font-semibold">{perUnitPrice}</span>
                                            </div>
                                          )}
                                          {totalUnits && totalUnits !== '1' && (
                                            <div className="flex justify-between">
                                              <span>Total Units:</span>
                                              <span className="font-semibold">{totalUnits}</span>
                                            </div>
                                          )}
                                          {totalPrice && (
                                            <div className="flex justify-between pt-1 border-t border-purple-200">
                                              <span className="font-semibold">Total Price:</span>
                                              <span className="font-bold text-purple-700">${totalPrice}</span>
                                            </div>
                                          )}
                                          {selectedOption.price?.billingType === 'recurring' && selectedOption.price?.interval && (
                                            <div className="flex justify-between mt-1">
                                              <span>Billing:</span>
                                              <span className="font-semibold text-green-700">Recurring / {selectedOption.price.interval}</span>
                                            </div>
                                          )}
                                          {selectedOption.price?.billingType === 'one_time' && (
                                            <div className="flex justify-between mt-1">
                                              <span>Billing:</span>
                                              <span className="font-semibold text-blue-700">One-Time</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            )}
                            
                            {/* Checkbox Display */}
                            {uiType === 'checkbox' && options && options.length > 0 && (
                              <div className="space-y-2">
                                {options.map((opt, optIdx) => {
                                  const optionId = opt.id || opt.value || optIdx;
                                  const optionLabel = opt.label || opt.value || `Option ${optIdx + 1}`;
                                  const isChecked = Array.isArray(selectedValues[attribute.id]) && selectedValues[attribute.id].includes(optionId);
                                  const priceAmount = opt.price?.amount ? (opt.price.amount / 100) : 0;
                                  const perUnitPrice = opt.perUnitPrice || formatPrice(opt.price);
                                  const totalUnits = opt.totalUnits || '1';
                                  const totalPrice = opt.totalPrice || priceAmount.toFixed(2);
                                  
                                  return (
                                    <label key={optionId} className="flex items-start space-x-3 p-3 rounded-lg border-2 border-gray-200 hover:border-purple-300 cursor-pointer transition-all bg-white">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const current = selectedValues[attribute.id] || [];
                                          if (e.target.checked) {
                                            setSelectedValues(prev => ({ ...prev, [attribute.id]: [...current, optionId] }));
                                          } else {
                                            setSelectedValues(prev => ({ ...prev, [attribute.id]: current.filter(id => id !== optionId) }));
                                          }
                                        }}
                                        className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                                      />
                                      <div className="flex-1">
                                        <div className="text-sm font-semibold text-gray-900">{optionLabel}</div>
                                        {opt.description && (
                                          <div className="text-xs text-gray-600 mt-1">{opt.description}</div>
                                        )}
                                        <div className="mt-2 space-y-1 text-xs text-gray-700">
                                          {perUnitPrice && (
                                            <div className="flex justify-between">
                                              <span>Per Unit Price:</span>
                                              <span className="font-semibold">{perUnitPrice}</span>
                                            </div>
                                          )}
                                          {totalUnits && totalUnits !== '1' && (
                                            <div className="flex justify-between">
                                              <span>Total Units:</span>
                                              <span className="font-semibold">{totalUnits}</span>
                                            </div>
                                          )}
                                          {totalPrice && (
                                            <div className="flex justify-between pt-1 border-t border-gray-200">
                                              <span className="font-semibold">Total Price:</span>
                                              <span className="font-bold text-purple-700">${totalPrice}</span>
                                            </div>
                                          )}
                                          {opt.price?.billingType === 'recurring' && opt.price?.interval && (
                                            <div className="flex justify-between mt-1">
                                              <span>Billing:</span>
                                              <span className="font-semibold text-green-700">Recurring / {opt.price.interval}</span>
                                            </div>
                                          )}
                                          {opt.price?.billingType === 'one_time' && (
                                            <div className="flex justify-between mt-1">
                                              <span>Billing:</span>
                                              <span className="font-semibold text-blue-700">One-Time</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                            
                            {/* Radio Display */}
                            {uiType === 'radio' && options && options.length > 0 && (
                              <div className="space-y-2">
                                {options.map((opt, optIdx) => {
                                  const optionId = opt.id || opt.value || optIdx;
                                  const optionLabel = opt.label || opt.value || `Option ${optIdx + 1}`;
                                  const isChecked = selectedValues[attribute.id] === optionId;
                                  const priceAmount = opt.price?.amount ? (opt.price.amount / 100) : 0;
                                  const perUnitPrice = opt.perUnitPrice || formatPrice(opt.price);
                                  const totalUnits = opt.totalUnits || '1';
                                  const totalPrice = opt.totalPrice || priceAmount.toFixed(2);
                                  
                                  return (
                                    <label key={optionId} className="flex items-start space-x-3 p-3 rounded-lg border-2 border-gray-200 hover:border-purple-300 cursor-pointer transition-all bg-white">
                                      <input
                                        type="radio"
                                        name={`attr-${attribute.id || index}`}
                                        checked={isChecked}
                                        onChange={() => setSelectedValues(prev => ({ ...prev, [attribute.id]: optionId }))}
                                        className="mt-1 w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500 cursor-pointer"
                                      />
                                      <div className="flex-1">
                                        <div className="text-sm font-semibold text-gray-900">{optionLabel}</div>
                                        {opt.description && (
                                          <div className="text-xs text-gray-600 mt-1">{opt.description}</div>
                                        )}
                                        <div className="mt-2 space-y-1 text-xs text-gray-700">
                                          {perUnitPrice && (
                                            <div className="flex justify-between">
                                              <span>Per Unit Price:</span>
                                              <span className="font-semibold">{perUnitPrice}</span>
                                            </div>
                                          )}
                                          {totalUnits && totalUnits !== '1' && (
                                            <div className="flex justify-between">
                                              <span>Total Units:</span>
                                              <span className="font-semibold">{totalUnits}</span>
                                            </div>
                                          )}
                                          {totalPrice && (
                                            <div className="flex justify-between pt-1 border-t border-gray-200">
                                              <span className="font-semibold">Total Price:</span>
                                              <span className="font-bold text-purple-700">${totalPrice}</span>
                                            </div>
                                          )}
                                          {opt.price?.billingType === 'recurring' && opt.price?.interval && (
                                            <div className="flex justify-between mt-1">
                                              <span>Billing:</span>
                                              <span className="font-semibold text-green-700">Recurring / {opt.price.interval}</span>
                                            </div>
                                          )}
                                          {opt.price?.billingType === 'one_time' && (
                                            <div className="flex justify-between mt-1">
                                              <span>Billing:</span>
                                              <span className="font-semibold text-blue-700">One-Time</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                            
                            {/* Slider Display */}
                            {uiType === 'slider' && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">Value:</span>
                                  <span className="font-semibold text-purple-600">
                                    {selectedValues[attribute.id] !== undefined 
                                      ? selectedValues[attribute.id] 
                                      : (attribute.types?.slider?.value || attribute.configuration?.value || attribute.value || 0)}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={attribute.types?.slider?.min || attribute.configuration?.min || 0}
                                  max={attribute.types?.slider?.max || attribute.configuration?.max || 100}
                                  value={selectedValues[attribute.id] !== undefined 
                                    ? selectedValues[attribute.id] 
                                    : (attribute.types?.slider?.value || attribute.configuration?.value || attribute.value || 0)}
                                  onChange={(e) => setSelectedValues(prev => ({ ...prev, [attribute.id]: parseInt(e.target.value) }))}
                                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                  style={{
                                    background: `linear-gradient(to right, rgb(147, 51, 234) 0%, rgb(147, 51, 234) ${calculateSliderWidth(
                                      selectedValues[attribute.id] !== undefined 
                                        ? selectedValues[attribute.id] 
                                        : (attribute.types?.slider?.value || attribute.configuration?.value || attribute.value || 0),
                                      attribute.types?.slider?.max || attribute.configuration?.max || 100
                                    )}%, rgb(229, 231, 235) ${calculateSliderWidth(
                                      selectedValues[attribute.id] !== undefined 
                                        ? selectedValues[attribute.id] 
                                        : (attribute.types?.slider?.value || attribute.configuration?.value || attribute.value || 0),
                                      attribute.types?.slider?.max || attribute.configuration?.max || 100
                                    )}%, rgb(229, 231, 235) 100%)`
                                  }}
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>Min: {attribute.types?.slider?.min || attribute.configuration?.min || 0}</span>
                                  <span>Max: {attribute.types?.slider?.max || attribute.configuration?.max || 100}</span>
                                </div>
                              </div>
                            )}
                            
                            {/* Number Input Display */}
                            {uiType === 'number_input' && (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  value={selectedValues[attribute.id] !== undefined 
                                    ? selectedValues[attribute.id] 
                                    : (attribute.types?.number?.value || attribute.configuration?.value || attribute.value || 0)}
                                  onChange={(e) => setSelectedValues(prev => ({ ...prev, [attribute.id]: parseFloat(e.target.value) || 0 }))}
                                  min={attribute.types?.number?.min || attribute.configuration?.min}
                                  max={attribute.types?.number?.max || attribute.configuration?.max}
                                  step={attribute.types?.number?.step || attribute.configuration?.step || 1}
                                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
    </div>
  );
}
