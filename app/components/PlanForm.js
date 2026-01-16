// components/PlanForm.js

"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@apollo/client/react";
import { gql } from "graphql-tag";

const CREATE_PLAN = gql`
  mutation CreatePlan(
    $name: String!
    $description: String
    $price: Float!
    $billingCycle: String!
    $usersLimit: Int!
    $salesPersonLimit: Int!
    $quotationLimit: Int!
    $features: [FeatureInput!]
    $status: String
    $isPopular: Boolean
    $displayOrder: Int
  ) {
    createPlan(
      name: $name
      description: $description
      price: $price
      billingCycle: $billingCycle
      usersLimit: $usersLimit
      salesPersonLimit: $salesPersonLimit
      quotationLimit: $quotationLimit
      features: $features
      status: $status
      isPopular: $isPopular
      displayOrder: $displayOrder
    ) {
      id
      name
      price
    }
  }
`;

const UPDATE_PLAN = gql`
  mutation UpdatePlan(
    $id: ID!
    $name: String
    $description: String
    $price: Float
    $billingCycle: String
    $usersLimit: Int
    $salesPersonLimit: Int
    $quotationLimit: Int
    $features: [FeatureInput!]
    $status: String
    $isPopular: Boolean
    $displayOrder: Int
  ) {
    updatePlan(
      id: $id
      name: $name
      description: $description
      price: $price
      billingCycle: $billingCycle
      usersLimit: $usersLimit
      salesPersonLimit: $salesPersonLimit
      quotationLimit: $quotationLimit
      features: $features
      status: $status
      isPopular: $isPopular
      displayOrder: $displayOrder
    ) {
      id
      name
      price
    }
  }
`;

