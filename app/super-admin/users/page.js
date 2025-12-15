'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import UserForm from '../../components/UserForm';
import UserList from '../../components/UserList';

const GET_USERS = gql`
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
      salesPersonId
      dateOfBirth
      photo
      about
      createdByAdminId
      createdAt
      updatedAt
    }
  }
`;

const GET_COMPANIES = gql`
  query GetCompanies {
    getCompanies {
      id
      name
      status
    }
  }
`;

const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    getCurrentUser {
      id
      role
    }
  }
`;

const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id) {
      success
      message
    }
  }
`;

export default function SuperAdminUsersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filterRole, setFilterRole] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  
  const { data, loading, error, refetch } = useQuery(GET_USERS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: currentUserData } = useQuery(GET_CURRENT_USER);
  const { data: companiesData } = useQuery(GET_COMPANIES, {
    fetchPolicy: 'cache-and-network',
  });
  const [deleteUser] = useMutation(DELETE_USER);

  const currentUser = currentUserData?.getCurrentUser;
  const companies = companiesData?.getCompanies || [];
  
  // Available roles
  const roles = ['Super Admin', 'Admin', 'Sales Person', 'Customer'];
  
  // Filter users based on selected filters
  const filteredUsers = (data?.getUsers || []).filter(user => {
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesCompany = filterCompany === 'all' || user.companyId === filterCompany;
    return matchesRole && matchesCompany;
  });

  const handleCreate = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await deleteUser({
        variables: { id },
        refetchQueries: [
          'GetUsers',
          'GetCompanies',
          'GetCompanyControlData',
        ],
        awaitRefetchQueries: true,
      });
      refetch();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingUser(null);
    refetch();
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
        <p className="font-semibold">Error loading users</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-8 border border-gray-200 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">User Management</h1>
            <p className="text-gray-700 text-lg font-medium">Manage all system users across roles and permissions</p>
          </div>
          <div className="hidden md:block">
            <div className="bg-gradient-to-br from-indigo-500 to-pink-600 rounded-2xl p-4 shadow-lg">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar with Filters */}
      <div className="space-y-4">
        {/* Stats and Action Button */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-br from-white to-indigo-50 px-6 py-3 rounded-2xl shadow-md border border-indigo-100 hover:shadow-lg transition-all">
              <p className="text-sm text-gray-600 font-semibold">Total Users</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{data?.getUsers?.length || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-white to-green-50 px-6 py-3 rounded-2xl shadow-md border border-green-100 hover:shadow-lg transition-all">
              <p className="text-sm text-gray-500">Filtered</p>
              <p className="text-2xl font-bold text-indigo-600">{filteredUsers.length}</p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-xl flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add New User</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>

            {/* Role Filter */}
            <div className="flex-1 max-w-xs">
              <label className="text-xs font-medium text-gray-600 block mb-1">Role</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="all">All Roles</option>
                {roles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            {/* Company Filter */}
            <div className="flex-1 max-w-xs">
              <label className="text-xs font-medium text-gray-600 block mb-1">Company</label>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="all">All Companies</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(filterRole !== 'all' || filterCompany !== 'all') && (
              <button
                onClick={() => {
                  setFilterRole('all');
                  setFilterCompany('all');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <UserList
        users={filteredUsers}
        currentUser={currentUser}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* User Form Modal */}
      {showForm && (
        <UserForm
          user={editingUser}
          currentUser={currentUser}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

