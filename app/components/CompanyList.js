'use client';

export default function CompanyList({ companies, onEdit, onDelete, onView, onViewAdmins, onViewQuotations }) {
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
    <div className="glass-effect rounded-2xl shadow-2xl border-2 border-white/50 overflow-hidden animate-fade-in-up">
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 px-6 py-5 border-b-2 border-white/40">
        <h2 className="text-xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">All Companies</h2>
        <p className="text-sm text-gray-600 mt-1 font-semibold">{companies.length} compan{companies.length !== 1 ? 'ies' : 'y'} found</p>
      </div>
      <div className="overflow-x-auto enhanced-scrollbar">
        <table className="w-full divide-y divide-gray-100">
          <thead className="bg-gradient-to-r from-gray-50 to-indigo-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-800 uppercase tracking-wider w-[200px]">
                Company Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-800 uppercase tracking-wider w-[180px]">
                Contact
              </th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-800 uppercase tracking-wider w-[180px]">
                Admin
              </th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-800 uppercase tracking-wider w-[120px]">
                Industry
              </th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-800 uppercase tracking-wider w-[200px]">
                Plan & Usage
              </th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-800 uppercase tracking-wider w-[100px]">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-800 uppercase tracking-wider w-[120px]">
                Created At
              </th>
              <th className="px-6 py-4 text-right text-xs font-black text-gray-800 uppercase tracking-wider w-[200px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white/80 backdrop-blur-sm divide-y divide-gray-100">
            {companies.map((company) => (
              <tr key={company.id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] cursor-pointer group">
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
                  {company.adminIds && company.adminIds.length > 0 ? (
                    <div className="min-w-0">
                      {company.adminIds.length === 1 && company.admin ? (
                        // Single admin - show directly
                        <>
                          <div className="text-sm font-medium text-gray-900 truncate">{company.admin.name}</div>
                          <div className="text-xs text-gray-500 truncate">{company.admin.email}</div>
                        </>
                      ) : (
                        // Multiple admins - show count with button
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewAdmins && onViewAdmins(company);
                          }}
                          className="text-left w-full hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {company.adminIds.slice(0, 3).map((_, idx) => (
                                <div
                                  key={idx}
                                  className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-white flex items-center justify-center"
                                >
                                  <span className="text-xs font-semibold text-white">
                                    {String.fromCharCode(65 + idx)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-indigo-600">
                                {company.adminIds.length} Admin{company.adminIds.length > 1 ? 's' : ''}
                              </div>
                              <div className="text-xs text-gray-500">Click to view all</div>
                            </div>
                          </div>
                        </button>
                      )}
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
                      <div className="font-semibold text-indigo-600 mb-2 truncate">{company.plan.name}</div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="truncate">👤 Admins: <span className="font-medium">{company.currentUsage?.usersCount || 0}/{company.planLimits?.usersLimit || 0}</span></div>
                        <div className="truncate">👔 Sales: <span className="font-medium">{company.currentUsage?.salesPersonCount || 0}/{company.planLimits?.salesPersonLimit || 0}</span></div>
                        <div className="truncate">📋 Quotes: <span className="font-medium">{company.currentUsage?.quotationCount || 0}/{company.planLimits?.quotationLimit || 0}</span></div>
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
                      title="View Company Details"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details
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

