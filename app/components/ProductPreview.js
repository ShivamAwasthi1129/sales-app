// components/ProductPreview.js

"use client";

export default function ProductPreview({ productData }) {
  const calculateDiscountPrice = () => {
    if (!productData.basePrice || !productData.discount) return null;
    // Handle basePrice that might be a string with $ or just a number
    const basePriceStr =
      typeof productData.basePrice === "string"
        ? productData.basePrice.replace(/[^0-9.]/g, "")
        : productData.basePrice.toString();
    const base = parseFloat(basePriceStr) || 0;
    const discount = parseFloat(productData.discount) || 0;
    if (base === 0 || discount === 0) return null;
    const discounted = base - (base * discount) / 100;
    return discounted.toFixed(2);
  };

  const discountedPrice = calculateDiscountPrice();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all duration-200 sticky top-8">
      <div className="flex items-center justify-between mb-2 pb-2">
        <h3 className="text-lg font-bold text-blue-900 flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </div>
          <span>Product Preview</span>
        </h3>
      </div>

      <div className="space-y-4">
        {/* Product Image */}
        {productData.imageUrl ? (
          <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
            <img
              src={productData.imageUrl}
              alt={productData.name || "Product"}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-48 bg-blue-50 rounded-lg flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Product Name */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h4 className="text-xl font-semibold text-gray-900 mb-2">
            {productData.name || "Product Name"}
          </h4>
          {productData.groupName && (
            <span className="inline-flex items-center px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium border border-blue-200">
              {productData.groupName}
            </span>
          )}
        </div>

        {/* Product Description */}
        {productData.description && (
          <p className="text-sm text-gray-600">{productData.description}</p>
        )}

        {/* Billing Info */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 border border-gray-200">
          <h5 className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-2">
            Pricing Details
          </h5>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
              <span className="text-xs text-gray-600 font-medium">
                Billing Mode:
              </span>
              <span className="text-xs font-semibold capitalize px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                {productData.billingMode === "subscription"
                  ? "Subscription"
                  : "One-Time"}
              </span>
            </div>
            {productData.billingMode === "subscription" &&
              productData.subscriptionCycle && (
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
                  <span className="text-xs text-gray-600 font-medium">
                    Cycle:
                  </span>
                  <span className="text-xs font-semibold capitalize px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full border border-indigo-200">
                    {productData.subscriptionCycle}
                  </span>
                </div>
              )}
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
              <span className="text-xs text-gray-600 font-medium">
                Base Price:
              </span>
              <div className="flex items-center space-x-2">
                {productData.basePrice &&
                  (() => {
                    // Handle basePrice that might be a string with $ or just a number
                    const basePriceDisplay =
                      typeof productData.basePrice === "string"
                        ? productData.basePrice.startsWith("$")
                          ? productData.basePrice
                          : `$${productData.basePrice}`
                        : `$${productData.basePrice}`;

                    return (
                      <>
                        {discountedPrice ? (
                          <>
                            <span className="text-xs line-through text-gray-400 font-medium">
                              {basePriceDisplay}
                            </span>
                            <span className="text-base font-bold text-blue-600">
                              ${discountedPrice}
                            </span>
                          </>
                        ) : (
                          <span className="text-base font-bold text-gray-900">
                            {basePriceDisplay}
                          </span>
                        )}
                      </>
                    );
                  })()}
              </div>
            </div>
            {productData.discount && (
              <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
                <span className="text-xs text-gray-600 font-medium">
                  Discount:
                </span>
                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                  {productData.discount}% OFF
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Attributes */}
        {productData.attributes && productData.attributes.length > 0 && (
          <div className="space-y-3">
            <h5 className="text-sm font-semibold text-gray-900">Attributes:</h5>
            {productData.attributes.map((attribute, index) => {
              const uiType = attribute.uiType || "dropdown";
              const attributeName =
                attribute.attributeName ||
                attribute.name ||
                `Attribute ${index + 1}`;

              return (
                <div
                  key={attribute.id || index}
                  className="border border-gray-200 rounded-lg p-3 space-y-2 bg-white"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-900">
                      {attributeName}
                      {attribute.isMandatory && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {attribute.isSubscription && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full border border-green-200 font-medium">
                          Subscription
                        </span>
                      )}
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 capitalize font-medium">
                        {uiType === "number_input" ? "Number" : uiType}
                      </span>
                    </div>
                  </div>

                  {/* Slider Display */}
                  {uiType === "slider" && attribute.slider && (
                    <div className="bg-gray-50 rounded p-2 space-y-1 border border-gray-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 font-medium">Slider Value:</span>
                        <span className="font-semibold text-gray-900">
                          {attribute.slider.value || 50}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${((attribute.slider.value || 50) /
                              (attribute.slider.max || 100)) *
                              100
                              }%`,
                          }}
                        ></div>
                      </div>
                      {attribute.slider.perUnitPrice && (
                        <div className="text-xs text-gray-600 font-medium">
                          Price: {attribute.slider.perUnitPrice}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Number Input Display */}
                  {uiType === "number_input" && attribute.number_input && (
                    <div className="bg-gray-50 rounded p-2 space-y-1 border border-gray-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 font-medium">Quantity:</span>
                        <span className="font-semibold text-gray-900">
                          {attribute.number_input.value || 0}
                        </span>
                      </div>
                      {attribute.number_input.perUnitPrice && (
                        <div className="text-xs text-gray-600 font-medium">
                          Price: {attribute.number_input.perUnitPrice}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dropdown Display */}
                  {uiType === "dropdown" &&
                    attribute.dropdown?.options &&
                    attribute.dropdown.options.length > 0 && (
                      <div className="bg-gray-50 rounded p-2 space-y-2 border border-gray-200">
                        <div className="text-xs text-gray-600 mb-1 font-medium">
                          Select Option:
                        </div>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                          <option value="">Choose an option...</option>
                          {attribute.dropdown.options.map(
                            (option, optIndex) => (
                              <option
                                key={option.id || optIndex}
                                value={option.id || optIndex}
                              >
                                {option.label || `Option ${optIndex + 1}`}
                                {option.perUnitPrice &&
                                  ` - ${option.perUnitPrice}`}
                                {option.totalPrice &&
                                  ` (Total: $${option.totalPrice})`}
                              </option>
                            )
                          )}
                        </select>
                        <div className="space-y-1 mt-2">
                          {attribute.dropdown.options.map(
                            (option, optIndex) => (
                              <div
                                key={option.id || optIndex}
                                className="text-xs bg-white rounded p-2 border border-gray-200"
                              >
                                <div className="font-semibold text-gray-900">
                                  {option.label || "Unnamed Option"}
                                </div>
                                {option.description && (
                                  <div className="text-gray-500 mt-1 text-xs">
                                    {option.description}
                                  </div>
                                )}
                                <div className="flex justify-between text-gray-600 mt-1 text-xs">
                                  <span>
                                    Per Unit: {option.perUnitPrice || "$0"}
                                  </span>
                                  {option.totalUnits && (
                                    <span>Units: {option.totalUnits}</span>
                                  )}
                                </div>
                                {option.totalPrice && (
                                  <div className="text-blue-600 font-semibold mt-1 text-xs">
                                    Total: ${option.totalPrice}
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Checkbox Display */}
                  {uiType === "checkbox" &&
                    attribute.checkbox?.options &&
                    attribute.checkbox.options.length > 0 && (
                      <div className="bg-gray-50 rounded p-2 space-y-2 border border-gray-200">
                        <div className="text-xs text-gray-600 mb-1 font-medium">
                          Select Options:
                        </div>
                        <div className="space-y-1">
                          {attribute.checkbox.options.map(
                            (option, optIndex) => (
                              <label
                                key={option.id || optIndex}
                                className="flex items-center space-x-2 text-xs bg-white rounded p-2 border border-gray-200 cursor-pointer hover:bg-gray-50"
                              >
                                <input type="checkbox" className="rounded text-blue-600 border-gray-300 focus:ring-blue-500" />
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900">
                                    {option.label || "Unnamed Option"}
                                  </div>
                                  {option.description && (
                                    <div className="text-gray-500 mt-1 text-xs">
                                      {option.description}
                                    </div>
                                  )}
                                  <div className="text-gray-600 text-xs">
                                    {option.perUnitPrice || "$0"}
                                    {option.totalUnits &&
                                      ` × ${option.totalUnits} = $${option.totalPrice || "0"
                                      }`}
                                  </div>
                                </div>
                              </label>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Radio Display */}
                  {uiType === "radio" &&
                    attribute.radio?.options &&
                    attribute.radio.options.length > 0 && (
                      <div className="bg-gray-50 rounded p-2 space-y-2 border border-gray-200">
                        <div className="text-xs text-gray-600 mb-1 font-medium">
                          Select Option:
                        </div>
                        <div className="space-y-1">
                          {attribute.radio.options.map((option, optIndex) => (
                            <label
                              key={option.id || optIndex}
                              className="flex items-center space-x-2 text-xs bg-white rounded p-2 border border-gray-200 cursor-pointer hover:bg-gray-50"
                            >
                              <input
                                type="radio"
                                name={`attr-${attribute.id || index}`}
                                className="rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900">
                                  {option.label || "Unnamed Option"}
                                </div>
                                {option.description && (
                                  <div className="text-gray-500 mt-1 text-xs">
                                    {option.description}
                                  </div>
                                )}
                                <div className="text-gray-600 text-xs">
                                  {option.perUnitPrice || "$0"}
                                  {option.totalUnits &&
                                    ` × ${option.totalUnits} = $${option.totalPrice || "0"
                                    }`}
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

        {/* Empty State */}
        {!productData.name &&
          !productData.description &&
          (!productData.attributes || productData.attributes.length === 0) && (
            <div className="text-center py-8 text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm text-gray-500">Product preview will appear here</p>
            </div>
          )}
      </div>
    </div>
  );
}