export default function PlanForm({ plan, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    billingCycle: "monthly",
    usersLimit: 1,
    salesPersonLimit: 0,
    quotationLimit: 0,
    status: "Active",
    isPopular: false,
    displayOrder: 0,
  });

  const [features, setFeatures] = useState([
    { name: "", value: "", isIncluded: true },
  ]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [createPlan] = useMutation(CREATE_PLAN);
  const [updatePlan] = useMutation(UPDATE_PLAN);

  const isEditing = !!plan;

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || "",
        description: plan.description || "",
        price: plan.price || 0,
        billingCycle: plan.billingCycle || "monthly",
        usersLimit: plan.usersLimit || 1,
        salesPersonLimit: plan.salesPersonLimit || 0,
        quotationLimit: plan.quotationLimit || 0,
        status: plan.status || "Active",
        isPopular: plan.isPopular || false,
        displayOrder: plan.displayOrder || 0,
      });
      // Deep clone the features array and remove __typename field added by GraphQL
      const clonedFeatures =
        plan.features && plan.features.length > 0
          ? plan.features.map((f) => {
            const { __typename, ...featureWithoutTypename } = f;
            return {
              name: featureWithoutTypename.name || "",
              value: featureWithoutTypename.value || "",
              isIncluded:
                featureWithoutTypename.isIncluded !== undefined
                  ? featureWithoutTypename.isIncluded
                  : true,
            };
          })
          : [{ name: "", value: "", isIncluded: true }];
      setFeatures(clonedFeatures);
    }
  }, [plan]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
            ? parseFloat(value) || 0
            : value,
    }));
  };

  const handleFeatureChange = (index, field, value) => {
    const newFeatures = features.map((feature, i) => {
      if (i === index) {
        // Create a new object and remove __typename if present
        const { __typename, ...featureWithoutTypename } = feature;
        return {
          ...featureWithoutTypename,
          [field]: value,
        };
      }
      // Also remove __typename from other features
      const { __typename, ...featureWithoutTypename } = feature;
      return featureWithoutTypename;
    });
    setFeatures(newFeatures);
  };

  const addFeature = () => {
    // Create a deep copy and remove __typename
    const newFeatures = features.map((f) => {
      const { __typename, ...featureWithoutTypename } = f;
      return featureWithoutTypename;
    });
    newFeatures.push({ name: "", value: "", isIncluded: true });
    setFeatures(newFeatures);
  };

  const removeFeature = (index) => {
    if (features.length > 1) {
      // Create new array without the specified index and remove __typename
      setFeatures(
        features
          .filter((_, i) => i !== index)
          .map((f) => {
            const { __typename, ...featureWithoutTypename } = f;
            return featureWithoutTypename;
          })
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Filter out empty features and remove __typename field
    const validFeatures = features
      .filter((f) => f.name.trim() !== "")
      .map((f) => {
        const { __typename, ...featureWithoutTypename } = f;
        return {
          name: featureWithoutTypename.name,
          value: featureWithoutTypename.value || "",
          isIncluded:
            featureWithoutTypename.isIncluded !== undefined
              ? featureWithoutTypename.isIncluded
              : true,
        };
      });

    try {
      const variables = {
        ...formData,
        features: validFeatures,
      };

      if (isEditing) {
        await updatePlan({
          variables: {
            id: plan.id,
            ...variables,
          },
        });
      } else {
        await createPlan({
          variables,
        });
      }

      onSuccess();
    } catch (err) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  const statuses = ["Active", "Inactive", "Archived"];
  const billingCycles = [
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
    { value: "one-time", label: "One-time" },
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white rounded-t-2xl px-6 py-5 border-b border-gray-200">
          <div className="flex justify-between items-center">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-semibold text-gray-900">
                  {isEditing ? "Edit Plan" : "Create New Plan"}
                </h2>
                <p className="text-base mt-2 text-gray-700">
                  {isEditing
                    ? "Update subscription plan details and settings"
                    : "Add a new subscription plan to the system"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg ml-4"
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

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start">
                <svg
                  className="w-5 h-5 text-red-600 mt-0.5 mr-2 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Plan Name */}
              <div className="md:col-span-2 space-y-2">
                <label
                  htmlFor="name"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Plan Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="e.g., Free, Basic, Pro"
                  />
                </div>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <label
                  htmlFor="price"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Price ($) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Billing Cycle */}
              <div className="space-y-2">
                <label
                  htmlFor="billingCycle"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Billing Cycle <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <select
                    id="billingCycle"
                    name="billingCycle"
                    value={formData.billingCycle}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none text-gray-900"
                  >
                    {billingCycles.map((cycle) => (
                      <option key={cycle.value} value={cycle.value}>
                        {cycle.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Users Limit */}
              <div className="space-y-2">
                <label
                  htmlFor="usersLimit"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Total Users Limit <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="number"
                    id="usersLimit"
                    name="usersLimit"
                    value={formData.usersLimit}
                    onChange={handleChange}
                    required
                    min="0"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="Total number of users"
                  />
                </div>
              </div>

              {/* Sales Person Limit */}
              <div className="space-y-2">
                <label
                  htmlFor="salesPersonLimit"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Sales Person Limit <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="number"
                    id="salesPersonLimit"
                    name="salesPersonLimit"
                    value={formData.salesPersonLimit}
                    onChange={handleChange}
                    required
                    min="0"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="Number of sales persons"
                  />
                </div>
              </div>

              {/* Quotation Limit */}
              <div className="space-y-2">
                <label
                  htmlFor="quotationLimit"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Quotation Limit <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                  </div>
                  <input
                    type="number"
                    id="quotationLimit"
                    name="quotationLimit"
                    value={formData.quotationLimit}
                    onChange={handleChange}
                    required
                    min="0"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="Number of quotations per month"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label
                  htmlFor="status"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Status
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none text-gray-900"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Display Order */}
              <div className="space-y-2">
                <label
                  htmlFor="displayOrder"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Display Order
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                        d="M4 6h16M4 10h16M4 14h16M4 18h16"
                      />
                    </svg>
                  </div>
                  <input
                    type="number"
                    id="displayOrder"
                    name="displayOrder"
                    value={formData.displayOrder}
                    onChange={handleChange}
                    min="0"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="md:col-span-2 space-y-2">
                <label
                  htmlFor="description"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Description
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-3 text-gray-400">
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
                  </div>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={2}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none text-gray-900 placeholder-gray-400"
                    placeholder="Brief description of the plan"
                  />
                </div>
              </div>

              {/* Is Popular */}
              <div className="md:col-span-2 space-y-2">
                <label className="flex items-center space-x-3 p-4 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    name="isPopular"
                    checked={formData.isPopular}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Mark as Popular Plan
                  </span>
                </label>
              </div>
            </div>

            {/* Features Section */}
            <div className="border-t border-gray-200 pt-5 mt-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-blue-900">
                  Plan Features
                </h3>
                <button
                  type="button"
                  onClick={addFeature}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all duration-200"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Feature
                </button>
              </div>

              <div className="space-y-3">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-all"
                  >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                            />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={feature.name}
                          onChange={(e) =>
                            handleFeatureChange(index, "name", e.target.value)
                          }
                          placeholder="Feature name (e.g., 10 Users)"
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400 bg-white"
                        />
                      </div>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={feature.value}
                          onChange={(e) =>
                            handleFeatureChange(index, "value", e.target.value)
                          }
                          placeholder="Value (e.g., 10 training modules/month)"
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400 bg-white"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="p-2.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={features.length === 1}
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-900 text-white rounded-xl hover:bg-blue-800 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {isEditing ? "Updating..." : "Creating..."}
                  </span>
                ) : isEditing ? (
                  "Update Plan"
                ) : (
                  "Create Plan"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
