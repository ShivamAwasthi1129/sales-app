// components/CompanyAdminsModal.js

"use client";

import { useQuery } from "@apollo/client/react";
import { gql } from "graphql-tag";

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
    fetchPolicy: "network-only",
  });

  if (!isOpen || !company) return null;

  // Filter admins for this company (compare as strings)
  const companyAdmins =
    data?.getUsers?.filter(
      (user) =>
        user.role === "Admin" &&
        user.companyId &&
        user.companyId.toString() === company.id.toString()
    ) || [];

  // Get unassigned admins (no company)
  const unassignedAdmins =
    data?.getUsers?.filter(
      (user) =>
        user.role === "Admin" &&
        (!user.companyId || user.companyId === null || user.companyId === "")
    ) || [];

  const getStatusBadgeColor = (status) => {
    return status === "Active"
      ? "bg-green-100 text-green-800 border-green-300"
      : "bg-gray-100 text-gray-800 border-gray-300";
  };

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal panel */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl transform transition-all w-full max-w-4xl max-h-[90vh] overflow-hidden z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white rounded-t-2xl px-6 py-5 border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-semibold text-gray-900 truncate">
                  Company Admins
                </h3>
                <p className="text-sm text-gray-500 mt-1">{company.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
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

        {/* Content */}
        <div
          className="px-6 py-5 overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 12rem)" }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              <p className="font-semibold">Error loading admins</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Assigned Admins */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Assigned Admins
                  </h3>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold border border-green-300">
                    {companyAdmins.length} Admin
                    {companyAdmins.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {companyAdmins.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {companyAdmins.map((admin) => (
                      <div
                        key={admin.id}
                        className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-lg font-semibold text-blue-600">
                              {admin.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {admin.name}
                              </h4>
                              <svg
                                className="w-5 h-5 text-green-600 shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <p className="text-sm text-gray-600 truncate">
                              {admin.email}
                            </p>
                            {admin.phone && (
                              <p className="text-xs text-gray-500 mt-1">
                                {admin.phone}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeColor(
                                  admin.status
                                )}`}
                              >
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
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
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
                    <h3 className="text-lg font-semibold text-gray-900">
                      No admins assigned yet
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Edit company to assign admins
                    </p>
                  </div>
                )}
              </div>

              {/* Available Admins */}
              {unassignedAdmins.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      Available Admins (No Company)
                    </h3>
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold border border-gray-300">
                      {unassignedAdmins.length} Admin
                      {unassignedAdmins.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {unassignedAdmins.map((admin) => (
                      <div
                        key={admin.id}
                        className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <span className="text-lg font-semibold text-gray-600">
                              {admin.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {admin.name}
                              </h4>
                              <svg
                                className="w-5 h-5 text-gray-400 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </div>
                            <p className="text-sm text-gray-600 truncate">
                              {admin.email}
                            </p>
                            {admin.phone && (
                              <p className="text-xs text-gray-500 mt-1">
                                {admin.phone}
                              </p>
                            )}
                            <div className="mt-2">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full border bg-yellow-100 text-yellow-800 border-yellow-300">
                                Unassigned
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-blue-600 shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm text-blue-900 font-medium">
                          How to assign admins to this company:
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          Click "Edit" on the company and select admins from the
                          "Assign Admins" dropdown. These admins will then be
                          linked to this company.
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
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-semibold">{companyAdmins.length}</span> of{" "}
            <span className="font-semibold">
              {company.planLimits?.usersLimit || 0}
            </span>{" "}
            admin slots used
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
