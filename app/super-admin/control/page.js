// super-admin/control/page.js

"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "graphql-tag";
import { toast } from "react-toastify";

const GET_COMPANY_CONTROL_DATA = gql`
  query GetCompanyControlData {
    getCompanyControlData {
      company {
        id
        name
        email
        phone
        address
        website
        industry
        status
        plan {
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
        sidebarModules {
          name
          path
          icon
          enabled
        }
      }
      users {
        id
        name
        email
        role
        status
      }
      salesPersons {
        id
        name
        email
        phone
        salesPersonId
        status
      }
      customers {
        businessName
        email
        phone
        address
        quotationCount
        lastQuotationDate
      }
    }
  }
`;

const UPDATE_COMPANY_ROLES = gql`
  mutation UpdateCompanyRoles($id: ID!, $enabledRoles: [String!]!) {
    updateCompanyRoles(id: $id, enabledRoles: $enabledRoles) {
      id
      enabledRoles
    }
  }
`;

const UPDATE_COMPANY_SIDEBAR_MODULES = gql`
  mutation UpdateCompanySidebarModules(
    $id: ID!
    $sidebarModules: [SidebarModuleInput!]!
  ) {
    updateCompanySidebarModules(id: $id, sidebarModules: $sidebarModules) {
      id
      sidebarModules {
        name
        path
        icon
        enabled
      }
    }
  }
`;

