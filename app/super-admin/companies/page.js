'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import CompanyForm from '../../components/CompanyForm';
import CompanyList from '../../components/CompanyList';
import CompanyViewModal from '../../components/CompanyViewModal';
import CompanyAdminsModal from '../../components/CompanyAdminsModal';

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
    fetchPolicy: 'network-only', // Always fetch fresh data
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
    if (!confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteCompany({
        variables: { id },
        refetchQueries: [
          'GetCompanies',
          'GetUsers',
          'GetCompanyControlData',
        ],
        awaitRefetchQueries: true,
      });
      refetch();
    } catch (err) {
      alert(err.message || 'Failed to delete company');
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
  const activeCompanies = data?.getCompanies?.filter(c => c.status === 'Active').length || 0;
  const totalUsers = data?.getCompanies?.reduce((sum, c) => sum + (c.userCount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Company Management</h1>
            <p className="text-blue-100 text-lg">Manage all organizations and their administrative details</p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/20 backdrop-blur-lg rounded-xl p-4">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Total Companies</p>
          <p className="text-3xl font-bold text-gray-900">{data?.getCompanies?.length || 0}</p>
        </div>
        <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Active Companies</p>
          <p className="text-3xl font-bold text-green-600">{activeCompanies}</p>
        </div>
        <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Total Users</p>
          <p className="text-3xl font-bold text-indigo-600">{totalUsers}</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-end">
        <button
          onClick={handleCreate}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-xl flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add New Company</span>
        </button>
      </div>

      {/* Companies Table */}
      <CompanyList
        companies={data?.getCompanies || []}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        onViewAdmins={handleViewAdmins}
      />

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

