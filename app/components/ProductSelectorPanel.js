// components/ProductSelectorPanel.js

"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function ProductSelectorPanel({
  products,
  onSelectProduct,
  loading,
  editingProduct = null,
  onCancelEdit = null,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedCheckboxes, setSelectedCheckboxes] = useState({}); // For multiple checkbox selections
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showProductList, setShowProductList] = useState(true); // Toggle between product list and configuration

  useEffect(() => {
    // If editing, pre-populate the product
    if (editingProduct && products && products.length > 0) {
      const product = products.find((p) => p.id === editingProduct.productId);
      if (product) {
        console.log(
          "[ProductSelectorPanel] Pre-populating product for editing:",
          product
        );
        setSelectedProduct(product);
        setShowProductList(false); // Go directly to configuration view

        // Pre-populate selected options from editingProduct
        const initialOptions = {};
        const initialCheckboxes = {};

        if (
          editingProduct.selectedOptions &&
          Array.isArray(editingProduct.selectedOptions)
        ) {
          // Group options by attribute
          editingProduct.selectedOptions.forEach((opt) => {
            // Find the attribute and option in the product
            const attribute = product.attributes?.find(
              (attr) => attr.name === opt.attributeName
            );
            if (attribute) {
              // Try to find option by label first, then by value
              let option = attribute.options?.find(
                (o) => o.label === opt.optionLabel
              );
              if (!option) {
                option = attribute.options?.find(
                  (o) => o.value === opt.optionValue
                );
              }
              if (!option && opt.optionValue) {
                option = attribute.options?.find(
                  (o) => o.id === opt.optionValue
                );
              }

              if (option) {
                if (attribute.uiType === "checkbox") {
                  if (!initialCheckboxes[attribute.id]) {
                    initialCheckboxes[attribute.id] = [];
                  }
                  // Check if option already exists to avoid duplicates
                  const exists = initialCheckboxes[attribute.id].some(
                    (o) => o.id === option.id
                  );
                  if (!exists) {
                    initialCheckboxes[attribute.id].push({
                      ...option,
                      attributeName: attribute.name,
                    });
                  }
                } else {
                  initialOptions[attribute.id] = {
                    ...option,
                    attributeName: attribute.name,
                  };
                }
              }
            }
          });
        }

        console.log("[ProductSelectorPanel] Pre-populated options:", {
          initialOptions,
          initialCheckboxes,
        });

        setSelectedOptions(initialOptions);
        setSelectedCheckboxes(initialCheckboxes);
      }
    } else {
      // Reset when not editing
      setSearchTerm("");
      setSelectedProduct(null);
      setSelectedOptions({});
      setSelectedCheckboxes({});
      setShowProductList(true);
    }
  }, [editingProduct, products]);

  useEffect(() => {
    if (products && Array.isArray(products)) {
      // Show all products (not just active) or filter by search term
      let filtered = products;

      // Filter by search term if provided
      if (searchTerm.trim()) {
        filtered = products.filter(
          (product) =>
            product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.description
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            product.group?.name
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase())
        );
      }

      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [searchTerm, products]);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setShowProductList(false);

    // Initialize selected options with default selections
    const initialOptions = {};
    const initialCheckboxes = {};

    product.attributes?.forEach((attr) => {
      if (attr.uiType === "checkbox") {
        // For checkboxes, initialize as empty array
        initialCheckboxes[attr.id] = [];
      } else {
        // For other types, select default or first option if mandatory
        const defaultOption = attr.options?.find((opt) => opt.defaultSelected);
        if (defaultOption) {
          initialOptions[attr.id] = defaultOption;
        } else if (
          attr.isMandatory &&
          attr.options &&
          attr.options.length > 0
        ) {
          initialOptions[attr.id] = attr.options[0];
        }
      }
    });

    setSelectedOptions(initialOptions);
    setSelectedCheckboxes(initialCheckboxes);
  };

  const handleOptionChange = (attributeId, option, attribute) => {
    setSelectedOptions((prev) => ({
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
    Object.values(selectedOptions).forEach((option) => {
      if (option?.price?.amount) {
        total += option.price.amount / 100;
      }
    });

    // Add prices from selected checkboxes
    Object.values(selectedCheckboxes).forEach((optionsArray) => {
      if (Array.isArray(optionsArray)) {
        optionsArray.forEach((option) => {
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
      toast.error("Please select a product");
      return;
    }

    // Check if all mandatory attributes are selected
    const mandatoryAttributes =
      selectedProduct.attributes?.filter((attr) => attr.isMandatory) || [];

    for (const attr of mandatoryAttributes) {
      if (attr.uiType === "checkbox") {
        // For mandatory checkboxes, at least one should be selected
        if (
          !selectedCheckboxes[attr.id] ||
          selectedCheckboxes[attr.id].length === 0
        ) {
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
      ...Object.values(selectedCheckboxes).flat(),
    ].filter(Boolean);

    onSelectProduct(selectedProduct, allOptions);

    // Reset state after adding
    handleBackToList();
  };

  const handleBackToList = () => {
    setSelectedProduct(null);
    setSelectedOptions({});
    setSelectedCheckboxes({});
    setShowProductList(true);
    setSearchTerm("");
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Panel Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 shrink-0">
        <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              {editingProduct ? (
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-gray-900">
                {showProductList
                  ? "Select Product"
                  : editingProduct
                    ? "Edit Product"
                    : "Configure Product"}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {showProductList
                  ? editingProduct
                    ? "Or choose a different product"
                    : "Choose from available products"
                  : selectedProduct?.name}
              </p>
            </div>
          </div>
          {!showProductList && (
            <button
              onClick={handleBackToList}
              className="text-gray-600 hover:text-gray-900 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              title="Back to product list"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
          )}
        </div>
        {editingProduct && !showProductList && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-sm text-blue-900 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              Update options and click "Update Product" to save changes
            </p>
          </div>
        )}
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto mt-4">
        {showProductList ? (
          /* Products List View */
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all">
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : !products || products.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p className="mt-4 text-gray-500 text-sm font-medium">
                  No products available
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Please create products in Catalogue first.
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <p className="mt-4 text-gray-500 text-sm font-medium">
                  No products match your search
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Try a different search term.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className="p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start space-x-3">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-lg shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
                          <svg
                            className="w-6 h-6 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate text-sm">
                          {product.name}
                        </h4>
                        {product.description && (
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                        <div className="flex items-center mt-1 space-x-2">
                          {product.group && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                              {product.group.name}
                            </span>
                          )}
                          {product.billingMode === "subscription" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                              Subscription
                            </span>
                          )}
                        </div>
                        {product.basePrice && (
                          <div className="mt-1 text-base font-bold text-blue-600">
                            ${(product.basePrice.amount / 100).toFixed(2)}
                            {product.basePrice.billingType === "recurring" && (
                              <span className="text-xs font-normal text-gray-500">
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
        ) : (
          /* Product Configuration View */
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedProduct.name}
              </h3>
              {selectedProduct.description && (
                <p className="mt-1 text-sm text-gray-600">
                  {selectedProduct.description}
                </p>
              )}
            </div>

            {/* Base Price */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 font-medium">
                  Base Price
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {selectedProduct.basePrice?.amount
                    ? `$${(
                      (selectedProduct.basePrice.amount || 0) / 100
                    ).toFixed(2)}`
                    : "$0.00"}
                </span>
              </div>
              {selectedProduct.basePrice?.billingType === "recurring" &&
                selectedProduct.basePrice?.interval && (
                  <p className="text-xs text-gray-500 mt-1">
                    Billed {selectedProduct.basePrice.interval}ly
                  </p>
                )}
            </div>

            {/* Attributes/Options */}
            {selectedProduct.attributes &&
              selectedProduct.attributes.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 text-base">
                    Configure Options
                  </h4>
                  {selectedProduct.attributes.map((attribute) => (
                    <div
                      key={attribute.id}
                      className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm"
                    >
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        {attribute.name}
                        {attribute.isMandatory && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      {attribute.description && (
                        <p className="text-xs text-gray-500 mb-2">
                          {attribute.description}
                        </p>
                      )}

                      {attribute.uiType === "dropdown" && (
                        <div className="space-y-2">
                          <select
                            value={selectedOptions[attribute.id]?.id || ""}
                            onChange={(e) => {
                              const option = attribute.options.find(
                                (opt) => opt.id === e.target.value
                              );
                              if (option)
                                handleOptionChange(
                                  attribute.id,
                                  option,
                                  attribute
                                );
                            }}
                            className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                            required={attribute.isMandatory}
                          >
                            {!attribute.isMandatory && (
                              <option value="">-- Select an option --</option>
                            )}
                            {attribute.options.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label} - $
                                {((option.price?.amount || 0) / 100).toFixed(2)}
                                {option.price?.billingType === "recurring" &&
                                  option.price?.interval &&
                                  ` /${option.price.interval} (Subscription)`}
                              </option>
                            ))}
                          </select>
                          {selectedOptions[attribute.id] &&
                            (() => {
                              const selectedOption = attribute.options.find(
                                (opt) =>
                                  opt.id === selectedOptions[attribute.id]?.id
                              );
                              if (
                                selectedOption &&
                                selectedOption.description
                              ) {
                                return (
                                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                    <p className="text-sm text-gray-700">
                                      {selectedOption.description}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                        </div>
                      )}

                      {attribute.uiType === "radio" && (
                        <div className="space-y-2">
                          {attribute.options.map((option) => {
                            const isSelected =
                              selectedOptions[attribute.id]?.id === option.id;

                            return (
                              <div
                                key={option.id}
                                onClick={(e) => {
                                  e.preventDefault();
                                  // Allow unselecting by clicking the same radio button
                                  if (isSelected) {
                                    // Unselect if not mandatory
                                    if (!attribute.isMandatory) {
                                      setSelectedOptions((prev) => {
                                        const newOptions = { ...prev };
                                        delete newOptions[attribute.id];
                                        return newOptions;
                                      });
                                      toast.success("Option deselected");
                                    } else {
                                      toast.warning("This option is mandatory");
                                    }
                                  } else {
                                    handleOptionChange(
                                      attribute.id,
                                      option,
                                      attribute
                                    );
                                  }
                                }}
                                className={`flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${isSelected
                                  ? "border-blue-600 bg-blue-50 shadow-sm"
                                  : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                                  }`}
                              >
                                <div className="flex items-center justify-center w-5 h-5 shrink-0">
                                  {isSelected ? (
                                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center gap-2">
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                      <span className="text-xs text-gray-900 font-medium truncate">
                                        {option.label}
                                      </span>
                                      {option.price?.billingType ===
                                        "recurring" && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 whitespace-nowrap">
                                            Subscription ({option.price.interval})
                                          </span>
                                        )}
                                    </div>
                                    <span className="text-xs font-semibold text-gray-900 shrink-0">
                                      $
                                      {(
                                        (option.price?.amount || 0) / 100
                                      ).toFixed(2)}
                                      {option.price?.billingType ===
                                        "recurring" &&
                                        option.price?.interval && (
                                          <span className="text-xs font-normal text-gray-600">
                                            /{option.price.interval}
                                          </span>
                                        )}
                                    </span>
                                  </div>
                                  {option.description && (
                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                      {option.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {attribute.uiType === "checkbox" && (
                        <div className="space-y-2">
                          {attribute.options.map((option) => {
                            const isChecked =
                              selectedCheckboxes[attribute.id]?.some(
                                (opt) => opt.id === option.id
                              ) || false;

                            return (
                              <label
                                key={option.id}
                                className={`flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${isChecked
                                  ? "border-blue-600 bg-blue-50 shadow-sm"
                                  : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    setSelectedCheckboxes((prev) => {
                                      const currentSelections =
                                        prev[attribute.id] || [];
                                      let newSelections;

                                      if (e.target.checked) {
                                        // Add option with attributeName
                                        newSelections = [
                                          ...currentSelections,
                                          {
                                            ...option,
                                            attributeName: attribute.name,
                                          },
                                        ];
                                      } else {
                                        // Remove option
                                        newSelections =
                                          currentSelections.filter(
                                            (opt) => opt.id !== option.id
                                          );
                                      }

                                      return {
                                        ...prev,
                                        [attribute.id]: newSelections,
                                      };
                                    });
                                  }}
                                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center gap-2">
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                      <span className="text-xs text-gray-900 truncate">
                                        {option.label}
                                      </span>
                                      {option.price?.billingType ===
                                        "recurring" && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 whitespace-nowrap">
                                            Subscription ({option.price.interval})
                                          </span>
                                        )}
                                    </div>
                                    <span className="text-xs font-medium text-gray-900 shrink-0">
                                      $
                                      {(
                                        (option.price?.amount || 0) / 100
                                      ).toFixed(2)}
                                      {option.price?.billingType ===
                                        "recurring" &&
                                        option.price?.interval && (
                                          <span className="text-xs font-normal text-gray-600">
                                            /{option.price.interval}
                                          </span>
                                        )}
                                    </span>
                                  </div>
                                  {option.description && (
                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                      {option.description}
                                    </p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {attribute.uiType === "slider" &&
                        attribute.options &&
                        attribute.options.length > 0 && (
                          <div className="space-y-3">
                            {attribute.options.map((option) => {
                              const sliderValue =
                                parseInt(
                                  selectedOptions[attribute.id]?.value
                                ) ||
                                parseInt(option.value) ||
                                0;
                              const min = parseInt(option.min) || 0;
                              const max = parseInt(option.max) || 100;
                              const perUnitPrice =
                                (option.price?.amount || 0) / 100;
                              const totalPrice = sliderValue * perUnitPrice;

                              return (
                                <div
                                  key={option.id}
                                  className="p-4 border-2 border-gray-200 rounded-lg bg-gray-50"
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-medium text-gray-700">
                                      {option.label}
                                    </label>
                                    <span className="text-sm font-bold text-blue-600">
                                      {sliderValue} × ${perUnitPrice.toFixed(2)}{" "}
                                      = $
                                      {(isNaN(totalPrice)
                                        ? 0
                                        : totalPrice
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min={min}
                                    max={max}
                                    value={sliderValue}
                                    onChange={(e) => {
                                      const newValue =
                                        parseInt(e.target.value) || 0;
                                      handleOptionChange(
                                        attribute.id,
                                        {
                                          ...option,
                                          value: newValue,
                                          price: {
                                            ...option.price,
                                            amount:
                                              newValue * perUnitPrice * 100,
                                          },
                                        },
                                        attribute
                                      );
                                    }}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                  />
                                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Min: {min}</span>
                                    <span>Max: {max}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                      {attribute.uiType === "number_input" &&
                        attribute.options &&
                        attribute.options.length > 0 && (
                          <div className="space-y-3">
                            {attribute.options.map((option) => {
                              const inputValue =
                                parseInt(
                                  selectedOptions[attribute.id]?.value
                                ) ||
                                parseInt(option.value) ||
                                0;
                              const perUnitPrice =
                                (option.price?.amount || 0) / 100;
                              const totalPrice = inputValue * perUnitPrice;

                              return (
                                <div
                                  key={option.id}
                                  className="p-4 border-2 border-gray-200 rounded-lg bg-gray-50"
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-medium text-gray-700">
                                      {option.label}
                                    </label>
                                    <span className="text-sm font-bold text-blue-600">
                                      $
                                      {(isNaN(totalPrice)
                                        ? 0
                                        : totalPrice
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                  <input
                                    type="number"
                                    min={option.min || 0}
                                    max={option.max || 999999}
                                    value={inputValue}
                                    onChange={(e) => {
                                      const newValue =
                                        parseInt(e.target.value) || 0;
                                      handleOptionChange(
                                        attribute.id,
                                        {
                                          ...option,
                                          value: newValue,
                                          price: {
                                            ...option.price,
                                            amount:
                                              newValue * perUnitPrice * 100,
                                          },
                                        },
                                        attribute
                                      );
                                    }}
                                    className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                  />
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
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-900">
                  Total Price
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  ${calculateTotalPrice().toFixed(2)}
                </span>
              </div>
              {selectedProduct.basePrice?.billingType === "recurring" && (
                <p className="text-xs text-gray-600 mt-1">
                  Per {selectedProduct.basePrice.interval}
                </p>
              )}
            </div>

            {/* Add/Update Button */}
            <button
              type="button"
              onClick={handleAddToQuotation}
              className="w-full px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm shadow-sm hover:shadow-md"
            >
              {editingProduct ? "Update Product" : "Add to Quotation"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
