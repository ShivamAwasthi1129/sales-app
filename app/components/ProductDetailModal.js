'use client';

import { useEffect } from 'react';

export default function ProductDetailModal({ product, isOpen, onClose }) {
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const calculateDiscountPrice = () => {
    if (!product.basePrice || !product.discount) return null;
    const base = parseFloat(product.basePrice) || 0;
    const discount = parseFloat(product.discount) || 0;
    const discounted = base - (base * discount / 100);
    return discounted.toFixed(2);
  };

  const discountedPrice = calculateDiscountPrice();

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-gray-900/30 bg-opacity-75 transition-opacity"
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
              className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/20 rounded-lg"
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

                {/* Features */}
                {product.features && product.features.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Features</h4>
                    <div className="space-y-3">
                      {product.features.map((feature, index) => (
                        <div
                          key={feature.id || index}
                          className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-purple-300 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-base font-semibold text-gray-900">
                              {feature.featureName || `Feature ${index + 1}`}
                              {feature.isMandatory && (
                                <span className="ml-2 text-red-500 text-xs">*Required</span>
                              )}
                            </span>
                            {feature.isSubscription && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                                Subscription
                              </span>
                            )}
                          </div>

                          {/* Slider Display */}
                          {feature.types?.slider?.enabled && (
                            <div className="bg-purple-50 rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Slider Value:</span>
                                <span className="font-bold text-purple-600">{feature.types.slider.value || 50}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
                                  style={{ width: `${((feature.types.slider.value || 50) / (feature.types.slider.max || 100)) * 100}%` }}
                                ></div>
                              </div>
                              {feature.types.slider.perUnitPrice && (
                                <div className="text-xs text-gray-600 mt-1">
                                  Per Unit: {feature.types.slider.perUnitPrice}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Number Display */}
                          {feature.types?.number?.enabled && (
                            <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Quantity:</span>
                                <span className="font-bold text-blue-600">{feature.types.number.value || 0}</span>
                              </div>
                              {feature.types.number.perUnitPrice && (
                                <div className="text-xs text-gray-600">
                                  Per Unit: {feature.types.number.perUnitPrice}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Dropdown Display */}
                          {feature.types?.dropdown?.enabled && feature.types.dropdown.options && feature.types.dropdown.options.length > 0 && (
                            <div className="bg-green-50 rounded-lg p-3 space-y-2">
                              <div className="text-sm font-medium text-gray-700 mb-2">Options:</div>
                              <div className="space-y-2">
                                {feature.types.dropdown.options.map((option, optIndex) => (
                                  <div
                                    key={option.id || optIndex}
                                    className="bg-white rounded-lg p-3 border border-gray-200"
                                  >
                                    <div className="font-medium text-gray-900 mb-1">
                                      {option.label || `Option ${optIndex + 1}`}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                                      <div>
                                        <span className="text-gray-500">Per Unit:</span>
                                        <div className="font-semibold">{option.perUnitPrice || '$0'}</div>
                                      </div>
                                      {option.totalUnits && (
                                        <div>
                                          <span className="text-gray-500">Units:</span>
                                          <div className="font-semibold">{option.totalUnits}</div>
                                        </div>
                                      )}
                                      {option.totalPrice && (
                                        <div>
                                          <span className="text-gray-500">Total:</span>
                                          <div className="font-bold text-green-600">${option.totalPrice}</div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Checkbox Display */}
                          {feature.types?.checkbox?.enabled && feature.types.checkbox.options && feature.types.checkbox.options.length > 0 && (
                            <div className="bg-yellow-50 rounded-lg p-3 space-y-2">
                              <div className="text-sm font-medium text-gray-700 mb-2">Checkbox Options:</div>
                              <div className="space-y-2">
                                {feature.types.checkbox.options.map((option, optIndex) => (
                                  <div
                                    key={option.id || optIndex}
                                    className="bg-white rounded-lg p-3 border border-gray-200"
                                  >
                                    <div className="font-medium text-gray-900 mb-1">
                                      {option.label || `Option ${optIndex + 1}`}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                                      <div>
                                        <span className="text-gray-500">Per Unit:</span>
                                        <div className="font-semibold">{option.perUnitPrice || '$0'}</div>
                                      </div>
                                      {option.totalUnits && (
                                        <div>
                                          <span className="text-gray-500">Units:</span>
                                          <div className="font-semibold">{option.totalUnits}</div>
                                        </div>
                                      )}
                                      {option.totalPrice && (
                                        <div>
                                          <span className="text-gray-500">Total:</span>
                                          <div className="font-bold text-green-600">${option.totalPrice}</div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Radio Display */}
                          {feature.types?.radio?.enabled && feature.types.radio.options && feature.types.radio.options.length > 0 && (
                            <div className="bg-pink-50 rounded-lg p-3 space-y-2">
                              <div className="text-sm font-medium text-gray-700 mb-2">Radio Options:</div>
                              <div className="space-y-2">
                                {feature.types.radio.options.map((option, optIndex) => (
                                  <div
                                    key={option.id || optIndex}
                                    className="bg-white rounded-lg p-3 border border-gray-200"
                                  >
                                    <div className="font-medium text-gray-900 mb-1">
                                      {option.label || `Option ${optIndex + 1}`}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                                      <div>
                                        <span className="text-gray-500">Per Unit:</span>
                                        <div className="font-semibold">{option.perUnitPrice || '$0'}</div>
                                      </div>
                                      {option.totalUnits && (
                                        <div>
                                          <span className="text-gray-500">Units:</span>
                                          <div className="font-semibold">{option.totalUnits}</div>
                                        </div>
                                      )}
                                      {option.totalPrice && (
                                        <div>
                                          <span className="text-gray-500">Total:</span>
                                          <div className="font-bold text-green-600">${option.totalPrice}</div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
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

