'use client';

import { useState } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { toast } from 'react-toastify';

const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    getCurrentUser {
      id
      name
      email
      role
      phone
      address
      companyId
    }
  }
`;

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
      logo
      description
      planId
      plan {
        id
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
      createdAt
      updatedAt
    }
  }
`;

const GET_COMPANY_ADMINS = gql`
  query GetUsers {
    getUsers {
      id
      name
      email
      role
      phone
      address
      status
      companyId
      createdAt
    }
  }
`;

const GET_SALES_PERSONS = gql`
  query GetSalesPersons {
    getSalesPersons {
      id
      name
      email
      salesPersonId
      phone
      address
      companyName
      companyId
      status
      createdByAdminId
      dateOfBirth
      role
      createdAt
    }
  }
`;

const GET_SALES_PERSON = gql`
  query GetSalesPerson($id: ID!) {
    getSalesPerson(id: $id) {
      id
      name
      email
      salesPersonId
      phone
      address
      companyName
      status
      dateOfBirth
      role
      about
    }
  }
`;

const UPDATE_SALES_PERSON_STATUS = gql`
  mutation UpdateSalesPerson($id: ID!, $input: SalesPersonInput!) {
    updateSalesPerson(id: $id, input: $input) {
      id
      name
      email
      salesPersonId
      status
    }
  }
`;

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const { data: currentUserData, loading: userLoading } = useQuery(GET_CURRENT_USER);
  const { data: companyData, loading: companyLoading, error: companyError, refetch: refetchCompany } = useQuery(GET_COMPANY, {
    variables: { id: currentUserData?.getCurrentUser?.companyId },
    skip: !currentUserData?.getCurrentUser?.companyId,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });
  const { data: adminsData, loading: adminsLoading, refetch: refetchAdmins } = useQuery(GET_COMPANY_ADMINS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: salesPersonsData, loading: salesPersonsLoading, refetch: refetchSalesPersons } = useQuery(GET_SALES_PERSONS, {
    fetchPolicy: 'cache-and-network',
  });
  const [updateSalesPersonStatus] = useMutation(UPDATE_SALES_PERSON_STATUS);
  const [getSalesPerson, { data: salesPersonDetailData }] = useLazyQuery(GET_SALES_PERSON);

  const currentUser = currentUserData?.getCurrentUser;
  const company = companyData?.getCompany;
  const companyId = currentUser?.companyId;

  // Filter admins for this company
  const companyAdmins = adminsData?.getUsers?.filter(user => 
    user.role === 'Admin' && user.companyId === companyId
  ) || [];

  // Filter sales persons by company - show all sales persons of the company
  // The resolver already filters by companyId, but we add an extra check here for safety
  const companySalesPersons = salesPersonsData?.getSalesPersons?.filter(sp => {
    // Match by companyId (preferred) or companyName (fallback)
    const matchesCompanyId = sp.companyId && companyId && sp.companyId.toString() === companyId.toString();
    const matchesCompanyName = company?.name && sp.companyName && sp.companyName === company.name;
    return matchesCompanyId || matchesCompanyName;
  }) || [];

  const handleToggleSalesPersonStatus = async (salesPerson, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    
    if (!confirm(`Are you sure you want to ${newStatus.toLowerCase()} ${salesPerson.name}?`)) {
      return;
    }
    
    try {
      // Fetch full sales person data first
      const { data } = await getSalesPerson({ variables: { id: salesPerson.id } });
      const fullSalesPerson = data?.getSalesPerson;
      
      if (!fullSalesPerson) {
        toast.error('Sales person not found');
        return;
      }
      
      // Format dateOfBirth for the mutation
      const dateOfBirth = fullSalesPerson.dateOfBirth 
        ? (typeof fullSalesPerson.dateOfBirth === 'string' 
            ? fullSalesPerson.dateOfBirth 
            : new Date(fullSalesPerson.dateOfBirth).toISOString().split('T')[0])
        : new Date().toISOString().split('T')[0];
      
      await updateSalesPersonStatus({
        variables: {
          id: salesPerson.id,
          input: {
            name: fullSalesPerson.name,
            dateOfBirth: dateOfBirth,
            phone: fullSalesPerson.phone || '',
            email: fullSalesPerson.email,
            role: fullSalesPerson.role || 'Sales Team Member',
            companyName: fullSalesPerson.companyName,
            address: fullSalesPerson.address || '',
            about: fullSalesPerson.about || '',
            status: newStatus,
          },
        },
      });
      toast.success(`Sales person ${salesPerson.name} ${newStatus.toLowerCase()} successfully`);
      refetchSalesPersons();
    } catch (error) {
      toast.error(error.message || 'Failed to update sales person status');
    }
  };

  if (userLoading || companyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!currentUser?.companyId) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        <p className="font-semibold">Company not found</p>
        <p className="text-sm mt-1">You are not associated with any company. Please contact Super Admin.</p>
      </div>
    );
  }

  if (companyError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        <p className="font-semibold">Error loading company</p>
        <p className="text-sm mt-1">{companyError.message}</p>
        {currentUser?.companyId && (
          <p className="text-xs mt-2 text-red-600">Company ID: {currentUser.companyId}</p>
        )}
      </div>
    );
  }

  if (!company && !companyLoading) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl">
        <p className="font-semibold">Company information not available</p>
        <p className="text-sm mt-1">Unable to fetch company details. Please try refreshing the page.</p>
        {currentUser?.companyId && (
          <p className="text-xs mt-2 text-yellow-600">Company ID: {currentUser.companyId}</p>
        )}
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Global Settings</h1>
            <p className="text-indigo-100 text-lg">Manage your company settings and team</p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/20 backdrop-blur-lg rounded-xl p-4">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 px-6" aria-label="Tabs">
            {[
              { id: 'company', name: 'Company Information', icon: '🏢' },
              { id: 'admins', name: 'Company Admins', icon: '👥' },
              { id: 'salesPersons', name: 'Sales Person Management', icon: '👤' },
              { id: 'usage', name: 'Usage & Limits', icon: '📊' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Company Information Tab */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Company Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Company Name</label>
                    <p className="text-lg font-semibold text-gray-900">{company.name}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                    <p className="text-lg font-semibold text-gray-900">{company.email}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                    <p className="text-lg font-semibold text-gray-900">{company.phone || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Website</label>
                    <p className="text-lg font-semibold text-gray-900">{company.website || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Industry</label>
                    <p className="text-lg font-semibold text-gray-900">{company.industry || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                      company.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {company.status}
                    </span>
                  </div>
                  <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                    <p className="text-lg font-semibold text-gray-900">{company.address || 'N/A'}</p>
                  </div>
                  {company.description && (
                    <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                      <p className="text-gray-900">{company.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Plan Information */}
              {company.plan && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Subscription Plan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <label className="block text-sm font-medium text-blue-600 mb-1">Plan Name</label>
                      <p className="text-lg font-semibold text-blue-900">{company.plan.name}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <label className="block text-sm font-medium text-blue-600 mb-1">Price</label>
                      <p className="text-lg font-semibold text-blue-900">${company.plan.price || '0'}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <label className="block text-sm font-medium text-blue-600 mb-1">Billing Cycle</label>
                      <p className="text-lg font-semibold text-blue-900">{company.plan.billingCycle || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Company Admins Tab */}
          {activeTab === 'admins' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Company Administrators</h2>
                <div className="text-sm text-gray-500">
                  Total: <span className="font-semibold text-gray-900">{companyAdmins.length}</span>
                </div>
              </div>
              
              {adminsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : companyAdmins.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No administrators found for this company.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {companyAdmins.map((admin) => (
                    <div key={admin.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-indigo-600 font-semibold">
                                {admin.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{admin.name}</h4>
                              <p className="text-xs text-gray-500">{admin.role}</p>
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-600">
                              <span className="font-medium">Email:</span> {admin.email}
                            </p>
                            {admin.phone && (
                              <p className="text-gray-600">
                                <span className="font-medium">Phone:</span> {admin.phone}
                              </p>
                            )}
                            <p className="text-gray-600">
                              <span className="font-medium">Status:</span>{' '}
                              <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                admin.status === 'Active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {admin.status}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sales Person Management Tab */}
          {activeTab === 'salesPersons' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Company Sales Persons</h2>
                <div className="text-sm text-gray-500">
                  Total: <span className="font-semibold text-gray-900">{companySalesPersons.length}</span>
                  {' | '}
                  Active: <span className="font-semibold text-green-600">
                    {companySalesPersons.filter(sp => sp.status === 'Active').length}
                  </span>
                  {' | '}
                  Inactive: <span className="font-semibold text-red-600">
                    {companySalesPersons.filter(sp => sp.status === 'Inactive').length}
                  </span>
                </div>
              </div>

              {salesPersonsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : companySalesPersons.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No sales persons found for this company. Create sales persons from Sales Person Management.</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sales Person
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Phone
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {companySalesPersons.map((sp) => (
                          <tr key={sp.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-purple-600 font-semibold">
                                    {sp.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{sp.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 font-mono">{sp.salesPersonId}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{sp.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{sp.phone || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                sp.status === 'Active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {sp.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(sp.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleToggleSalesPersonStatus(sp, sp.status)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                  sp.status === 'Active'
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {sp.status === 'Active' ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Usage & Limits Tab */}
          {activeTab === 'usage' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Usage & Limits</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Sales Persons */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-blue-900">Sales Persons</h3>
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">Used</span>
                      <span className="text-lg font-bold text-blue-900">
                        {company.currentUsage?.salesPersonCount || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">Limit</span>
                      <span className="text-lg font-bold text-blue-900">
                        {company.planLimits?.salesPersonLimit || 0}
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2.5 mt-2">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            ((company.currentUsage?.salesPersonCount || 0) / (company.planLimits?.salesPersonLimit || 1)) * 100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Quotations */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-green-900">Quotations</h3>
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Used</span>
                      <span className="text-lg font-bold text-green-900">
                        {company.currentUsage?.quotationCount || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Limit</span>
                      <span className="text-lg font-bold text-green-900">
                        {company.planLimits?.quotationLimit || 0}
                      </span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2.5 mt-2">
                      <div
                        className="bg-green-600 h-2.5 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            ((company.currentUsage?.quotationCount || 0) / (company.planLimits?.quotationLimit || 1)) * 100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Users */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-purple-900">Users</h3>
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-purple-700">Used</span>
                      <span className="text-lg font-bold text-purple-900">
                        {company.currentUsage?.usersCount || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-purple-700">Limit</span>
                      <span className="text-lg font-bold text-purple-900">
                        {company.planLimits?.usersLimit || 0}
                      </span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2.5 mt-2">
                      <div
                        className="bg-purple-600 h-2.5 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            ((company.currentUsage?.usersCount || 0) / (company.planLimits?.usersLimit || 1)) * 100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enabled Roles */}
              {company.enabledRoles && company.enabledRoles.length > 0 && (
                <div className="mt-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Enabled Roles</h3>
                  <div className="flex flex-wrap gap-2">
                    {company.enabledRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex px-3 py-1 text-sm font-medium bg-indigo-100 text-indigo-800 rounded-full"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
