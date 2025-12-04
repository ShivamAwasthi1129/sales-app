'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';

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
    name: '',
    description: '',
    price: 0,
    billingCycle: 'monthly',
    usersLimit: 1,
    salesPersonLimit: 0,
    quotationLimit: 0,
    status: 'Active',
    isPopular: false,
    displayOrder: 0,
  });

  const [features, setFeatures] = useState([
    { name: '', value: '', isIncluded: true },
  ]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [createPlan] = useMutation(CREATE_PLAN);
  const [updatePlan] = useMutation(UPDATE_PLAN);

  const isEditing = !!plan;

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || '',
        description: plan.description || '',
        price: plan.price || 0,
        billingCycle: plan.billingCycle || 'monthly',
        usersLimit: plan.usersLimit || 1,
        salesPersonLimit: plan.salesPersonLimit || 0,
        quotationLimit: plan.quotationLimit || 0,
        status: plan.status || 'Active',
        isPopular: plan.isPopular || false,
        displayOrder: plan.displayOrder || 0,
      });
      // Deep clone the features array and remove __typename field added by GraphQL
      const clonedFeatures = plan.features && plan.features.length > 0 
        ? plan.features.map(f => {
            const { __typename, ...featureWithoutTypename } = f;
            return {
              name: featureWithoutTypename.name || '', 
              value: featureWithoutTypename.value || '', 
              isIncluded: featureWithoutTypename.isIncluded !== undefined ? featureWithoutTypename.isIncluded : true 
            };
          })
        : [{ name: '', value: '', isIncluded: true }];
      setFeatures(clonedFeatures);
    }
  }, [plan]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleFeatureChange = (index, field, value) => {
    const newFeatures = features.map((feature, i) => {
      if (i === index) {
        // Create a new object and remove __typename if present
        const { __typename, ...featureWithoutTypename } = feature;
        return {
          ...featureWithoutTypename,
          [field]: value
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
    const newFeatures = features.map(f => {
      const { __typename, ...featureWithoutTypename } = f;
      return featureWithoutTypename;
    });
    newFeatures.push({ name: '', value: '', isIncluded: true });
    setFeatures(newFeatures);
  };

  const removeFeature = (index) => {
    if (features.length > 1) {
      // Create new array without the specified index and remove __typename
      setFeatures(features.filter((_, i) => i !== index).map(f => {
        const { __typename, ...featureWithoutTypename } = f;
        return featureWithoutTypename;
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Filter out empty features and remove __typename field
    const validFeatures = features
      .filter(f => f.name.trim() !== '')
      .map(f => {
        const { __typename, ...featureWithoutTypename } = f;
        return {
          name: featureWithoutTypename.name,
          value: featureWithoutTypename.value || '',
          isIncluded: featureWithoutTypename.isIncluded !== undefined ? featureWithoutTypename.isIncluded : true
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
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const statuses = ['Active', 'Inactive', 'Archived'];
  const billingCycles = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'one-time', label: 'One-time' },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                {isEditing ? 'Edit Plan' : 'Create New Plan'}
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {isEditing ? 'Update subscription plan details' : 'Add a new subscription plan'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plan Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                Plan Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder="e.g., Free, Basic, Pro"
              />
            </div>

            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-2">
                Price ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder="0.00"
              />
            </div>

            {/* Billing Cycle */}
            <div>
              <label htmlFor="billingCycle" className="block text-sm font-semibold text-gray-700 mb-2">
                Billing Cycle <span className="text-red-500">*</span>
              </label>
              <select
                id="billingCycle"
                name="billingCycle"
                value={formData.billingCycle}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900"
              >
                {billingCycles.map((cycle) => (
                  <option key={cycle.value} value={cycle.value}>
                    {cycle.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Users Limit */}
            <div>
              <label htmlFor="usersLimit" className="block text-sm font-semibold text-gray-700 mb-2">
                Total Users Limit <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="usersLimit"
                name="usersLimit"
                value={formData.usersLimit}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder="Total number of users"
              />
            </div>

            {/* Sales Person Limit */}
            <div>
              <label htmlFor="salesPersonLimit" className="block text-sm font-semibold text-gray-700 mb-2">
                Sales Person Limit <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="salesPersonLimit"
                name="salesPersonLimit"
                value={formData.salesPersonLimit}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder="Number of sales persons"
              />
            </div>

            {/* Quotation Limit */}
            <div>
              <label htmlFor="quotationLimit" className="block text-sm font-semibold text-gray-700 mb-2">
                Quotation Limit <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="quotationLimit"
                name="quotationLimit"
                value={formData.quotationLimit}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder="Number of quotations per month"
              />
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Display Order */}
            <div>
              <label htmlFor="displayOrder" className="block text-sm font-semibold text-gray-700 mb-2">
                Display Order
              </label>
              <input
                type="number"
                id="displayOrder"
                name="displayOrder"
                value={formData.displayOrder}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder="0"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder="Brief description of the plan"
              />
            </div>

            {/* Is Popular */}
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="isPopular"
                  checked={formData.isPopular}
                  onChange={handleChange}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-semibold text-gray-700">Mark as Popular Plan</span>
              </label>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-6 border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Plan Features</h3>
              <button
                type="button"
                onClick={addFeature}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Feature
              </button>
            </div>

            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={feature.name}
                      onChange={(e) => handleFeatureChange(index, 'name', e.target.value)}
                      placeholder="Feature name (e.g., 10 Users)"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900"
                    />
                    <input
                      type="text"
                      value={feature.value}
                      onChange={(e) => handleFeatureChange(index, 'value', e.target.value)}
                      placeholder="Value (e.g., 10 training modules/month)"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    disabled={features.length === 1}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                <span>{isEditing ? 'Update Plan' : 'Create Plan'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

