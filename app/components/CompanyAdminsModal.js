'use client';

import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';

const GET_COMPANY_ADMINS = gql`
  query GetCompanyAdmins {
    getUsers {
      id
      name
      email
      phone
      status
      role
      companyId
      createdAt
    }
  }
`;

export default function CompanyAdminsModal({ isOpen, onClose, company }) {
  const { data, loading, error } = useQuery(GET_COMPANY_ADMINS, {
    skip: !isOpen || !company,
    fetchPolicy: 'network-only',
  });

  if (!isOpen) return null;

  console.log('CompanyAdminsModal - Company:', company);
  console.log('CompanyAdminsModal - Loading:', loading);
  console.log('CompanyAdminsModal - Error:', error);
  console.log('CompanyAdminsModal - Data:', data);
  console.log('CompanyAdminsModal - All Users:', data?.getUsers);

  // Filter admins for this company (compare as strings)
  const companyAdmins = data?.getUsers?.filter(
    user => user.role === 'Admin' && user.companyId && user.companyId.toString() === company.id.toString()
  ) || [];

  console.log('CompanyAdminsModal - Filtered Company Admins:', companyAdmins);

  // Get unassigned admins (no company)
  const unassignedAdmins = data?.getUsers?.filter(
    user => user.role === 'Admin' && (!user.companyId || user.companyId === null || user.companyId === '')
  ) || [];

  console.log('CompanyAdminsModal - Unassigned Admins:', unassignedAdmins);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Company Admins</h2>
              <p className="text-indigo-100 mt-1">{company.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Assigned Admins */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Assigned Admins
                  </h3>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                    {companyAdmins.length} Admin{companyAdmins.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {companyAdmins.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {companyAdmins.map((admin) => (
                      <div
                        key={admin.id}
                        className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-xl font-bold text-white">
                              {admin.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-gray-900 truncate">{admin.name}</h4>
                              <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <p className="text-sm text-gray-600 truncate">{admin.email}</p>
                            {admin.phone && (
                              <p className="text-xs text-gray-500 mt-1">{admin.phone}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                admin.status === 'Active' 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {admin.status}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(admin.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p className="text-gray-600 font-medium">No admins assigned yet</p>
                    <p className="text-sm text-gray-500 mt-1">Edit company to assign admins</p>
                  </div>
                )}
              </div>

              {/* Available Admins */}
              {unassignedAdmins.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      Available Admins (No Company)
                    </h3>
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
                      {unassignedAdmins.length} Admin{unassignedAdmins.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {unassignedAdmins.map((admin) => (
                      <div
                        key={admin.id}
                        className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center flex-shrink-0">
                            <span className="text-xl font-bold text-white">
                              {admin.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-gray-900 truncate">{admin.name}</h4>
                              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <p className="text-sm text-gray-600 truncate">{admin.email}</p>
                            {admin.phone && (
                              <p className="text-xs text-gray-500 mt-1">{admin.phone}</p>
                            )}
                            <div className="mt-2">
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                                Unassigned
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm text-blue-900 font-medium">How to assign admins to this company:</p>
                        <p className="text-sm text-blue-700 mt-1">
                          Click "Edit" on the company and select admins from the "Assign Admins" dropdown. 
                          These admins will then be linked to this company.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-8 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{companyAdmins.length}</span> of{' '}
              <span className="font-semibold">{company.planLimits?.usersLimit || 0}</span> admin slots used
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium shadow-lg hover:shadow-xl"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

