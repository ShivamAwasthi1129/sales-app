'use client';

export default function UserList({ users, currentUser, onEdit, onDelete }) {
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Super Admin':
        return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300';
      case 'Admin':
        return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300';
      case 'AdminTeam':
        return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300';
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

    // AdminTeam cannot edit Super Admin or Admin
    if (currentUserRole === 'AdminTeam') {
      if (targetUserRole === 'Super Admin' || targetUserRole === 'Admin') {
        return false;
      }
      // AdminTeam can edit itself and others (except Super Admin and Admin)
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

    // AdminTeam cannot delete Super Admin, Admin, or itself
    if (currentUserRole === 'AdminTeam') {
      if (targetUserRole === 'Super Admin' || targetUserRole === 'Admin') {
        return false;
      }
      // AdminTeam can delete others (except Super Admin and Admin)
      return true;
    }

    return false;
  };

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
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">All Users</h2>
        <p className="text-sm text-gray-600 mt-1">{users.length} user{users.length !== 1 ? 's' : ''} found</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const canEditUser = canEdit(user);
              const canDeleteUser = canDelete(user);
              
              return (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-150">
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
    </div>
  );
}
