'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { toast } from 'react-toastify';
import SalesPersonForm from '../../components/SalesPersonForm';
import SalesPersonList from '../../components/SalesPersonList';

const GET_SALES_PERSONS = gql`
  query GetSalesPersons {
    getSalesPersons {
      id
      name
      dateOfBirth
      phone
      email
      salesPersonId
      role
      about
      address
      photo
      status
      createdByAdminId
      companyId
      passwordChangeRequest {
        status
        requestedAt
        canChangePassword
      }
      createdAt
      updatedAt
    }
  }
`;

const RESPOND_TO_PASSWORD_REQUEST = gql`
  mutation RespondToPasswordChangeRequest($userId: ID!, $action: String!) {
    respondToPasswordChangeRequest(userId: $userId, action: $action) {
      success
      message
      user {
        id
        passwordChangeRequest {
          status
          respondedAt
        }
      }
    }
  }
`;

const DELETE_SALES_PERSON = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id) {
      success
      message
    }
  }
`;

export default function AdminSalesPersonManagementPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingSalesPerson, setEditingSalesPerson] = useState(null);
  const { data, loading, error, refetch } = useQuery(GET_SALES_PERSONS, {
    fetchPolicy: 'network-only',
  });
  const [deleteSalesPerson] = useMutation(DELETE_SALES_PERSON);
  const [respondToRequest] = useMutation(RESPOND_TO_PASSWORD_REQUEST);

  const handleAddNew = () => {
    setEditingSalesPerson(null);
    setShowForm(true);
  };

  const handleEdit = (salesPerson) => {
    setEditingSalesPerson(salesPerson);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this sales person?')) {
      return;
    }

    try {
      await deleteSalesPerson({
        variables: { id },
        refetchQueries: ['GetSalesPersons'],
        awaitRefetchQueries: true,
      });
      refetch();
    } catch (err) {
      alert(err.message || 'Failed to delete sales person');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingSalesPerson(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingSalesPerson(null);
    refetch();
  };

  const handlePasswordRequestResponse = async (userId, action) => {
    try {
      const { data } = await respondToRequest({
        variables: { userId, action },
      });

      if (data.respondToPasswordChangeRequest.success) {
        toast.success(data.respondToPasswordChangeRequest.message);
        refetch();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to process request');
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
        <p className="font-semibold">Error loading sales persons</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  const activeCount = data?.getSalesPersons?.filter(sp => sp.status === 'Active').length || 0;
  const inactiveCount = data?.getSalesPersons?.filter(sp => sp.status !== 'Active').length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 -m-8 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 shadow-2xl">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-xl animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-xl animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-xl animate-blob animation-delay-4000"></div>
          </div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-black text-white tracking-tight">Sales Management</h1>
                  <p className="text-blue-100 text-lg font-medium mt-1">Manage and track your sales team performance</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleAddNew}
              className="group relative bg-white hover:bg-gray-50 text-indigo-600 font-bold py-4 px-8 rounded-2xl flex items-center space-x-3 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
              <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-lg">Add Sales Person</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Card */}
          <div className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-indigo-200 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Team Members</p>
                <p className="text-5xl font-black text-gray-900 mb-1">{data?.getSalesPersons?.length || 0}</p>
                <p className="text-xs text-gray-400 font-medium">Complete sales team</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Active Card */}
          <div className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-green-200 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Active Members</p>
                <p className="text-5xl font-black text-green-600 mb-1">{activeCount}</p>
                <p className="text-xs text-gray-400 font-medium">Currently working</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Inactive Card */}
          <div className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-orange-200 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Inactive Members</p>
                <p className="text-5xl font-black text-orange-600 mb-1">{inactiveCount}</p>
                <p className="text-xs text-gray-400 font-medium">Not active</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-4 shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Persons List */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-8 py-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
            <p className="text-sm text-gray-500 mt-1">View and manage all sales personnel</p>
          </div>
          <div className="p-6">
            <SalesPersonList
              salesPersons={data?.getSalesPersons || []}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPasswordRequestResponse={handlePasswordRequestResponse}
            />
          </div>
        </div>

        {/* Sales Person Form Modal */}
        {showForm && (
          <SalesPersonForm
            salesPerson={editingSalesPerson}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 50px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

