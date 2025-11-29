'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const CREATE_COMPANY = gql`
  mutation CreateCompany(
    $name: String!
    $email: String!
    $phone: String
    $address: String
    $website: String
    $industry: String
    $adminId: ID
    $adminIds: [ID!]
    $planId: ID!
    $status: String
    $logo: String
    $description: String
  ) {
    createCompany(
      name: $name
      email: $email
      phone: $phone
      address: $address
      website: $website
      industry: $industry
      adminId: $adminId
      adminIds: $adminIds
      planId: $planId
      status: $status
      logo: $logo
      description: $description
    ) {
      id
      name
      email
    }
  }
`;

const UPDATE_COMPANY = gql`
  mutation UpdateCompany(
    $id: ID!
    $name: String
    $email: String
    $phone: String
    $address: String
    $website: String
    $industry: String
    $adminId: ID
    $adminIds: [ID!]
    $planId: ID
    $status: String
    $logo: String
    $description: String
  ) {
    updateCompany(
      id: $id
      name: $name
      email: $email
      phone: $phone
      address: $address
      website: $website
      industry: $industry
      adminId: $adminId
      adminIds: $adminIds
      planId: $planId
      status: $status
      logo: $logo
      description: $description
    ) {
      id
      name
      email
    }
  }
`;

const GET_ADMINS = gql`
  query GetUsers {
    getUsers {
      id
      name
      email
      role
      companyId
    }
  }
`;

const GET_ACTIVE_PLANS = gql`
  query GetActivePlans {
    getActivePlans {
      id
      name
      description
      price
      billingCycle
      usersLimit
      salesPersonLimit
      quotationLimit
      status
    }
  }
