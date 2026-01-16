// super-admin/companies/page.js

"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "graphql-tag";
import CompanyForm from "../../components/CompanyForm";
import CompanyList from "../../components/CompanyList";
import CompanyViewModal from "../../components/CompanyViewModal";
import CompanyAdminsModal from "../../components/CompanyAdminsModal";

const GET_COMPANIES = gql`
  query GetCompanies {
    getCompanies {
      id
      name
      email
      phone
      address
      website
      industry
      adminId
      adminIds
      admin {
        id
        name
        email
      }
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
      status
      logo
      description
      userCount
      createdAt
      updatedAt
    }
  }
`;

const DELETE_COMPANY = gql`
  mutation DeleteCompany($id: ID!) {
    deleteCompany(id: $id) {
      success
      message
    }
  }
`;

export default function SuperAdminCompaniesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [viewingCompany, setViewingCompany] = useState(null);
  const [viewingAdmins, setViewingAdmins] = useState(null);
  const { data, loading, error, refetch } = useQuery(GET_COMPANIES, {
    fetchPolicy: "network-only", // Always fetch fresh data
  });
  const [deleteCompany] = useMutation(DELETE_COMPANY);

  const handleCreate = () => {
    setEditingCompany(null);
    setShowForm(true);
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (
      !confirm(
        "Are you sure you want to delete this company? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteCompany({
        variables: { id },
        refetchQueries: ["GetCompanies", "GetUsers", "GetCompanyControlData"],
        awaitRefetchQueries: true,
      });
      refetch();
    } catch (err) {
      alert(err.message || "Failed to delete company");
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCompany(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCompany(null);
    refetch();
  };

  const handleView = (company) => {
    setViewingCompany(company);
  };

  const handleViewClose = () => {
    setViewingCompany(null);
  };

  const handleViewAdmins = (company) => {
    setViewingAdmins(company);
  };

  const handleAdminsClose = () => {
    setViewingAdmins(null);
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
        <p className="font-semibold">Error loading companies</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  // Calculate statistics
  const activeCompanies =
    data?.getCompanies?.filter((c) => c.status === "Active").length || 0;
  const totalUsers =
    data?.getCompanies?.reduce((sum, c) => sum + (c.userCount || 0), 0) || 0;

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
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                  Company Management
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
                    System-wide Companies
                  </p>
                </div>
              </div>
            </div>
            <p className="text-base mt-4 text-gray-700">
              Manage all organizations and their administrative details
            </p>
          </div>

          {/* Right Section - Add Button */}
          <div className="w-full sm:w-auto">
            <button
              onClick={handleCreate}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 transition-colors flex items-center space-x-2 shadow-sm hover:shadow-md"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Add New Company</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Companies */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
                Total Companies
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {data?.getCompanies?.length || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                All organizations
              </p>
            </div>
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Companies */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">
                Active Companies
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {activeCompanies}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                Currently active
              </p>
            </div>
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-purple-600 font-bold uppercase tracking-wide mb-1">
                Total Users
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {totalUsers}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                Across all companies
              </p>
            </div>
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
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
        <CompanyList
          companies={data?.getCompanies || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
          onViewAdmins={handleViewAdmins}
        />
      </div>

      {/* Company Form Modal */}
      {showForm && (
        <CompanyForm
          company={editingCompany}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Company View Modal */}
      {viewingCompany && (
        <CompanyViewModal
          isOpen={!!viewingCompany}
          onClose={handleViewClose}
          company={viewingCompany}
        />
      )}

      {/* Company Admins Modal */}
      {viewingAdmins && (
        <CompanyAdminsModal
          isOpen={!!viewingAdmins}
          onClose={handleAdminsClose}
          company={viewingAdmins}
        />
      )}
    </div>
  );
}
