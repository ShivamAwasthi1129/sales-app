// settings/page.js

"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import { gql } from "graphql-tag";
import { toast } from "react-toastify";

const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    getCurrentUser {
      id
      name
      email
      role
      phone
      address
      companyId
    }
  }
`;

const GET_COMPANY = gql`
  query GetCompany($id: ID!) {
    getCompany(id: $id) {
      id
      name
      email
      phone
      address
      website
      industry
      status
      logo
      description
      planId
      plan {
        id
        name
        price
        billingCycle
      }
      planLimits {
        salesPersonLimit
        quotationLimit
        usersLimit
      }
      currentUsage {
        salesPersonCount
        quotationCount
        usersCount
      }
      enabledRoles
      createdAt
      updatedAt
    }
  }
`;

const GET_COMPANY_ADMINS = gql`
  query GetUsers {
    getUsers {
      id
      name
      email
      role
      phone
      address
      status
      companyId
      createdAt
    }
  }
`;

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("company");
  const { data: currentUserData, loading: userLoading } =
    useQuery(GET_CURRENT_USER);
  const {
    data: companyData,
    loading: companyLoading,
    error: companyError,
    refetch: refetchCompany,
  } = useQuery(GET_COMPANY, {
    variables: { id: currentUserData?.getCurrentUser?.companyId },
    skip: !currentUserData?.getCurrentUser?.companyId,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const {
    data: adminsData,
    loading: adminsLoading,
    refetch: refetchAdmins,
  } = useQuery(GET_COMPANY_ADMINS, {
    fetchPolicy: "cache-and-network",
  });

  const currentUser = currentUserData?.getCurrentUser;
  const company = companyData?.getCompany;
  const companyId = currentUser?.companyId;

  // Filter admins for this company
  const companyAdmins =
    adminsData?.getUsers?.filter(
      (user) => user.role === "Admin" && user.companyId === companyId
    ) || [];

  // Filter sales persons by company - show all sales persons of the company
  // The resolver already filters by companyId, but we add an extra check here for safety

  if (userLoading || companyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!currentUser?.companyId) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        <p className="font-semibold">Company not found</p>
        <p className="text-sm mt-1">
          You are not associated with any company. Please contact Super Admin.
        </p>
      </div>
    );
  }

  if (companyError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        <p className="font-semibold">Error loading company</p>
        <p className="text-sm mt-1">{companyError.message}</p>
        {currentUser?.companyId && (
          <p className="text-xs mt-2 text-red-600">
            Company ID: {currentUser.companyId}
          </p>
        )}
      </div>
    );
  }

  if (!company && !companyLoading) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl">
        <p className="font-semibold">Company information not available</p>
        <p className="text-sm mt-1">
          Unable to fetch company details. Please try refreshing the page.
        </p>
        {currentUser?.companyId && (
          <p className="text-xs mt-2 text-yellow-600">
            Company ID: {currentUser.companyId}
          </p>
        )}
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
          {/* Left Section - Title and Info */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-blue-600 animate-lightning"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                  Global Settings
                </h1>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-600"
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
                  <p className="text-sm text-gray-400 font-semibold">
                    {company?.name || "Company"}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-base mt-4 text-gray-700">
              Manage your company settings and team
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 hover:shadow-md transition-all">
        <div className="flex space-x-2 overflow-x-auto">
          {[
            { id: "company", name: "Company Information" },
            { id: "admins", name: "Company Admins" },
            { id: "usage", name: "Usage & Limits" },
            { id: "notes", name: "Notes & Terms" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                  ? "bg-blue-900 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all">
        {/* Company Information Tab */}
        {activeTab === "company" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-blue-900 mb-4">
                Company Details
              </h2>
              {/* Company Logo */}
              {company.logo && (
                <div className="mb-6 flex items-center justify-center">
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <img
                      src={company.logo}
                      alt={`${company.name} logo`}
                      className="h-24 w-auto object-contain max-w-xs"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Company Name
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {company.name}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Email
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {company.email}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Phone
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {company.phone || "N/A"}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Website
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {company.website || "N/A"}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Industry
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {company.industry || "N/A"}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Status
                  </label>
                  <span
                    className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${company.status === "Active"
                        ? "bg-green-100 text-green-800 border-green-300"
                        : "bg-red-100 text-red-800 border-red-300"
                      }`}
                  >
                    {company.status}
                  </span>
                </div>
                <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Address
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {company.address || "N/A"}
                  </p>
                </div>
                {company.description && (
                  <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Description
                    </label>
                    <p className="text-gray-900">{company.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Plan Information */}
            {company.plan && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-bold text-blue-900 mb-4">
                  Subscription Plan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-all">
                    <label className="block text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">
                      Plan Name
                    </label>
                    <p className="text-lg font-semibold text-blue-900">
                      {company.plan.name}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-all">
                    <label className="block text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">
                      Price
                    </label>
                    <p className="text-lg font-semibold text-blue-900">
                      ${company.plan.price || "0"}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-all">
                    <label className="block text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">
                      Billing Cycle
                    </label>
                    <p className="text-lg font-semibold text-blue-900">
                      {company.plan.billingCycle || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Company Admins Tab */}
        {activeTab === "admins" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-blue-900">
                Company Administrators
              </h2>
              <div className="text-sm text-gray-500">
                Total:{" "}
                <span className="font-semibold text-gray-900">
                  {companyAdmins.length}
                </span>
              </div>
            </div>

            {adminsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : companyAdmins.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500">
                  No administrators found for this company.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companyAdmins.map((admin) => (
                  <div
                    key={admin.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-semibold">
                              {admin.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {admin.name}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {admin.role}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-600">
                            <span className="font-medium">Email:</span>{" "}
                            {admin.email}
                          </p>
                          {admin.phone && (
                            <p className="text-gray-600">
                              <span className="font-medium">Phone:</span>{" "}
                              {admin.phone}
                            </p>
                          )}
                          <p className="text-gray-600">
                            <span className="font-medium">Status:</span>{" "}
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${admin.status === "Active"
                                  ? "bg-green-100 text-green-800 border-green-300"
                                  : "bg-red-100 text-red-800 border-red-300"
                                }`}
                            >
                              {admin.status}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Usage & Limits Tab */}
        {activeTab === "usage" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-blue-900">Usage & Limits</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sales Persons */}
              <div className="bg-white border border-blue-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-blue-900">
                    Sales Persons
                  </h3>
                  <div className="p-3 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-700 font-bold uppercase tracking-wide">
                      Used
                    </span>
                    <span className="text-2xl font-bold text-blue-900">
                      {company.currentUsage?.salesPersonCount || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-700 font-bold uppercase tracking-wide">
                      Limit
                    </span>
                    <span className="text-2xl font-bold text-blue-900">
                      {company.planLimits?.salesPersonLimit || 0}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2.5 mt-2">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          ((company.currentUsage?.salesPersonCount || 0) /
                            (company.planLimits?.salesPersonLimit || 1)) *
                          100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Quotations */}
              <div className="bg-white border border-green-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-green-900">
                    Quotations
                  </h3>
                  <div className="p-3 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-green-700 font-bold uppercase tracking-wide">
                      Used
                    </span>
                    <span className="text-2xl font-bold text-green-900">
                      {company.currentUsage?.quotationCount || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-green-700 font-bold uppercase tracking-wide">
                      Limit
                    </span>
                    <span className="text-2xl font-bold text-green-900">
                      {company.planLimits?.quotationLimit || 0}
                    </span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2.5 mt-2">
                    <div
                      className="bg-green-600 h-2.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          ((company.currentUsage?.quotationCount || 0) /
                            (company.planLimits?.quotationLimit || 1)) *
                          100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Users */}
              <div className="bg-white border border-purple-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-purple-900">
                    Users
                  </h3>
                  <div className="p-3 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-purple-700 font-bold uppercase tracking-wide">
                      Used
                    </span>
                    <span className="text-2xl font-bold text-purple-900">
                      {company.currentUsage?.usersCount || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-purple-700 font-bold uppercase tracking-wide">
                      Limit
                    </span>
                    <span className="text-2xl font-bold text-purple-900">
                      {company.planLimits?.usersLimit || 0}
                    </span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2.5 mt-2">
                    <div
                      className="bg-purple-600 h-2.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          ((company.currentUsage?.usersCount || 0) /
                            (company.planLimits?.usersLimit || 1)) *
                          100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enabled Roles */}
            {company.enabledRoles && company.enabledRoles.length > 0 && (
              <div className="mt-4 bg-gray-50 p-5 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Enabled Roles
                </h3>
                <div className="flex flex-wrap gap-2">
                  {company.enabledRoles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex px-3 py-1 text-sm font-semibold rounded-full border bg-indigo-100 text-indigo-800 border-indigo-300"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes & Terms Tab */}
        {activeTab === "notes" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-blue-900 mb-2">
                Quotation Notes & Terms
              </h2>
              <p className="text-gray-600 mb-4">
                Manage default notes and terms that will appear in all
                quotations for this company
              </p>
            </div>

            <NotesAndTermsForm
              company={company}
              refetchCompany={refetchCompany}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Notes & Terms Form Component
function NotesAndTermsForm({ company, refetchCompany }) {
  const [notesToClient, setNotesToClient] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const GET_NOTES_AND_TERMS = gql`
    query GetNotesAndTerms($companyId: ID!) {
      getNotesAndTerms(companyId: $companyId) {
        id
        companyId
        notesToClient
        termsAndConditions
        createdAt
        updatedAt
      }
    }
  `;

  const UPDATE_NOTES_AND_TERMS = gql`
    mutation UpdateNotesAndTerms($companyId: ID!, $input: NotesAndTermsInput!) {
      updateNotesAndTerms(companyId: $companyId, input: $input) {
        id
        companyId
        notesToClient
        termsAndConditions
        updatedAt
      }
    }
  `;

  const {
    data: notesAndTermsData,
    loading: notesLoading,
    refetch: refetchNotesAndTerms,
  } = useQuery(GET_NOTES_AND_TERMS, {
    variables: { companyId: company?.id },
    skip: !company?.id,
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      if (data?.getNotesAndTerms) {
        setNotesToClient(data.getNotesAndTerms.notesToClient || "");
        setTermsAndConditions(data.getNotesAndTerms.termsAndConditions || "");
        setIsLoading(false);
      }
    },
  });

  const [updateNotesAndTerms] = useMutation(UPDATE_NOTES_AND_TERMS);

  // Initialize state when data is loaded
  useEffect(() => {
    if (notesAndTermsData?.getNotesAndTerms) {
      const notes = notesAndTermsData.getNotesAndTerms.notesToClient || "";
      const terms = notesAndTermsData.getNotesAndTerms.termsAndConditions || "";
      setNotesToClient(notes);
      setTermsAndConditions(terms);
      setIsLoading(false);
    } else if (!notesLoading && company?.id) {
      // If no data found, set defaults
      setNotesToClient(
        "Thank you for your interest in our products/services.\n\nPlease review the quotation carefully and contact us if you have any questions.\n\nWe look forward to working with you."
      );
      setTermsAndConditions(
        "• Payment terms: Net 30 days from invoice date\n• All prices are subject to change without prior notice\n• Delivery time: As per agreed schedule\n• Warranty: Standard warranty applies as per product specifications"
      );
      setIsLoading(false);
    }
  }, [notesAndTermsData, notesLoading, company?.id]);

  const handleSave = async () => {
    if (!company?.id) return;

    setIsSaving(true);
    try {
      const { data } = await updateNotesAndTerms({
        variables: {
          companyId: company.id,
          input: {
            notesToClient: notesToClient.trim(),
            termsAndConditions: termsAndConditions.trim(),
          },
        },
        refetchQueries: [
          {
            query: GET_NOTES_AND_TERMS,
            variables: { companyId: company.id },
          },
        ],
        awaitRefetchQueries: true,
      });

      // Update local state with the response
      if (data?.updateNotesAndTerms) {
        setNotesToClient(data.updateNotesAndTerms.notesToClient || "");
        setTermsAndConditions(
          data.updateNotesAndTerms.termsAndConditions || ""
        );
      }

      // Refetch to ensure UI is in sync
      await refetchNotesAndTerms();

      toast.success("Notes and Terms updated successfully");
    } catch (error) {
      console.error("Error updating notes and terms:", error);
      toast.error(error.message || "Failed to update notes and terms");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes to Client
            </label>
            <p className="text-xs text-gray-500 mb-3">
              These notes will automatically appear in all quotations created
              for this company
            </p>
            <textarea
              value={notesToClient}
              onChange={(e) => setNotesToClient(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
              placeholder="Enter default notes to client..."
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Terms & Conditions
            </label>
            <p className="text-xs text-gray-500 mb-3">
              These terms will automatically appear in all quotations created
              for this company
            </p>
            <textarea
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
              placeholder="Enter default terms and conditions..."
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm hover:shadow-md"
          >
            {isSaving ? (
              <>
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
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
