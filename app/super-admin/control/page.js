'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { toast } from 'react-toastify';

const GET_COMPANY_CONTROL_DATA = gql`
  query GetCompanyControlData {
    getCompanyControlData {
      company {
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
        enabledRoles
        sidebarModules {
          name
          path
          icon
          enabled
        }
      }
      users {
        id
        name
        email
        role
        status
      }
      salesPersons {
        id
        name
        email
        phone
        salesPersonId
        status
      }
      customers {
        businessName
        email
        phone
        address
        quotationCount
        lastQuotationDate
      }
    }
  }
`;

const UPDATE_COMPANY_ROLES = gql`
  mutation UpdateCompanyRoles($id: ID!, $enabledRoles: [String!]!) {
    updateCompanyRoles(id: $id, enabledRoles: $enabledRoles) {
      id
      enabledRoles
    }
  }
`;

const UPDATE_COMPANY_SIDEBAR_MODULES = gql`
  mutation UpdateCompanySidebarModules($id: ID!, $sidebarModules: [SidebarModuleInput!]!) {
    updateCompanySidebarModules(id: $id, sidebarModules: $sidebarModules) {
      id
      sidebarModules {
        name
        path
        icon
        enabled
      }
    }
  }
`;

export default function SuperAdminControlPage() {
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [activeTabs, setActiveTabs] = useState({}); // Store active tab per company: { companyId: 'overview' }

  const { data, loading, error, refetch } = useQuery(GET_COMPANY_CONTROL_DATA, {
    fetchPolicy: 'cache-and-network',
  });
  const [updateCompanyRoles] = useMutation(UPDATE_COMPANY_ROLES);
  const [updateCompanySidebarModules] = useMutation(UPDATE_COMPANY_SIDEBAR_MODULES);

  const handleToggleCompany = (companyId) => {
    setExpandedCompany(expandedCompany === companyId ? null : companyId);
    // Set default tab to 'overview' when expanding a company
    if (expandedCompany !== companyId) {
      setActiveTabs(prev => ({ ...prev, [companyId]: 'overview' }));
    }
  };

  const setActiveTab = (companyId, tab) => {
    setActiveTabs(prev => ({ ...prev, [companyId]: tab }));
  };

  const getActiveTab = (companyId) => {
    return activeTabs[companyId] || 'overview';
  };

  const handleRoleToggle = async (companyId, role, currentRoles) => {
    try {
      let newRoles;
      
      if (role === 'Admin') {
        // If disabling Admin, also disable Customer and Sales Person (hierarchy)
        const isDisabling = currentRoles.includes(role);
        if (isDisabling) {
          newRoles = currentRoles.filter(r => r !== 'Admin' && r !== 'Customer' && r !== 'Sales Person');
          toast.success('Admin role disabled. Customer and Sales Person roles have also been disabled.');
        } else {
          // Enabling Admin - just add it
          newRoles = [...currentRoles, 'Admin'];
          toast.success('Admin role enabled successfully');
        }
      } else {
        // For Customer and Sales Person, check if Admin is enabled first
        if (!currentRoles.includes('Admin')) {
          toast.error('Cannot enable this role. Admin role must be enabled first.');
          return;
        }
        
        newRoles = currentRoles.includes(role)
          ? currentRoles.filter(r => r !== role)
          : [...currentRoles, role];
        
        toast.success(`${role} role ${currentRoles.includes(role) ? 'disabled' : 'enabled'} successfully`);
      }

      const result = await updateCompanyRoles({
        variables: { id: companyId, enabledRoles: newRoles },
        refetchQueries: [
          { query: GET_COMPANY_CONTROL_DATA },
          'GetCompanies',
          'GetUsers',
        ],
        awaitRefetchQueries: true,
      });
      
      if (result?.data?.updateCompanyRoles) {
        await refetch();
      } else {
        throw new Error('Failed to update roles - no data returned');
      }
    } catch (err) {
      console.error('Error updating roles:', err);
      toast.error(err.message || 'Failed to update role');
    }
  };

  const handleModuleToggle = async (companyId, modulePath, currentModules) => {
    try {
      const updatedModules = currentModules.map(module => ({
        name: module.name,
        path: module.path,
        icon: module.icon,
        enabled: module.path === modulePath ? !module.enabled : module.enabled,
      }));

      const result = await updateCompanySidebarModules({
        variables: { id: companyId, sidebarModules: updatedModules },
        refetchQueries: [
          { query: GET_COMPANY_CONTROL_DATA },
          'GetCompanies',
          'GetUsers',
        ],
        awaitRefetchQueries: true,
      });
      
      if (result?.data?.updateCompanySidebarModules) {
        toast.success('Sidebar module updated successfully');
        await refetch();
      } else {
        throw new Error('Failed to update modules - no data returned');
      }
    } catch (err) {
      console.error('Error updating sidebar modules:', err);
      toast.error(err.message || 'Failed to update module');
    }
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
        <p className="font-semibold">Error loading control data</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  const companies = data?.getCompanyControlData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-lg p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Control Center</h1>
        <p className="text-indigo-100">Manage companies, roles, and sidebar modules</p>
        <div className="mt-4 flex items-center space-x-6">
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <p className="text-sm text-indigo-100">Total Companies</p>
            <p className="text-2xl font-bold">{companies.length}</p>
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <p className="text-sm text-indigo-100">Total Users</p>
            <p className="text-2xl font-bold">
              {companies.reduce((sum, c) => sum + (c.users?.length || 0), 0)}
            </p>
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <p className="text-sm text-indigo-100">Total Sales Persons</p>
            <p className="text-2xl font-bold">
              {companies.reduce((sum, c) => sum + (c.salesPersons?.length || 0), 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Companies List */}
      <div className="space-y-4">
        {companies.map((item) => {
          const { company, users, salesPersons, customers } = item;
          const isExpanded = expandedCompany === company.id;

          return (
            <div
              key={company.id}
              className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
            >
              {/* Company Header */}
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleToggleCompany(company.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-4 h-4 rounded-full ${
                      company.status === 'Active' ? 'bg-green-500' : 
                      company.status === 'Suspended' ? 'bg-red-500' : 'bg-gray-400'
                    }`}></div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{company.name}</h2>
                      <p className="text-sm text-gray-600">{company.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Plan</p>
                      <p className="font-semibold text-gray-900">
                        {company.plan?.name || 'N/A'} - ${company.plan?.price || 0}/{company.plan?.billingCycle || 'month'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Status</p>
                      <p className={`font-semibold ${
                        company.status === 'Active' ? 'text-green-600' : 
                        company.status === 'Suspended' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {company.status}
                      </p>
                    </div>
                    <svg
                      className={`w-6 h-6 text-gray-400 transition-transform ${
                        isExpanded ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50">
                  {/* Tabs */}
                  <div className="flex border-b border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab(company.id, 'overview');
                      }}
                      className={`px-6 py-3 font-medium transition-colors ${
                        getActiveTab(company.id) === 'overview'
                          ? 'text-indigo-600 border-b-2 border-indigo-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab(company.id, 'roles');
                      }}
                      className={`px-6 py-3 font-medium transition-colors ${
                        getActiveTab(company.id) === 'roles'
                          ? 'text-indigo-600 border-b-2 border-indigo-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Roles ({company.enabledRoles?.length || 0})
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab(company.id, 'modules');
                      }}
                      className={`px-6 py-3 font-medium transition-colors ${
                        getActiveTab(company.id) === 'modules'
                          ? 'text-indigo-600 border-b-2 border-indigo-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Sidebar Modules
                    </button>
                  </div>

                  <div className="p-6">
                    {/* Overview Tab */}
                    {getActiveTab(company.id) === 'overview' && (
                      <div className="space-y-6">
                        {/* Company Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
                            <div className="space-y-2 text-sm">
                              <p className="text-black"><span className="font-medium text-black">Industry:</span> <span className="text-black">{company.industry || 'N/A'}</span></p>
                              <p className="text-black"><span className="font-medium text-black">Phone:</span> <span className="text-black">{company.phone || 'N/A'}</span></p>
                              <p className="text-black"><span className="font-medium text-black">Website:</span> <span className="text-black">{company.website || 'N/A'}</span></p>
                              <p className="text-black"><span className="font-medium text-black">Address:</span> <span className="text-black">{company.address || 'N/A'}</span></p>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Usage</h3>
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-black">Sales Persons</span>
                                  <span className="text-black">{company.currentUsage.salesPersonCount} / {company.planLimits.salesPersonLimit}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-indigo-600 h-2 rounded-full"
                                    style={{
                                      width: `${Math.min(100, (company.currentUsage.salesPersonCount / company.planLimits.salesPersonLimit) * 100)}%`
                                    }}
                                  ></div>
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-black">Users</span>
                                  <span className="text-black">{company.currentUsage.usersCount} / {company.planLimits.usersLimit}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-purple-600 h-2 rounded-full"
                                    style={{
                                      width: `${Math.min(100, (company.currentUsage.usersCount / company.planLimits.usersLimit) * 100)}%`
                                    }}
                                  ></div>
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-black">Quotations</span>
                                  <span className="text-black">{company.currentUsage.quotationCount} / {company.planLimits.quotationLimit}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-pink-600 h-2 rounded-full"
                                    style={{
                                      width: `${Math.min(100, (company.currentUsage.quotationCount / company.planLimits.quotationLimit) * 100)}%`
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Users Section */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Users ({users.length})</h3>
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => (
                                  <tr key={user.id}>
                                    <td className="px-4 py-3 text-sm text-gray-900">{user.name}</td>
                                    <td className="px-4 py-3 text-sm text-black">{user.email}</td>
                                    <td className="px-4 py-3 text-sm">
                                      <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                                        {user.role}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      <span className={`px-2 py-1 rounded-full text-xs ${
                                        user.status === 'Active' 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {user.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {users.length === 0 && (
                                  <tr>
                                    <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                                      No users found
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Sales Persons Section */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Persons ({salesPersons.length})</h3>
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {salesPersons.map((sp) => (
                                  <tr key={sp.id}>
                                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{sp.salesPersonId}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{sp.name}</td>
                                    <td className="px-4 py-3 text-sm text-black">{sp.email}</td>
                                    <td className="px-4 py-3 text-sm text-black">{sp.phone}</td>
                                    <td className="px-4 py-3 text-sm">
                                      <span className={`px-2 py-1 rounded-full text-xs ${
                                        sp.status === 'Active' 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {sp.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {salesPersons.length === 0 && (
                                  <tr>
                                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                                      No sales persons found
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Customers Section */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customers ({customers.length})</h3>
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business Name</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quotations</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Quote</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {customers.map((customer, idx) => (
                                  <tr key={idx}>
                                    <td className="px-4 py-3 text-sm text-gray-900">{customer.businessName}</td>
                                    <td className="px-4 py-3 text-sm text-black">{customer.email || 'N/A'}</td>
                                    <td className="px-4 py-3 text-sm text-black">{customer.phone || 'N/A'}</td>
                                    <td className="px-4 py-3 text-sm">
                                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                        {customer.quotationCount}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-black">
                                      {customer.lastQuotationDate 
                                        ? new Date(customer.lastQuotationDate).toLocaleDateString()
                                        : 'N/A'}
                                    </td>
                                  </tr>
                                ))}
                                {customers.length === 0 && (
                                  <tr>
                                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                                      No customers found
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Roles Tab */}
                    {getActiveTab(company.id) === 'roles' && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Enabled Roles</h3>
                        <p className="text-sm text-gray-600 mb-6">
                          Enable or disable specific roles for this company. Disabled roles cannot be assigned to users.
                        </p>
                        <div className="space-y-3">
                          {['Admin', 'Customer', 'Sales Person'].map((role) => {
                            const isEnabled = company.enabledRoles?.includes(role) ?? true;
                            const isDisabledByHierarchy = role !== 'Admin' && !company.enabledRoles?.includes('Admin');
                            
                            return (
                              <div
                                key={role}
                                className={`flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 ${
                                  isDisabledByHierarchy ? 'opacity-50' : ''
                                }`}
                              >
                                <div>
                                  <p className="font-medium text-gray-900">{role}</p>
                                  <p className="text-sm text-gray-500">
                                    {isDisabledByHierarchy 
                                      ? 'Disabled (Admin role must be enabled first)'
                                      : isEnabled 
                                        ? 'Enabled for this company'
                                        : 'Disabled for this company'}
                                  </p>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isDisabledByHierarchy) {
                                      handleRoleToggle(company.id, role, company.enabledRoles || []);
                                    }
                                  }}
                                  disabled={isDisabledByHierarchy}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    isDisabledByHierarchy 
                                      ? 'bg-gray-200 cursor-not-allowed'
                                      : isEnabled 
                                        ? 'bg-indigo-600' 
                                        : 'bg-gray-300'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      isEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Modules Tab */}
                    {getActiveTab(company.id) === 'modules' && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Sidebar Modules</h3>
                        <p className="text-sm text-gray-600 mb-6">
                          Control which sidebar modules are visible for this company's users.
                        </p>
                        <div className="space-y-3">
                          {company.sidebarModules?.map((module) => (
                            <div
                              key={module.path}
                              className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
                            >
                              <div>
                                <p className="font-medium text-gray-900">{module.name}</p>
                                <p className="text-sm text-gray-500">{module.path}</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleModuleToggle(company.id, module.path, company.sidebarModules);
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  module.enabled ? 'bg-indigo-600' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    module.enabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {companies.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-lg">No companies found</p>
          </div>
        )}
      </div>
    </div>
  );
}
