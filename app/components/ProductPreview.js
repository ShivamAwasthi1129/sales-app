'use client';

export default function ProductPreview({ productData }) {
  const calculateDiscountPrice = () => {
    if (!productData.basePrice || !productData.discount) return null;
    const base = parseFloat(productData.basePrice);
    const discount = parseFloat(productData.discount);
    const discounted = base - (base * discount / 100);
    return discounted.toFixed(2);
  };

  const discountedPrice = calculateDiscountPrice();

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl border-2 border-gray-200 p-6 sticky top-8">
      <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Product Preview</span>
        </h3>
      </div>
      
      <div className="space-y-4">
        {/* Product Image */}
        {productData.imageUrl ? (
          <div className="w-full h-56 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-lg border-4 border-white">
            <img
              src={productData.imageUrl}
              alt={productData.name || 'Product'}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-56 bg-gradient-to-br from-purple-100 via-indigo-100 to-blue-100 rounded-xl flex items-center justify-center border-4 border-white shadow-lg">
            <svg className="w-20 h-20 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Product Name */}
        <div className="bg-white rounded-xl p-4 shadow-md">
          <h4 className="text-2xl font-bold text-gray-900 flex items-center space-x-2 mb-2">
            {productData.name || 'Product Name'}
            {productData.name && (
              <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </h4>
          {productData.groupName && (
            <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 rounded-full text-sm font-semibold">
              {productData.groupName}
            </span>
          )}
        </div>

        {/* Product Description */}
        {productData.description && (
          <p className="text-gray-700 text-sm">{productData.description}</p>
        )}

        {/* Billing Info */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 space-y-3 border-2 border-gray-200 shadow-md">
          <h5 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Pricing Details</h5>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-gray-600">Billing Mode:</span>
              <span className="text-sm font-bold text-gray-900 capitalize px-3 py-1 bg-purple-100 text-purple-800 rounded-lg">
                {productData.billingMode === 'subscription' ? 'Subscription' : 'One-Time'}
              </span>
            </div>
            {productData.billingMode === 'subscription' && productData.subscriptionCycle && (
              <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-gray-600">Cycle:</span>
                <span className="text-sm font-bold text-gray-900 capitalize px-3 py-1 bg-indigo-100 text-indigo-800 rounded-lg">
                  {productData.subscriptionCycle}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border-2 border-purple-200">
              <span className="text-sm font-bold text-gray-700">Base Price:</span>
              <div className="flex items-center space-x-2">
                {productData.basePrice && (
                  <>
                    {discountedPrice ? (
                      <>
                        <span className="text-sm line-through text-gray-400 font-medium">
                          ${productData.basePrice}
                        </span>
                        <span className="text-lg font-bold text-purple-600">
                          ${discountedPrice}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-gray-900">
                        ${productData.basePrice}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            {productData.discount && (
              <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-gray-600">Discount:</span>
                <span className="text-sm font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg">
                  {productData.discount}% OFF
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Attributes */}
        {productData.attributes && productData.attributes.length > 0 && (
          <div className="space-y-3">
            <h5 className="font-semibold text-gray-900">Attributes:</h5>
            {productData.attributes.map((attribute, index) => {
              const uiType = attribute.uiType || 'dropdown';
              const attributeName = attribute.attributeName || attribute.name || `Attribute ${index + 1}`;
              
              return (
                <div key={attribute.id || index} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {attributeName}
                      {attribute.isMandatory && <span className="text-red-500 ml-1">*</span>}
                    </span>
                    {attribute.isSubscription && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Subscription
                      </span>
                    )}
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                      {uiType === 'number_input' ? 'Number' : uiType}
                    </span>
                  </div>
                  
                  {/* Slider Display */}
                  {uiType === 'slider' && attribute.slider && (
                    <div className="bg-purple-50 rounded p-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Slider Value:</span>
                        <span className="font-medium">{attribute.slider.value || 50}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${((attribute.slider.value || 50) / (attribute.slider.max || 100)) * 100}%` }}
                        ></div>
                      </div>
                      {attribute.slider.perUnitPrice && (
                        <div className="text-xs text-gray-500">
                          Price: {attribute.slider.perUnitPrice}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Number Input Display */}
                  {uiType === 'number_input' && attribute.number_input && (
                    <div className="bg-blue-50 rounded p-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Quantity:</span>
                        <span className="font-medium">{attribute.number_input.value || 0}</span>
                      </div>
                      {attribute.number_input.perUnitPrice && (
                        <div className="text-xs text-gray-500">
                          Price: {attribute.number_input.perUnitPrice}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Dropdown Display */}
                  {uiType === 'dropdown' && attribute.dropdown?.options && attribute.dropdown.options.length > 0 && (
                    <div className="bg-green-50 rounded p-2 space-y-2">
                      <div className="text-xs text-gray-600 mb-1">Select Option:</div>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                        <option value="">Choose an option...</option>
                        {attribute.dropdown.options.map((option, optIndex) => (
                          <option key={option.id || optIndex} value={option.id || optIndex}>
                            {option.label || `Option ${optIndex + 1}`}
                            {option.perUnitPrice && ` - ${option.perUnitPrice}`}
                            {option.totalPrice && ` (Total: $${option.totalPrice})`}
                          </option>
                        ))}
                      </select>
                      <div className="space-y-1 mt-2">
                        {attribute.dropdown.options.map((option, optIndex) => (
                          <div key={option.id || optIndex} className="text-xs bg-white rounded p-2 border border-gray-200">
                            <div className="font-medium">{option.label || 'Unnamed Option'}</div>
                            <div className="flex justify-between text-gray-600 mt-1">
                              <span>Per Unit: {option.perUnitPrice || '$0'}</span>
                              {option.totalUnits && <span>Units: {option.totalUnits}</span>}
                            </div>
                            {option.totalPrice && (
                              <div className="text-purple-600 font-semibold mt-1">
                                Total: ${option.totalPrice}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Checkbox Display */}
                  {uiType === 'checkbox' && attribute.checkbox?.options && attribute.checkbox.options.length > 0 && (
                    <div className="bg-yellow-50 rounded p-2 space-y-2">
                      <div className="text-xs text-gray-600 mb-1">Select Options:</div>
                      <div className="space-y-1">
                        {attribute.checkbox.options.map((option, optIndex) => (
                          <label key={option.id || optIndex} className="flex items-center space-x-2 text-xs bg-white rounded p-2 border border-gray-200 cursor-pointer hover:bg-gray-50">
                            <input type="checkbox" className="rounded" />
                            <div className="flex-1">
                              <div className="font-medium">{option.label || 'Unnamed Option'}</div>
                              <div className="text-gray-600">
                                {option.perUnitPrice || '$0'}
                                {option.totalUnits && ` × ${option.totalUnits} = $${option.totalPrice || '0'}`}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Radio Display */}
                  {uiType === 'radio' && attribute.radio?.options && attribute.radio.options.length > 0 && (
                    <div className="bg-indigo-50 rounded p-2 space-y-2">
                      <div className="text-xs text-gray-600 mb-1">Select Option:</div>
                      <div className="space-y-1">
                        {attribute.radio.options.map((option, optIndex) => (
                          <label key={option.id || optIndex} className="flex items-center space-x-2 text-xs bg-white rounded p-2 border border-gray-200 cursor-pointer hover:bg-gray-50">
                            <input type="radio" name={`attr-${attribute.id || index}`} className="rounded" />
                            <div className="flex-1">
                              <div className="font-medium">{option.label || 'Unnamed Option'}</div>
                              <div className="text-gray-600">
                                {option.perUnitPrice || '$0'}
                                {option.totalUnits && ` × ${option.totalUnits} = $${option.totalPrice || '0'}`}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Placeholder for more attributes */}
        {productData.attributes && productData.attributes.length > 0 && (
          <p className="text-xs text-gray-400 italic text-center">
            More Attributes will be Visible Here
          </p>
        )}

        {/* Empty State */}
        {(!productData.name && !productData.description && (!productData.attributes || productData.attributes.length === 0)) && (
          <div className="text-center py-8 text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">Product preview will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