`;

export default function CompanyForm({ company, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    industry: '',
    adminId: '',
    adminIds: [],
    planId: '',
    status: 'Active',
    description: '',
    logo: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [createCompany] = useMutation(CREATE_COMPANY);
  const [updateCompany] = useMutation(UPDATE_COMPANY);
  const { data: usersData } = useQuery(GET_ADMINS);
  const { data: plansData } = useQuery(GET_ACTIVE_PLANS);

  const isEditing = !!company;

  // Filter users to show only unlinked Admins (or currently linked admins when editing)
  const allAdmins = usersData?.getUsers?.filter(user => user.role === 'Admin') || [];
  const admins = isEditing
    ? allAdmins.filter(admin => 
        // Show admins that are either:
        // 1. Not linked to any company (companyId is null/undefined)
        // 2. Already linked to THIS company (companyId matches current company ID, or in adminIds/adminId)
        !admin.companyId || 
        admin.companyId === company?.id ||
        (company?.adminIds && company.adminIds.includes(admin.id)) ||
        (company?.adminId === admin.id)
      )
    : allAdmins.filter(admin => !admin.companyId);
  const activePlans = plansData?.getActivePlans || [];
  
  // Get selected plan details
  const selectedPlan = activePlans.find(p => p.id === formData.planId);

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || '',
        website: company.website || '',
        industry: company.industry || '',
        adminId: company.adminId || '',
        adminIds: company.adminIds || [],
        planId: company.planId || '',
        status: company.status || 'Active',
        description: company.description || '',
        logo: company.logo || '',
      });
    }
  }, [company]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEditing) {
        await updateCompany({
          variables: {
            id: company.id,
            ...formData,
          },
          refetchQueries: [
            'GetCompanies',
            'GetUsers',
            'GetCompanyControlData',
          ],
          awaitRefetchQueries: true,
        });
      } else {
        if (!formData.planId) {
          setError('Please select a subscription plan');
          setLoading(false);
          return;
        }

        // Build variables - adminIds is optional
        const variables = {
          ...formData,
        };

        // If adminIds is provided, use it; otherwise use adminId if provided
        if (formData.adminIds && formData.adminIds.length > 0) {
          variables.adminIds = formData.adminIds;
          // Set first admin as primary adminId for backward compatibility
          if (formData.adminIds.length > 0) {
            variables.adminId = formData.adminIds[0];
          }
        } else if (formData.adminId) {
          variables.adminId = formData.adminId;
          variables.adminIds = [formData.adminId];
        }
        // If neither is provided, that's okay - it's optional

        await createCompany({
          variables,
          refetchQueries: [
            'GetCompanies',
            'GetUsers',
            'GetCompanyControlData',
          ],
          awaitRefetchQueries: true,
        });
      }

      onSuccess();
    } catch (err) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const statuses = ['Active', 'Inactive', 'Suspended'];
  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Retail',
    'Manufacturing',
    'Real Estate',
    'Consulting',
    'Other',
  ];

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                {isEditing ? 'Edit Company' : 'Add New Company'}
              </h2>
              <p className="text-indigo-100 text-sm mt-1">
                {isEditing ? 'Update company information' : 'Create a new company in the system'}
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
            {/* Company Name */}
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder="Enter company name"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder="company@example.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                Phone
              </label>
              <PhoneInput
                international
                defaultCountry="US"
                value={formData.phone}
                onChange={(value) => setFormData((prev) => ({ ...prev, phone: value || '' }))}
                className="phone-input-wrapper"
                placeholder="Enter phone number"
              />
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-sm font-semibold text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder="https://example.com"
              />
            </div>

            {/* Company Logo */}
            <div className="md:col-span-2">
              <label htmlFor="logo" className="block text-sm font-semibold text-gray-700 mb-2">
                Company Logo URL
              </label>
              <input
                type="url"
                id="logo"
                name="logo"
                value={formData.logo}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder="https://example.com/logo.png"
              />
              <p className="mt-1 text-xs text-gray-500">Enter the URL of your company logo image</p>
              {formData.logo && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">Preview:</p>
                  <img 
                    src={formData.logo} 
                    alt="Company logo preview" 
                    className="h-20 w-auto object-contain border border-gray-200 rounded-lg p-2 bg-gray-50"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Industry */}
            <div>
              <label htmlFor="industry" className="block text-sm font-semibold text-gray-700 mb-2">
                Industry
              </label>
              <select
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900"
              >
                <option value="">Select industry</option>
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>

            {/* Admins - Multi-select (Optional) */}
            <div>
              <label htmlFor="adminIds" className="block text-sm font-semibold text-gray-700 mb-2">
                Company Admins <span className="text-gray-500 text-xs">(Optional - can select multiple)</span>
              </label>
              <select
                id="adminIds"
                name="adminIds"
                multiple
                value={formData.adminIds}
                onChange={(e) => {
                  const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData(prev => ({
                    ...prev,
                    adminIds: selectedOptions,
                    adminId: selectedOptions[0] || '', // Set first as primary for backward compatibility
                  }));
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 min-h-[120px]"
                size={Math.min(admins.length + 1, 6)}
              >
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.name} ({admin.email})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Hold Ctrl/Cmd to select multiple admins. Only unlinked Admin users are shown.
                {formData.adminIds.length > 0 && (
                  <span className="ml-2 text-indigo-600 font-medium">
                    {formData.adminIds.length} admin{formData.adminIds.length !== 1 ? 's' : ''} selected
                  </span>
                )}
              </p>
            </div>

            {/* Subscription Plan */}
            <div>
              <label htmlFor="planId" className="block text-sm font-semibold text-gray-700 mb-2">
                Subscription Plan <span className="text-red-500">*</span>
              </label>
              <select
                id="planId"
                name="planId"
                value={formData.planId}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900"
              >
                <option value="">Select a plan</option>
                {activePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - ${plan.price}/{plan.billingCycle}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Select a subscription plan for this company</p>
            </div>

            {/* Plan Details - Show when plan is selected */}
            {selectedPlan && (
              <div className="md:col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-indigo-200">
                <h3 className="text-sm font-semibold text-indigo-900 mb-3">Plan Limits</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Total Users</p>
                    <p className="text-lg font-bold text-indigo-600">{selectedPlan.usersLimit}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Sales Persons</p>
                    <p className="text-lg font-bold text-purple-600">{selectedPlan.salesPersonLimit}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Quotations</p>
                    <p className="text-lg font-bold text-pink-600">{selectedPlan.quotationLimit}</p>
                  </div>
                </div>
                {selectedPlan.description && (
                  <p className="text-xs text-gray-600 mt-3">{selectedPlan.description}</p>
                )}
              </div>
            )}

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

            {/* Address */}
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder="Enter company address"
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
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder="Brief description of the company"
              />
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
                <span>{isEditing ? 'Update Company' : 'Create Company'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

