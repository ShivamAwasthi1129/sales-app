'use client';

import { useState } from 'react';
import ViewSalesPersonModal from './ViewSalesPersonModal';
import SalesPersonQuotationsModal from './SalesPersonQuotationsModal';

export default function SalesPersonList({ salesPersons, onEdit, onDelete, onPasswordRequestResponse }) {
  const [viewingSalesPerson, setViewingSalesPerson] = useState(null);
  const [viewingQuotations, setViewingQuotations] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showPasswordRequestModal, setShowPasswordRequestModal] = useState(null);

  const getStatusBadgeColor = (status) => {
    return status === 'Active'
      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
      : 'bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-md';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter and search logic
  const filteredSalesPersons = salesPersons.filter(sp => {
    const matchesSearch = sp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sp.salesPersonId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || sp.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (salesPersons.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-4">
          <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Sales Persons Yet</h3>
        <p className="text-gray-500 mb-6">Start building your sales team by adding your first sales person</p>
        <div className="inline-flex items-center text-sm text-indigo-600 font-medium">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Click "Add Sales Person" button above to get started
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Status Filter */}
        <div className="flex space-x-2 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filterStatus === 'all'
                ? 'bg-white text-indigo-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({salesPersons.length})
          </button>
          <button
            onClick={() => setFilterStatus('Active')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filterStatus === 'Active'
                ? 'bg-white text-green-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Active ({salesPersons.filter(sp => sp.status === 'Active').length})
          </button>
          <button
            onClick={() => setFilterStatus('Inactive')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filterStatus === 'Inactive'
                ? 'bg-white text-orange-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Inactive ({salesPersons.filter(sp => sp.status === 'Inactive').length})
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredSalesPersons.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSalesPersons.map((salesPerson) => (
            <div
              key={salesPerson.id}
              className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-gray-100 hover:border-indigo-200 transform hover:-translate-y-2"
            >
              {/* Card Header with Gradient */}
              <div className="h-24 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 relative">
                <div className="absolute inset-0 bg-black/10"></div>
                
                {/* Password Change Request Bell Icon */}
                {salesPerson.passwordChangeRequest?.status === 'pending' && (
                  <div className="absolute top-3 left-3">
                    <button
                      onClick={() => setShowPasswordRequestModal(salesPerson)}
                      className="relative bg-red-500 hover:bg-red-600 p-2 rounded-full shadow-lg transition-all transform hover:scale-110"
                      title="Password change request pending"
                    >
                      <svg className="w-5 h-5 text-white animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                      </svg>
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                      </span>
                    </button>
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeColor(salesPerson.status)}`}>
                    {salesPerson.status === 'Active' ? '✓ Active' : '○ Inactive'}
                  </span>
                </div>
              </div>

              {/* Avatar */}
              <div className="relative -mt-12 flex justify-center">
                {salesPerson.photo ? (
                  <img
                    src={salesPerson.photo}
                    alt={salesPerson.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl ring-4 ring-indigo-100"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-4 border-white shadow-xl ring-4 ring-indigo-100">
                    <span className="text-white text-3xl font-bold">
                      {salesPerson.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="px-6 pb-6 pt-4 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-1 truncate">{salesPerson.name}</h3>
                <p className="text-sm text-indigo-600 font-semibold mb-3 font-mono">{salesPerson.salesPersonId}</p>

                {/* Info Grid */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate">{salesPerson.email}</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{salesPerson.phone || 'No phone'}</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>DOB: {formatDate(salesPerson.dateOfBirth)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2">
                  {/* Quotations Button - Primary */}
                  <button
                    onClick={() => setViewingQuotations(salesPerson)}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all duration-300 shadow-md hover:shadow-xl transform hover:scale-105"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>View Quotations</span>
                  </button>

                  {/* Secondary Actions */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setViewingSalesPerson(salesPerson)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold py-2 px-3 rounded-lg transition-all text-sm"
                      title="View Details"
                    >
                      <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onEdit(salesPerson)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold py-2 px-3 rounded-lg transition-all text-sm"
                      title="Edit"
                    >
                      <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(salesPerson.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-2 px-3 rounded-lg transition-all text-sm"
                      title="Delete"
                    >
                      <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Hover Effect Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-300 pointer-events-none rounded-2xl"></div>
            </div>
          ))}
        </div>
      )}

      <ViewSalesPersonModal
        isOpen={!!viewingSalesPerson}
        onClose={() => setViewingSalesPerson(null)}
        salesPerson={viewingSalesPerson}
      />
      <SalesPersonQuotationsModal
        isOpen={!!viewingQuotations}
        onClose={() => setViewingQuotations(null)}
        salesPerson={viewingQuotations}
      />

      {/* Password Change Request Modal */}
      {showPasswordRequestModal && (
        <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Password Change Request</h3>
              <button
                onClick={() => setShowPasswordRequestModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-lg font-bold">
                    {showPasswordRequestModal.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{showPasswordRequestModal.name}</p>
                  <p className="text-sm text-gray-600">{showPasswordRequestModal.email}</p>
                  <p className="text-xs text-indigo-600 font-mono">{showPasswordRequestModal.salesPersonId}</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-yellow-900 mb-1">Password Change Request</p>
                    <p className="text-xs text-yellow-800">
                      Requested on: {new Date(showPasswordRequestModal.passwordChangeRequest.requestedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (onPasswordRequestResponse) {
                    onPasswordRequestResponse(showPasswordRequestModal.id, 'approve');
                  }
                  setShowPasswordRequestModal(null);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Approve
              </button>
              <button
                onClick={() => {
                  if (onPasswordRequestResponse) {
                    onPasswordRequestResponse(showPasswordRequestModal.id, 'reject');
                  }
                  setShowPasswordRequestModal(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

