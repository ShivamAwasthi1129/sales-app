// components/CompanyViewModal.js

"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { gql } from "graphql-tag";

const GET_COMPANY_PRODUCTS = gql`
  query GetProducts {
    getProducts {
      id
      name
      description
      image
      imageUrl
      status
      tags
      billingMode
      discount
      companyId
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
        description
        uiType
        isMandatory
        options {
          id
          label
          value
          description
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
      creator {
        id
        name
        email
        role
        phone
        address
        status
        companyId
      }
      createdBy
      createdAt
      updatedAt
    }
  }
`;

const GET_COMPANY_QUOTATIONS = gql`
  query GetQuotations {
    getQuotations {
      id
      quotationNo
      quotationDate
      from {
        businessName
        salesPersonName
      }
      to {
        businessName
        email
      }
      currency
      totalAmount
      status
      companyId
      createdBy
      createdAt
    }
  }
`;

export default function CompanyViewModal({ isOpen, onClose, company }) {
  const [activeTab, setActiveTab] = useState("products");
  const [expandedProducts, setExpandedProducts] = useState({});

  const {
    data: productsData,
    loading: productsLoading,
    error: productsError,
  } = useQuery(GET_COMPANY_PRODUCTS, {
    skip: !isOpen || !company,
  });

  const {
    data: quotationsData,
    loading: quotationsLoading,
    error: quotationsError,
  } = useQuery(GET_COMPANY_QUOTATIONS, {
    skip: !isOpen || !company || activeTab !== "quotations",
  });

  // Filter products for this company
  const companyProducts = (productsData?.getProducts || []).filter(
    (product) => {
      // Filter by product's companyId (most reliable)
      if (product.companyId) {
        return String(product.companyId) === String(company.id);
      }
      // Fallback: check if creator belongs to this company
      if (product.creator?.companyId) {
        return String(product.creator.companyId) === String(company.id);
      }
      // If no company association, don't show it
      return false;
    }
  );

  // Filter quotations for this company
  const companyQuotations = (quotationsData?.getQuotations || []).filter(
    (quotation) => {
      // Filter by quotation's companyId (most reliable)
      if (quotation.companyId) {
        return String(quotation.companyId) === String(company.id);
      }
      // If no company association, don't show it
      return false;
    }
  );

  // Group products by creator
  const productsByCreator = companyProducts.reduce((acc, product) => {
    const creatorId = product.creator?.id || product.createdBy || "unknown";

    if (!acc[creatorId]) {
      acc[creatorId] = {
        creator: product.creator || {
          id: product.createdBy,
          name: "Unknown Creator",
          email: "N/A",
          role: "Unknown",
        },
        products: [],
      };
    }
    acc[creatorId].products.push(product);
    return acc;
  }, {});

  const toggleProduct = (productId) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      active: "bg-green-100 text-green-800 border-green-300",
      draft: "bg-gray-100 text-gray-800 border-gray-300",
      archived: "bg-gray-100 text-gray-800 border-gray-300",
      paid: "bg-green-100 text-green-800 border-green-300",
      accepted: "bg-blue-100 text-blue-800 border-blue-300",
      sent: "bg-yellow-100 text-yellow-800 border-yellow-300",
      viewed: "bg-purple-100 text-purple-800 border-purple-300",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      rejected: "bg-red-100 text-red-800 border-red-300",
      won: "bg-green-100 text-green-800 border-green-300",
      lost: "bg-red-100 text-red-800 border-red-300",
    };
    return (
      colors[status?.toLowerCase()] ||
      "bg-gray-100 text-gray-800 border-gray-300"
    );
  };

  if (!isOpen || !company) return null;

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal panel */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl transform transition-all w-full max-w-6xl max-h-[90vh] overflow-hidden z-10 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white rounded-t-2xl px-6 py-5 border-b border-gray-200 shadow-sm shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {/* Icon */}
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
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
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-semibold text-gray-900 truncate">
                  {company.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Company Details & Information
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-6 shrink-0">
          <nav className="flex space-x-4" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("products")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "products"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              <span className="flex items-center space-x-2">
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
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <span>Products ({companyProducts.length})</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab("quotations")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "quotations"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              <span className="flex items-center space-x-2">
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>Quotations ({companyQuotations.length})</span>
              </span>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">
          {/* Products Tab */}
          {activeTab === "products" && (
            <div className="space-y-4">
              {productsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : productsError ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                  <p className="font-semibold">Error loading products</p>
                  <p className="text-sm mt-1">{productsError.message}</p>
                </div>
              ) : companyProducts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <svg
                      className="h-8 w-8 text-gray-400"
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
                  <h3 className="text-lg font-semibold text-gray-900">
                    No products found
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    This company doesn't have any products yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(productsByCreator).map(
                    ([creatorId, { creator, products }]) => (
                      <div
                        key={creatorId}
                        className="border border-gray-200 rounded-xl overflow-hidden"
                      >
                        {/* Products List */}
                        <div className="divide-y divide-gray-200">
                          {products.map((product) => (
                            <div
                              key={product.id}
                              className="p-5 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-4">
                                {/* Product Image */}
                                {(product.image || product.imageUrl) && (
                                  <div className="shrink-0">
                                    <img
                                      src={product.image || product.imageUrl}
                                      alt={product.name}
                                      className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                                      onError={(e) => {
                                        e.target.style.display = "none";
                                      }}
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <h5 className="text-lg font-semibold text-gray-900">
                                      {product.name}
                                    </h5>

                                    {product.group && (
                                      <span className="inline-flex px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full border border-gray-200">
                                        {product.group.name}
                                      </span>
                                    )}
                                    <span
                                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeColor(
                                        product.status
                                      )}`}
                                    >
                                      {product.status || "active"}
                                    </span>
                                  </div>

                                  {product.description && (
                                    <p className="text-sm text-gray-600 mb-3">
                                      {product.description}
                                    </p>
                                  )}

                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                    {product.basePrice && (
                                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <p className="text-xs text-blue-700 font-bold uppercase tracking-wide mb-1">
                                          Base Price
                                        </p>
                                        <p className="text-sm font-semibold text-blue-900">
                                          {product.basePrice.currency?.toUpperCase() ||
                                            "USD"}{" "}
                                          {product.basePrice.amount?.toFixed(
                                            2
                                          ) || "0.00"}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {product.basePrice.billingType}
                                        </p>
                                      </div>
                                    )}
                                    {product.billingMode && (
                                      <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                                        <p className="text-xs text-purple-700 font-bold uppercase tracking-wide mb-1">
                                          Billing Mode
                                        </p>
                                        <p className="text-sm font-semibold text-purple-900 capitalize">
                                          {product.billingMode}
                                        </p>
                                      </div>
                                    )}
                                    {product.discount && (
                                      <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                        <p className="text-xs text-green-700 font-bold uppercase tracking-wide mb-1">
                                          Discount
                                        </p>
                                        <p className="text-sm font-semibold text-green-900">
                                          {product.discount}%
                                        </p>
                                      </div>
                                    )}
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                      <p className="text-xs text-gray-700 font-bold uppercase tracking-wide mb-1">
                                        Created
                                      </p>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {new Date(
                                          product.createdAt
                                        ).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>

                                  {product.tags && product.tags.length > 0 && (
                                    <div className="mb-3">
                                      <p className="text-xs text-gray-600 mb-1 font-semibold">
                                        Tags:
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {product.tags.map((tag, idx) => (
                                          <span
                                            key={idx}
                                            className="inline-flex px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded border border-gray-200"
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Attributes */}
                                  {product.attributes &&
                                    product.attributes.length > 0 && (
                                      <div className="mt-4">
                                        <button
                                          onClick={() =>
                                            toggleProduct(product.id)
                                          }
                                          className="flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                        >
                                          <span>
                                            {expandedProducts[product.id]
                                              ? "Hide"
                                              : "Show"}{" "}
                                            Attributes (
                                            {product.attributes.length})
                                          </span>
                                          <svg
                                            className={`w-4 h-4 transition-transform ${expandedProducts[product.id]
                                              ? "rotate-180"
                                              : ""
                                              }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M19 9l-7 7-7-7"
                                            />
                                          </svg>
                                        </button>

                                        {expandedProducts[product.id] && (
                                          <div className="mt-3 space-y-3 pl-4 border-l-2 border-blue-200">
                                            {product.attributes.map((attr) => (
                                              <div
                                                key={attr.id}
                                                className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
                                              >
                                                <div className="flex items-center justify-between mb-2">
                                                  <h6 className="font-semibold text-gray-900">
                                                    {attr.name}
                                                  </h6>
                                                  <div className="flex items-center space-x-2">
                                                    {attr.isMandatory && (
                                                      <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-1 rounded border border-red-200">
                                                        Required
                                                      </span>
                                                    )}
                                                    <span className="text-xs text-gray-500 capitalize bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                                      {attr.uiType}
                                                    </span>
                                                  </div>
                                                </div>
                                                {attr.description && (
                                                  <p className="text-xs text-gray-600 mb-2">
                                                    {attr.description}
                                                  </p>
                                                )}
                                                {attr.options &&
                                                  attr.options.length > 0 && (
                                                    <div className="mt-2 space-y-2">
                                                      <p className="text-xs font-semibold text-gray-700 mb-2">
                                                        Options:
                                                      </p>
                                                      {attr.options.map(
                                                        (option) => (
                                                          <div
                                                            key={option.id}
                                                            className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                                                          >
                                                            <div className="flex items-center justify-between">
                                                              <div className="flex-1">
                                                                <p className="text-sm font-semibold text-gray-900">
                                                                  {option.label}
                                                                </p>
                                                                {option.description && (
                                                                  <p className="text-xs text-gray-600 mt-1">
                                                                    {
                                                                      option.description
                                                                    }
                                                                  </p>
                                                                )}
                                                              </div>
                                                              {option.price && (
                                                                <div className="text-right ml-4">
                                                                  <p className="text-sm font-semibold text-blue-600">
                                                                    {option.price.currency?.toUpperCase() ||
                                                                      "USD"}{" "}
                                                                    {option.price.amount?.toFixed(
                                                                      2
                                                                    ) || "0.00"}
                                                                  </p>
                                                                  <p className="text-xs text-gray-500">
                                                                    {
                                                                      option
                                                                        .price
                                                                        .billingType
                                                                    }
                                                                  </p>
                                                                </div>
                                                              )}
                                                            </div>
                                                          </div>
                                                        )
                                                      )}
                                                    </div>
                                                  )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quotations Tab */}
          {activeTab === "quotations" && (
            <div className="space-y-4">
              {quotationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : quotationsError ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                  <p className="font-semibold">Error loading quotations</p>
                  <p className="text-sm mt-1">{quotationsError.message}</p>
                </div>
              ) : companyQuotations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <svg
                      className="h-8 w-8 text-gray-400"
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
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    No quotations found
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    This company doesn't have any quotations yet.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-blue-900">
                        Company Quotations
                      </h3>
                      <span className="text-sm text-gray-600">
                        {companyQuotations.length} quotation
                        {companyQuotations.length !== 1 ? "s" : ""} found
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Quotation No
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            From
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            To
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Sales Person
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Total
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {companyQuotations.map((quotation) => (
                          <tr
                            key={quotation.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3 text-sm font-medium text-blue-600">
                              {quotation.quotationNo}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {new Date(
                                quotation.quotationDate
                              ).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {quotation.from?.businessName || "N/A"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">
                                {quotation.to?.businessName || "N/A"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {quotation.to?.email || ""}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {quotation.from?.salesPersonName || "N/A"}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                              {quotation.currency}{" "}
                              {quotation.totalAmount?.toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${quotation.status === "paid"
                                  ? "bg-green-100 text-green-800 border-green-300"
                                  : quotation.status === "sent"
                                    ? "bg-blue-100 text-blue-800 border-blue-300"
                                    : quotation.status === "draft"
                                      ? "bg-gray-100 text-gray-800 border-gray-300"
                                      : quotation.status === "accepted"
                                        ? "bg-purple-100 text-purple-800 border-purple-300"
                                        : quotation.status === "viewed"
                                          ? "bg-purple-100 text-purple-800 border-purple-300"
                                          : quotation.status === "rejected"
                                            ? "bg-red-100 text-red-800 border-red-300"
                                            : "bg-yellow-100 text-yellow-800 border-yellow-300"
                                  }`}
                              >
                                {quotation.status.charAt(0).toUpperCase() +
                                  quotation.status.slice(1)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
