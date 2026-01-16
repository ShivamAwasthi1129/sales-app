// components/CompanyForm.js

"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "graphql-tag";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

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
    name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    industry: "",
    adminId: "",
    adminIds: [],
    planId: "",
    status: "Active",
    description: "",
    logo: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [createCompany] = useMutation(CREATE_COMPANY);
  const [updateCompany] = useMutation(UPDATE_COMPANY);
  const { data: usersData } = useQuery(GET_ADMINS);
  const { data: plansData } = useQuery(GET_ACTIVE_PLANS);

  const isEditing = !!company;

  // Filter users to show only unlinked Admins (or currently linked admins when editing)
  const allAdmins =
    usersData?.getUsers?.filter((user) => user.role === "Admin") || [];
  const admins = isEditing
    ? allAdmins.filter(
      (admin) =>
        // Show admins that are either:
        // 1. Not linked to any company (companyId is null/undefined)
        // 2. Already linked to THIS company (companyId matches current company ID, or in adminIds/adminId)
        !admin.companyId ||
        admin.companyId === company?.id ||
        (company?.adminIds && company.adminIds.includes(admin.id)) ||
        company?.adminId === admin.id
    )
    : allAdmins.filter((admin) => !admin.companyId);
  const activePlans = plansData?.getActivePlans || [];

  // Get selected plan details
  const selectedPlan = activePlans.find((p) => p.id === formData.planId);

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || "",
        email: company.email || "",
        phone: company.phone || "",
        address: company.address || "",
        website: company.website || "",
        industry: company.industry || "",
        adminId: company.adminId || "",
        adminIds: company.adminIds || [],
        planId: company.planId || "",
        status: company.status || "Active",
        description: company.description || "",
        logo: company.logo || "",
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
    setError("");
    setLoading(true);

    try {
      if (isEditing) {
        await updateCompany({
          variables: {
            id: company.id,
            ...formData,
          },
          refetchQueries: ["GetCompanies", "GetUsers", "GetCompanyControlData"],
          awaitRefetchQueries: true,
        });
      } else {
        if (!formData.planId) {
          setError("Please select a subscription plan");
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
          refetchQueries: ["GetCompanies", "GetUsers", "GetCompanyControlData"],
          awaitRefetchQueries: true,
        });
      }

      onSuccess();
    } catch (err) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  const statuses = ["Active", "Inactive", "Suspended"];
  const industries = [
    "Technology",
    "Healthcare",
    "Finance",
    "Education",
    "Retail",
    "Manufacturing",
    "Real Estate",
    "Consulting",
    "Other",
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-semibold text-gray-900">
                  {isEditing ? "Edit Company" : "Create New Company"}
                </h2>
                <p className="text-base mt-2 text-gray-700">
                  {isEditing
                    ? "Update company information and settings"
                    : "Add a new company to the system"}
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
              {/* Company Name */}
              <div className="md:col-span-2 space-y-2">
                <label
                  htmlFor="name"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Company Name <span className="text-red-500">*</span>
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
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
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
                    placeholder="Enter company name"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Email <span className="text-red-500">*</span>
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
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="company@example.com"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label
                  htmlFor="phone"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Phone
                </label>
                <div className="phone-input-wrapper">
                  <PhoneInput
                    international
                    defaultCountry="US"
                    value={formData.phone}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, phone: value || "" }))
                    }
                    className="phone-input-wrapper"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              {/* Website */}
              <div className="space-y-2">
                <label
                  htmlFor="website"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Website
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
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                      />
                    </svg>
                  </div>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              {/* Company Logo */}
              <div className="md:col-span-2 space-y-2">
                <label
                  htmlFor="logo"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Company Logo URL
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
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <input
                    type="url"
                    id="logo"
                    name="logo"
                    value={formData.logo}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Enter the URL of your company logo image
                </p>
                {formData.logo && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2 font-medium">
                      Preview:
                    </p>
                    <img
                      src={formData.logo}
                      alt="Company logo preview"
                      className="h-20 w-auto object-contain border border-gray-200 rounded-lg p-2 bg-gray-50"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Industry */}
              <div className="space-y-2">
                <label
                  htmlFor="industry"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Industry
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
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <select
                    id="industry"
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none text-gray-900"
                  >
                    <option value="">Select industry</option>
                    {industries.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Admins - Multi-select (Optional) */}
              <div className="space-y-2">
                <label
                  htmlFor="adminIds"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Company Admins{" "}
                  <span className="text-gray-500 text-xs font-normal normal-case">
                    (Optional - can select multiple)
                  </span>
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
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                  <select
                    id="adminIds"
                    name="adminIds"
                    multiple
                    value={formData.adminIds}
                    onChange={(e) => {
                      const selectedOptions = Array.from(
                        e.target.selectedOptions,
                        (option) => option.value
                      );
                      setFormData((prev) => ({
                        ...prev,
                        adminIds: selectedOptions,
                        adminId: selectedOptions[0] || "", // Set first as primary for backward compatibility
                      }));
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 min-h-30"
                    size={Math.min(admins.length + 1, 6)}
                  >
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name} ({admin.email})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Hold Ctrl/Cmd to select multiple admins. Only unlinked Admin
                  users are shown.
                  {formData.adminIds.length > 0 && (
                    <span className="ml-2 text-blue-600 font-semibold">
                      {formData.adminIds.length} admin
                      {formData.adminIds.length !== 1 ? "s" : ""} selected
                    </span>
                  )}
                </p>
              </div>

              {/* Subscription Plan */}
              <div className="space-y-2">
                <label
                  htmlFor="planId"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Subscription Plan <span className="text-red-500">*</span>
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
                  <select
                    id="planId"
                    name="planId"
                    value={formData.planId}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none text-gray-900"
                  >
                    <option value="">Select a plan</option>
                    {activePlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - ${plan.price}/{plan.billingCycle}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Select a subscription plan for this company
                </p>
              </div>

              {/* Plan Details - Show when plan is selected */}
              {selectedPlan && (
                <div className="md:col-span-2 bg-blue-50 p-5 rounded-xl border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3">
                    Plan Limits
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1 font-medium">
                        Total Users
                      </p>
                      <p className="text-lg font-bold text-blue-600">
                        {selectedPlan.usersLimit}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1 font-medium">
                        Sales Persons
                      </p>
                      <p className="text-lg font-bold text-purple-600">
                        {selectedPlan.salesPersonLimit}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1 font-medium">
                        Quotations
                      </p>
                      <p className="text-lg font-bold text-pink-600">
                        {selectedPlan.quotationLimit}
                      </p>
                    </div>
                  </div>
                  {selectedPlan.description && (
                    <p className="text-xs text-gray-600 mt-3 font-medium">
                      {selectedPlan.description}
                    </p>
                  )}
                </div>
              )}

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

              {/* Address */}
              <div className="md:col-span-2 space-y-2">
                <label
                  htmlFor="address"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  Address
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
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={2}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none text-gray-900 placeholder-gray-400"
                    placeholder="Enter company address"
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
                    rows={3}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none text-gray-900 placeholder-gray-400"
                    placeholder="Brief description of the company"
                  />
                </div>
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
                  "Update Company"
                ) : (
                  "Create Company"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
