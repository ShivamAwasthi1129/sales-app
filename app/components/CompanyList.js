'use client';

export default function CompanyList({ companies, onEdit, onDelete, onView }) {
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-300';
      case 'Inactive':
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
      case 'Suspended':
        return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-300';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
    }
  };

  if (companies.length === 0) {
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">No companies found</h3>
        <p className="mt-2 text-sm text-gray-500">Get started by creating a new company.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">All Companies</h2>
        <p className="text-sm text-gray-600 mt-1">{companies.length} compan{companies.length !== 1 ? 'ies' : 'y'} found</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[200px]">
                Company Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[180px]">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[180px]">
                Admin
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[120px]">
                Industry
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[200px]">
                Plan & Usage
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[100px]">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[120px]">
                Created At
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-[200px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {companies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-4 py-4">
                  <div className="flex items-center min-w-0">
                    <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-indigo-600">
                        {company.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3 min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 truncate">{company.name}</div>
                      {company.website && (
                        <div className="text-xs text-gray-500 truncate">{company.website}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900 truncate">{company.email}</div>
                  <div className="text-xs text-gray-500 truncate">{company.phone || 'N/A'}</div>
                </td>
                <td className="px-4 py-4">
                  {company.admin ? (
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{company.admin.name}</div>
                      <div className="text-xs text-gray-500 truncate">{company.admin.email}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No admin assigned</div>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-600 truncate">{company.industry || 'N/A'}</div>
                </td>
                <td className="px-4 py-4">
                  {company.plan ? (
                    <div className="text-sm">
                      <div className="font-semibold text-indigo-600 mb-1 truncate">{company.plan.name}</div>
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <div className="truncate">Users: <span className="font-medium">{company.currentUsage?.usersCount || 0}/{company.planLimits?.usersLimit || 0}</span></div>
                        <div className="truncate">Sales: <span className="font-medium">{company.currentUsage?.salesPersonCount || 0}/{company.planLimits?.salesPersonLimit || 0}</span></div>
                        <div className="truncate">Quotes: <span className="font-medium">{company.currentUsage?.quotationCount || 0}/{company.planLimits?.quotationLimit || 0}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No plan assigned</div>
                  )}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                      company.status
                    )}`}
                  >
                    {company.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-600">
                    {new Date(company.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </td>
                <td className="px-4 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-1 flex-wrap gap-1">
                    <button
                      onClick={() => onView(company)}
                      className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors duration-150"
                      title="View Products"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                    <button
                      onClick={() => onEdit(company)}
                      className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-150"
                      title="Edit Company"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(company.id)}
                      className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-150"
                      title="Delete Company"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

