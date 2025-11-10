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
      createdAt
      updatedAt
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

export default function UsersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { data, loading, error, refetch } = useQuery(GET_USERS);
  const { data: currentUserData } = useQuery(GET_CURRENT_USER);
  const [deleteUser] = useMutation(DELETE_USER);

  const currentUser = currentUserData?.getCurrentUser;

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage and organize all system users</p>
        </div>
        {(currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin' || currentUser?.role === 'AdminTeam') && (
          <button
            onClick={handleCreate}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-xl flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add New User</span>
          </button>
        )}
      </div>

      <UserList
        users={data?.getUsers || []}
        currentUser={currentUser}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

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