export default function SuperAdminControlPage() {
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [activeTabs, setActiveTabs] = useState({}); // Store active tab per company: { companyId: 'overview' }

  const { data, loading, error, refetch } = useQuery(GET_COMPANY_CONTROL_DATA, {
    fetchPolicy: "cache-and-network",
  });
  const [updateCompanyRoles] = useMutation(UPDATE_COMPANY_ROLES);
  const [updateCompanySidebarModules] = useMutation(
    UPDATE_COMPANY_SIDEBAR_MODULES
  );

  const handleToggleCompany = (companyId) => {
    setExpandedCompany(expandedCompany === companyId ? null : companyId);
    // Set default tab to 'overview' when expanding a company
    if (expandedCompany !== companyId) {
      setActiveTabs((prev) => ({ ...prev, [companyId]: "overview" }));
    }
  };

  const setActiveTab = (companyId, tab) => {
    setActiveTabs((prev) => ({ ...prev, [companyId]: tab }));
  };

  const getActiveTab = (companyId) => {
    return activeTabs[companyId] || "overview";
  };

  const handleRoleToggle = async (companyId, role, currentRoles) => {
    try {
      let newRoles;

      if (role === "Admin") {
        // If disabling Admin, also disable Customer and Sales Person (hierarchy)
        const isDisabling = currentRoles.includes(role);
        if (isDisabling) {
          newRoles = currentRoles.filter(
            (r) => r !== "Admin" && r !== "Customer" && r !== "Sales Person"
          );
          toast.success(
            "Admin role disabled. Customer and Sales Person roles have also been disabled."
          );
        } else {
          // Enabling Admin - just add it
          newRoles = [...currentRoles, "Admin"];
          toast.success("Admin role enabled successfully");
        }
      } else {
        // For Customer and Sales Person, check if Admin is enabled first
        if (!currentRoles.includes("Admin")) {
          toast.error(
            "Cannot enable this role. Admin role must be enabled first."
          );
          return;
        }

        newRoles = currentRoles.includes(role)
          ? currentRoles.filter((r) => r !== role)
          : [...currentRoles, role];

        toast.success(
          `${role} role ${currentRoles.includes(role) ? "disabled" : "enabled"
          } successfully`
        );
      }

      const result = await updateCompanyRoles({
        variables: { id: companyId, enabledRoles: newRoles },
        refetchQueries: [
          { query: GET_COMPANY_CONTROL_DATA },
          "GetCompanies",
          "GetUsers",
        ],
        awaitRefetchQueries: true,
      });

      if (result?.data?.updateCompanyRoles) {
        await refetch();
      } else {
        throw new Error("Failed to update roles - no data returned");
      }
    } catch (err) {
      console.error("Error updating roles:", err);
      toast.error(err.message || "Failed to update role");
    }
  };

  const handleModuleToggle = async (companyId, modulePath, currentModules) => {
    try {
      const updatedModules = currentModules.map((module) => ({
        name: module.name,
        path: module.path,
        icon: module.icon,
        enabled: module.path === modulePath ? !module.enabled : module.enabled,
      }));

      const result = await updateCompanySidebarModules({
        variables: { id: companyId, sidebarModules: updatedModules },
        refetchQueries: [
          { query: GET_COMPANY_CONTROL_DATA },
          "GetCompanies",
          "GetUsers",
        ],
        awaitRefetchQueries: true,
      });

      if (result?.data?.updateCompanySidebarModules) {
        toast.success("Sidebar module updated successfully");
        await refetch();
      } else {
        throw new Error("Failed to update modules - no data returned");
      }
    } catch (err) {
      console.error("Error updating sidebar modules:", err);
      toast.error(err.message || "Failed to update module");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        <p className="font-semibold">Error loading control data</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  const companies = data?.getCompanyControlData || [];

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
                  Control Center
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
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <p className="text-sm text-gray-400 font-semibold">
                    System-wide Controls
                  </p>
                </div>
              </div>
            </div>
            <p className="text-base mt-4 text-gray-700">
              Manage companies, roles, and sidebar modules
            </p>
          </div>

          {/* Right Section - Stats */}
          <div className="w-full sm:w-auto grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 shadow-md">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
                Companies
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {companies.length}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-100 shadow-md">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">
                Admins
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {companies.reduce((sum, c) => sum + (c.users?.length || 0), 0)}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100 shadow-md">
              <p className="text-xs text-purple-600 font-bold uppercase tracking-wide mb-1">
                Sales Persons
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {companies.reduce(
                  (sum, c) => sum + (c.salesPersons?.length || 0),
                  0
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Companies List */}
      <div className="space-y-4">
        {companies.map((item) => {
          const { company, users, salesPersons, customers } = item;
          const isExpanded = expandedCompany === company.id;

          return (
            <div
              key={company.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all"
            >
              {/* Company Header */}
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleToggleCompany(company.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-3 h-3 rounded-full ${company.status === "Active"
                        ? "bg-green-500"
                        : company.status === "Suspended"
                          ? "bg-red-500"
                          : "bg-gray-400"
                        }`}
                    ></div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {company.name}
                      </h2>
                      <p className="text-sm text-gray-600">{company.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                        Plan
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {company.plan?.name || "N/A"} - $
                        {company.plan?.price || 0}/
                        {company.plan?.billingCycle || "month"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                        Status
                      </p>
                      <p
                        className={`text-sm font-semibold mt-1 ${company.status === "Active"
                          ? "text-green-600"
                          : company.status === "Suspended"
                            ? "text-red-600"
                            : "text-gray-600"
                          }`}
                      >
                        {company.status}
                      </p>
                    </div>
                    <svg
                      className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? "transform rotate-180" : ""
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
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50">
                  {/* Tabs */}
                  <div className="bg-white rounded-lg shadow-sm border-b border-gray-200 p-2">
                    <div className="flex space-x-2 overflow-x-auto">
                      {["overview", "roles", "modules"].map((tab) => (
                        <button
                          key={tab}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab(company.id, tab);
                          }}
                          className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${getActiveTab(company.id) === tab
                            ? "bg-blue-900 text-white shadow-md"
                            : "text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                          {tab === "overview"
                            ? "Overview"
                            : tab === "roles"
                              ? `Roles (${company.enabledRoles?.length || 0})`
                              : "Sidebar Modules"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Overview Tab */}
                    {getActiveTab(company.id) === "overview" && (
                      <div className="space-y-4">
                        {/* Company Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
                            <h3 className="text-lg font-bold text-blue-900 mb-4">
                              Company Information
                            </h3>
                            <div className="space-y-2 text-sm">
                              <p className="text-gray-700">
                                <span className="font-semibold text-gray-900">
                                  Industry:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {company.industry || "N/A"}
                                </span>
                              </p>
                              <p className="text-gray-700">
                                <span className="font-semibold text-gray-900">
                                  Phone:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {company.phone || "N/A"}
                                </span>
                              </p>
                              <p className="text-gray-700">
                                <span className="font-semibold text-gray-900">
                                  Website:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {company.website || "N/A"}
                                </span>
                              </p>
                              <p className="text-gray-700">
                                <span className="font-semibold text-gray-900">
                                  Address:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {company.address || "N/A"}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
                            <h3 className="text-lg font-bold text-blue-900 mb-4">
                              Plan Usage
                            </h3>
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-gray-700 font-semibold">
                                    Sales Persons
                                  </span>
                                  <span className="text-gray-900 font-semibold">
                                    {company.currentUsage.salesPersonCount} /{" "}
                                    {company.planLimits.salesPersonLimit}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-indigo-600 h-2 rounded-full"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        (company.currentUsage.salesPersonCount /
                                          company.planLimits.salesPersonLimit) *
                                        100
                                      )}%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-gray-700 font-semibold">
                                    Admins
                                  </span>
                                  <span className="text-gray-900 font-semibold">
                                    {company.currentUsage.usersCount} /{" "}
                                    {company.planLimits.usersLimit}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-purple-600 h-2 rounded-full"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        (company.currentUsage.usersCount /
                                          company.planLimits.usersLimit) *
                                        100
                                      )}%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-gray-700 font-semibold">
                                    Quotations
                                  </span>
                                  <span className="text-gray-900 font-semibold">
                                    {company.currentUsage.quotationCount} /{" "}
                                    {company.planLimits.quotationLimit}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-pink-600 h-2 rounded-full"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        (company.currentUsage.quotationCount /
                                          company.planLimits.quotationLimit) *
                                        100
                                      )}%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Admins Section */}
                        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
                          <h3 className="text-lg font-bold text-blue-900 mb-3">
                            Admins ({users.length})
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                                    Name
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                                    Email
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                                    Role
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                                    Status
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => (
                                  <tr
                                    key={user.id}
                                    className="hover:bg-gray-50"
                                  >
                                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                      {user.name}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-600">
                                      {user.email}
                                    </td>
                                    <td className="px-4 py-2 text-sm">
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full border bg-indigo-100 text-indigo-800 border-indigo-300">
                                        {user.role}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-sm">
                                      <span
                                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${user.status === "Active"
                                          ? "bg-green-100 text-green-800 border-green-300"
                                          : "bg-gray-100 text-gray-800 border-gray-300"
                                          }`}
                                      >
                                        {user.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {users.length === 0 && (
                                  <tr>
                                    <td
                                      colSpan="4"
                                      className="px-4 py-8 text-center text-gray-500"
                                    >
                                      No admins found
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Sales Persons Section */}
                        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
                          <h3 className="text-lg font-bold text-blue-900 mb-3">
                            Sales Persons ({salesPersons.length})
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                                    ID
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                                    Name
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                                    Email
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                                    Phone
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                                    Status
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {salesPersons.map((sp) => (
                                  <tr key={sp.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-sm font-mono font-medium text-gray-900">
                                      {sp.salesPersonId}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-900">
                                      {sp.name}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-600">
                                      {sp.email}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-600">
                                      {sp.phone}
                                    </td>
                                    <td className="px-4 py-2 text-sm">
                                      <span
                                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${sp.status === "Active"
                                          ? "bg-green-100 text-green-800 border-green-300"
                                          : "bg-gray-100 text-gray-800 border-gray-300"
                                          }`}
                                      >
                                        {sp.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {salesPersons.length === 0 && (
                                  <tr>
                                    <td
                                      colSpan="5"
                                      className="px-4 py-8 text-center text-gray-500"
                                    >
                                      No sales persons found
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Customers Section */}
                        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
                          <h3 className="text-lg font-bold text-blue-900 mb-3">
                            Customers ({customers.length})
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                                    Business Name
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                                    Email
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                                    Phone
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                                    Quotations
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                                    Last Quote
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {customers.map((customer, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                      {customer.businessName}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-600">
                                      {customer.email || "N/A"}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-600">
                                      {customer.phone || "N/A"}
                                    </td>
                                    <td className="px-4 py-2 text-sm">
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full border bg-blue-100 text-blue-800 border-blue-300">
                                        {customer.quotationCount}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-600">
                                      {customer.lastQuotationDate
                                        ? new Date(
                                          customer.lastQuotationDate
                                        ).toLocaleDateString()
                                        : "N/A"}
                                    </td>
                                  </tr>
                                ))}
                                {customers.length === 0 && (
                                  <tr>
                                    <td
                                      colSpan="5"
                                      className="px-4 py-8 text-center text-gray-500"
                                    >
                                      No customers found
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Roles Tab */}
                    {getActiveTab(company.id) === "roles" && (
                      <div className="space-y-4">
                        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
                          <h3 className="text-lg font-bold text-blue-900 mb-2">
                            Manage Enabled Roles
                          </h3>
                          <p className="text-sm text-gray-600 mb-6">
                            Enable or disable specific roles for this company.
                            Disabled roles cannot be assigned to users.
                          </p>
                          <div className="space-y-3">
                            {["Admin", "Customer", "Sales Person"].map(
                              (role) => {
                                const isEnabled =
                                  company.enabledRoles?.includes(role) ?? true;
                                const isDisabledByHierarchy =
                                  role !== "Admin" &&
                                  !company.enabledRoles?.includes("Admin");

                                return (
                                  <div
                                    key={role}
                                    className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors ${isDisabledByHierarchy ? "opacity-50" : ""
                                      }`}
                                  >
                                    <div>
                                      <p className="font-semibold text-gray-900">
                                        {role}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        {isDisabledByHierarchy
                                          ? "Disabled (Admin role must be enabled first)"
                                          : isEnabled
                                            ? "Enabled for this company"
                                            : "Disabled for this company"}
                                      </p>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isDisabledByHierarchy) {
                                          handleRoleToggle(
                                            company.id,
                                            role,
                                            company.enabledRoles || []
                                          );
                                        }
                                      }}
                                      disabled={isDisabledByHierarchy}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDisabledByHierarchy
                                        ? "bg-gray-200 cursor-not-allowed"
                                        : isEnabled
                                          ? "bg-blue-900"
                                          : "bg-gray-300"
                                        }`}
                                    >
                                      <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled
                                          ? "translate-x-6"
                                          : "translate-x-1"
                                          }`}
                                      />
                                    </button>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Modules Tab */}
                    {getActiveTab(company.id) === "modules" && (
                      <div className="space-y-4">
                        {/* Header Section */}
                        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
                          <div className="flex items-center space-x-3 mb-4">
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
                                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                                />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-blue-900">
                                Sidebar Modules
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                Customize navigation for company users
                              </p>
                            </div>
                          </div>

                          {/* Stats Bar */}
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-lg border border-green-100">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-semibold text-green-700">
                                {company.sidebarModules?.filter(
                                  (m) => m.enabled
                                ).length || 0}{" "}
                                Active
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              <span className="text-sm font-semibold text-gray-700">
                                {company.sidebarModules?.filter(
                                  (m) => !m.enabled
                                ).length || 0}{" "}
                                Disabled
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
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
                                  d="M4 6h16M4 12h16M4 18h16"
                                />
                              </svg>
                              <span className="text-sm font-semibold text-blue-700">
                                {company.sidebarModules?.length || 0} Total
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Categorize Modules */}
                        {(() => {
                          // Categorization logic
                          const categorizeModule = (module) => {
                            const nameLower = module.name.toLowerCase();
                            const pathLower = module.path.toLowerCase();

                            if (nameLower.includes("dashboard"))
                              return "navigation";
                            if (
                              nameLower.includes("quotation") ||
                              nameLower.includes("quote") ||
                              pathLower.includes("quote")
                            )
                              return "sales";
                            if (nameLower.includes("track")) return "sales";
                            if (
                              nameLower.includes("catalogue") ||
                              nameLower.includes("catalog")
                            )
                              return "products";
                            if (nameLower.includes("offer")) return "products";
                            if (nameLower.includes("coupon")) return "products";
                            if (
                              nameLower.includes("user") ||
                              nameLower.includes("team")
                            )
                              return "team";
                            if (
                              nameLower.includes("sales person") ||
                              pathLower.includes("sales-person")
                            )
                              return "team";
                            if (nameLower.includes("analytic"))
                              return "analytics";
                            if (nameLower.includes("setting"))
                              return "settings";
                            return "other";
                          };

                          // Group modules by category
                          const categories = {
                            navigation: {
                              name: "Navigation & Overview",
                              modules: [],
                              bgColor: "bg-blue-50",
                              borderColor: "border-blue-100",
                              textColor: "text-blue-700",
                            },
                            sales: {
                              name: "Sales & Quotations",
                              modules: [],
                              bgColor: "bg-purple-50",
                              borderColor: "border-purple-100",
                              textColor: "text-purple-700",
                            },
                            products: {
                              name: "Products & Offers",
                              modules: [],
                              bgColor: "bg-orange-50",
                              borderColor: "border-orange-100",
                              textColor: "text-orange-700",
                            },
                            team: {
                              name: "Team Management",
                              modules: [],
                              bgColor: "bg-green-50",
                              borderColor: "border-green-100",
                              textColor: "text-green-700",
                            },
                            analytics: {
                              name: "Analytics & Reports",
                              modules: [],
                              bgColor: "bg-indigo-50",
                              borderColor: "border-indigo-100",
                              textColor: "text-indigo-700",
                            },
                            settings: {
                              name: "Settings & Config",
                              modules: [],
                              bgColor: "bg-gray-50",
                              borderColor: "border-gray-200",
                              textColor: "text-gray-700",
                            },
                            other: {
                              name: "Other Modules",
                              modules: [],
                              bgColor: "bg-teal-50",
                              borderColor: "border-teal-100",
                              textColor: "text-teal-700",
                            },
                          };

                          // Group modules
                          company.sidebarModules?.forEach((module) => {
                            const category = categorizeModule(module);
                            categories[category].modules.push(module);
                          });

                          // Filter out empty categories
                          const activeCategories = Object.entries(
                            categories
                          ).filter(([_, cat]) => cat.modules.length > 0);

                          return (
                            <div className="space-y-6">
                              {activeCategories.map(
                                ([categoryKey, category]) => (
                                  <div key={categoryKey} className="space-y-4">
                                    {/* Category Header */}
                                    <div
                                      className={`${category.bgColor} ${category.borderColor} border rounded-lg px-4 py-3`}
                                    >
                                      <h4
                                        className={`${category.textColor} font-bold text-lg flex items-center justify-between`}
                                      >
                                        <span>{category.name}</span>
                                        <span
                                          className={`${category.bgColor} ${category.textColor} px-2.5 py-1 rounded-full text-xs font-semibold border ${category.borderColor}`}
                                        >
                                          {category.modules.length}{" "}
                                          {category.modules.length === 1
                                            ? "module"
                                            : "modules"}
                                        </span>
                                      </h4>
                                    </div>

                                    {/* Modules Grid for this category */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {category.modules.map((module) => {
                                        // Icon mapping based on module name
                                        const getModuleIcon = (name, path) => {
                                          const nameLower = name.toLowerCase();
                                          const pathLower = path.toLowerCase();

                                          if (
                                            nameLower.includes("dashboard") ||
                                            pathLower.includes("dashboard")
                                          ) {
                                            return (
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
                                                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                                                />
                                              </svg>
                                            );
                                          } else if (
                                            nameLower.includes("quotation") ||
                                            nameLower.includes("quote") ||
                                            pathLower.includes("quote")
                                          ) {
                                            return (
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
                                            );
                                          } else if (
                                            nameLower.includes("catalogue") ||
                                            nameLower.includes("catalog") ||
                                            pathLower.includes("catalogue")
                                          ) {
                                            return (
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
                                                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                                />
                                              </svg>
                                            );
                                          } else if (
                                            nameLower.includes("offer") ||
                                            pathLower.includes("offer")
                                          ) {
                                            return (
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
                                            );
                                          } else if (
                                            nameLower.includes("user") ||
                                            nameLower.includes("team") ||
                                            pathLower.includes("user")
                                          ) {
                                            return (
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
                                            );
                                          } else if (
                                            nameLower.includes("sales") ||
                                            pathLower.includes("sales")
                                          ) {
                                            return (
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
                                            );
                                          } else if (
                                            nameLower.includes("track") ||
                                            pathLower.includes("track")
                                          ) {
                                            return (
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
                                                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                                />
                                              </svg>
                                            );
                                          } else if (
                                            nameLower.includes("setting") ||
                                            pathLower.includes("setting")
                                          ) {
                                            return (
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
                                                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                                />
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                              </svg>
                                            );
                                          } else if (
                                            nameLower.includes("coupon") ||
                                            pathLower.includes("coupon")
                                          ) {
                                            return (
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
                                                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                                />
                                              </svg>
                                            );
                                          } else if (
                                            nameLower.includes("analytic") ||
                                            pathLower.includes("analytic")
                                          ) {
                                            return (
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
                                                  d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                              </svg>
                                            );
                                          } else {
                                            return (
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
                                                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                                                />
                                              </svg>
                                            );
                                          }
                                        };

                                        return (
                                          <div
                                            key={module.path}
                                            className={`bg-white rounded-lg border ${module.enabled
                                              ? "border-blue-200 hover:border-blue-300"
                                              : "border-gray-200 hover:border-gray-300"
                                              } p-4 hover:shadow-md transition-all cursor-pointer`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleModuleToggle(
                                                company.id,
                                                module.path,
                                                company.sidebarModules
                                              );
                                            }}
                                          >
                                            <div className="flex items-start justify-between mb-3">
                                              {/* Icon */}
                                              <div
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${module.enabled
                                                  ? "bg-blue-100 text-blue-600"
                                                  : "bg-gray-100 text-gray-400"
                                                  }`}
                                              >
                                                {getModuleIcon(
                                                  module.name,
                                                  module.path
                                                )}
                                              </div>

                                              {/* Status Badge */}
                                              <span
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${module.enabled
                                                  ? "bg-green-100 text-green-700 border-green-300"
                                                  : "bg-gray-100 text-gray-600 border-gray-300"
                                                  }`}
                                              >
                                                {module.enabled
                                                  ? "Active"
                                                  : "Disabled"}
                                              </span>
                                            </div>

                                            {/* Content */}
                                            <div className="mb-3">
                                              <h4 className="text-base font-bold text-gray-900 mb-1">
                                                {module.name}
                                              </h4>
                                              <p className="text-xs text-gray-500 font-mono">
                                                {module.path}
                                              </p>
                                            </div>

                                            {/* Toggle Switch */}
                                            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                              <span className="text-xs font-medium text-gray-600">
                                                {module.enabled
                                                  ? "Visible to users"
                                                  : "Hidden from users"}
                                              </span>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleModuleToggle(
                                                    company.id,
                                                    module.path,
                                                    company.sidebarModules
                                                  );
                                                }}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${module.enabled
                                                  ? "bg-blue-900"
                                                  : "bg-gray-300"
                                                  }`}
                                              >
                                                <span
                                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${module.enabled
                                                    ? "translate-x-6"
                                                    : "translate-x-1"
                                                    }`}
                                                />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          );
                        })()}

                        {/* Empty State */}
                        {(!company.sidebarModules ||
                          company.sidebarModules.length === 0) && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center hover:shadow-md transition-all">
                              <svg
                                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                                />
                              </svg>
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                No Modules Available
                              </h3>
                              <p className="text-sm text-gray-500">
                                No sidebar modules configured for this company.
                              </p>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {companies.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center hover:shadow-md transition-all">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
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
            <p className="text-gray-500 text-lg">No companies found</p>
          </div>
        )}
      </div>
    </div>
  );
}
