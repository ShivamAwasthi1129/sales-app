// components/ViewSalesPersonModal.js

"use client";

import { useEffect } from "react";

export default function ViewSalesPersonModal({ isOpen, onClose, salesPerson }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !salesPerson) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Sales Person Details
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  View complete information
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-colors"
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
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {/* Profile Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all mb-6">
            <div className="flex items-start space-x-6">
              {/* Photo */}
              <div className="shrink-0">
                {salesPerson.photo ? (
                  <img
                    src={salesPerson.photo}
                    alt={salesPerson.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-sm"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-indigo-100 flex items-center justify-center border-4 border-gray-200 shadow-sm">
                    <span className="text-indigo-600 text-5xl font-semibold">
                      {salesPerson.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  {salesPerson.name}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      Sales Person ID:
                    </span>
                    <span className="font-mono text-sm text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      {salesPerson.salesPersonId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      Role:
                    </span>
                    <span className="text-sm text-gray-900">
                      {salesPerson.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      Status:
                    </span>
                    <span
                      className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${salesPerson.status === "Active"
                        ? "bg-green-100 text-green-800 border-green-300"
                        : "bg-red-100 text-red-800 border-red-300"
                        }`}
                    >
                      {salesPerson.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-blue-900 mb-4">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Date of Birth
                </label>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDate(salesPerson.dateOfBirth)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Phone Number
                </label>
                <p className="text-lg font-semibold text-gray-900">
                  {salesPerson.phone || "N/A"}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Email
                </label>
                <p className="text-lg font-semibold text-gray-900">
                  {salesPerson.email}
                </p>
              </div>
              {salesPerson.address && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Address
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {salesPerson.address}
                  </p>
                </div>
              )}
              {salesPerson.about && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    About
                  </label>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {salesPerson.about}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
