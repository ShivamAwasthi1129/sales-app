'use client';

import { useState } from 'react';
import ViewSalesPersonModal from './ViewSalesPersonModal';

export default function SalesPersonList({ salesPersons, onEdit, onDelete }) {
  const [viewingSalesPerson, setViewingSalesPerson] = useState(null);
  const getStatusBadgeColor = (status) => {
    return status === 'Active'
      ? 'bg-green-100 text-green-800 border border-green-300'
      : 'bg-red-100 text-red-800 border border-red-300';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (salesPersons.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <p className="text-gray-500">No sales persons found. Click "Add Sales Person" to create one.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                Photo
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
                Name
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                ID
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[18%]">
                Email
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[13%]">
                Phone
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
                Company
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                Status
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[17%]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {salesPersons.map((salesPerson) => (
              <tr key={salesPerson.id} className="hover:bg-gray-50">
                <td className="px-3 py-4">
                  {salesPerson.photo ? (
                    <img
                      src={salesPerson.photo}
                      alt={salesPerson.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-sm font-medium">
                        {salesPerson.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-3 py-4">
                  <div className="text-sm font-medium text-gray-900 truncate">{salesPerson.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    DOB: {formatDate(salesPerson.dateOfBirth)}
                  </div>
                </td>
                <td className="px-3 py-4">
                  <div className="text-sm text-gray-900 font-mono truncate">{salesPerson.salesPersonId}</div>
                </td>
                <td className="px-3 py-4">
                  <div className="text-sm text-gray-900 truncate">{salesPerson.email}</div>
                </td>
                <td className="px-3 py-4">
                  <div className="text-sm text-gray-900 truncate">{salesPerson.phone || 'N/A'}</div>
                </td>
                <td className="px-3 py-4">
                  <div className="text-sm text-gray-900 truncate">{salesPerson.companyName}</div>
                </td>
                <td className="px-3 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(salesPerson.status)}`}>
                    {salesPerson.status}
                  </span>
                </td>
                <td className="px-3 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2 flex-wrap">
                    <button
                      onClick={() => setViewingSalesPerson(salesPerson)}
                      className="text-blue-600 hover:text-blue-900 whitespace-nowrap"
                      title="View"
                    >
                      View
                    </button>
                    <button
                      onClick={() => onEdit(salesPerson)}
                      className="text-indigo-600 hover:text-indigo-900 whitespace-nowrap"
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(salesPerson.id)}
                      className="text-red-600 hover:text-red-900 whitespace-nowrap"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ViewSalesPersonModal
        isOpen={!!viewingSalesPerson}
        onClose={() => setViewingSalesPerson(null)}
        salesPerson={viewingSalesPerson}
      />
    </>
  );
}

