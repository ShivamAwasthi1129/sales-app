'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';

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
      createdAt
    }
  }
`;

export default function UserList({ users, currentUser, onEdit, onDelete }) {
  const [viewingCompany, setViewingCompany] = useState(null);
  const { data: companyData, loading: companyLoading } = useQuery(GET_COMPANY, {
    variables: { id: viewingCompany },
    skip: !viewingCompany,
  });
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Super Admin':
        return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300';
      case 'Admin':
        return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300';
      case 'Sales Person':
        return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300';
      case 'Customer':
      case 'Client':
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
    }
  };

  const getStatusBadgeColor = (status) => {
    return status === 'Active'
      ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-300'
      : 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-300';
  };

  // Permission check functions
  const canEdit = (targetUser) => {
    if (!currentUser) return false;
    
    const currentUserId = currentUser.id;
    const targetUserId = targetUser.id;
    const currentUserRole = currentUser.role;
    const targetUserRole = targetUser.role;

    // Super Admin can edit itself and anyone else
    if (currentUserRole === 'Super Admin') {
      return true;
    }

    // Admin cannot edit Super Admin
    if (currentUserRole === 'Admin') {
      if (targetUserRole === 'Super Admin') {
        return false;
      }
      // Admin can edit itself and others (except Super Admin)
      return true;
    }


    return false;
  };

  const canDelete = (targetUser) => {
    if (!currentUser) return false;
    
    const currentUserId = currentUser.id;
    const targetUserId = targetUser.id;
    const currentUserRole = currentUser.role;
    const targetUserRole = targetUser.role;

    // No one can delete themselves
    if (currentUserId === targetUserId) {
      return false;
    }

    // Super Admin can delete anyone (except itself)
    if (currentUserRole === 'Super Admin') {
      return true;
    }

    // Admin cannot delete Super Admin or itself
    if (currentUserRole === 'Admin') {
      if (targetUserRole === 'Super Admin') {
        return false;
      }
      // Admin can delete others (except Super Admin)
      return true;
    }


    return false;
  };

  // Safety check for users prop
  if (!users || !Array.isArray(users)) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <svg
            className="h-8 w-8 text-gray-400"
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
        <h3 className="text-lg font-semibold text-gray-900">Loading users...</h3>
        <p className="mt-2 text-sm text-gray-500">Please wait while we fetch user data.</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <svg
            className="h-8 w-8 text-gray-400"
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
        <h3 className="text-lg font-semibold text-gray-900">No users found</h3>
        <p className="mt-2 text-sm text-gray-500">Get started by creating a new user.</p>
      </div>
    );
  }

  return (
    <div className="glass-effect rounded-2xl shadow-2xl border-2 border-white/50 overflow-hidden animate-fade-in-up">
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-6 py-5 border-b-2 border-white/40">
        <h2 className="text-xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">All Users</h2>
        <p className="text-sm text-gray-600 mt-1 font-semibold">{users.length} user{users.length !== 1 ? 's' : ''} found</p>
      </div>
      <div className="overflow-x-auto enhanced-scrollbar">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-800 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-800 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-800 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-800 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-800 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-800 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-800 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-4 text-right text-xs font-black text-gray-800 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white/80 backdrop-blur-sm divide-y divide-gray-100">
            {users.map((user) => {
              const canEditUser = canEdit(user);
              const canDeleteUser = canDelete(user);
              
              return (
                <tr key={user.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] cursor-pointer group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {['Admin', 'Customer', 'Sales Person'].includes(user.role) ? (
                      user.companyId ? (
                        <button
                          onClick={() => setViewingCompany(user.companyId)}
                          className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 transition-colors cursor-pointer"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Company
                        </button>
                      ) : (
                        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
                          No Company
                        </span>
                      )
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{user.phone || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                        user.status
                      )}`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {canEditUser ? (
                        <button
                          onClick={() => onEdit(user)}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-150"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">No permission</span>
                      )}
                      {canDeleteUser ? (
                        <button
                          onClick={() => onDelete(user.id)}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-150"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">No permission</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Company Details Modal */}
      {viewingCompany && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Company Details</h2>
                  <p className="text-sm text-indigo-100 mt-1">View company information</p>
                </div>
                <button
                  onClick={() => setViewingCompany(null)}
                  className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/20 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {companyLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
              ) : companyData?.getCompany ? (
                <div className="space-y-6">
                  {/* Company Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Name:</span>
                          <p className="text-gray-900 mt-1">{companyData.getCompany.name}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Email:</span>
                          <p className="text-gray-900 mt-1">{companyData.getCompany.email}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Phone:</span>
                          <p className="text-gray-900 mt-1">{companyData.getCompany.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Website:</span>
                          <p className="text-gray-900 mt-1">{companyData.getCompany.website || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Industry:</span>
                          <p className="text-gray-900 mt-1">{companyData.getCompany.industry || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Address:</span>
                          <p className="text-gray-900 mt-1">{companyData.getCompany.address || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Status:</span>
                          <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                            companyData.getCompany.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {companyData.getCompany.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan & Usage</h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Plan:</span>
                          <p className="text-gray-900 mt-1">
                            {companyData.getCompany.plan?.name || 'N/A'} - 
                            ${companyData.getCompany.plan?.price || 0}/{companyData.getCompany.plan?.billingCycle || 'month'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Sales Persons:</span>
                          <p className="text-gray-900 mt-1">
                            {companyData.getCompany.currentUsage.salesPersonCount} / {companyData.getCompany.planLimits.salesPersonLimit}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Users:</span>
                          <p className="text-gray-900 mt-1">
                            {companyData.getCompany.currentUsage.usersCount} / {companyData.getCompany.planLimits.usersLimit}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Quotations:</span>
                          <p className="text-gray-900 mt-1">
                            {companyData.getCompany.currentUsage.quotationCount} / {companyData.getCompany.planLimits.quotationLimit}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Created:</span>
                          <p className="text-gray-900 mt-1">
                            {new Date(companyData.getCompany.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">Company not found</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setViewingCompany(null)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
