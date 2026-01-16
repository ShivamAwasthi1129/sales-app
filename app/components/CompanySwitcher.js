// components/CompanySwitcher.js - not changed yet 

'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import { setAuthToken } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';

const GET_USER_COMPANIES = gql`
  query GetUserCompanies {
    getUserCompanies {
      companyId
      companyName
      role
      status
      salesPersonId
      isActive
    }
  }
`;

const SWITCH_COMPANY = gql`
  mutation SwitchCompany($companyId: ID!) {
    switchCompany(companyId: $companyId) {
      success
      message
      token
      user {
        id
        name
        email
        role
        activeCompanyId
      }
      activeCompany {
        id
        name
      }
    }
  }
`;

export default function CompanySwitcher() {
  const { user, login } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Fetch user's companies
  const { data, loading, refetch } = useQuery(GET_USER_COMPANIES, {
    skip: !user,
    fetchPolicy: 'network-only'
  });

  const [switchCompany] = useMutation(SWITCH_COMPANY);

  const companies = data?.getUserCompanies || [];
  const activeCompany = companies.find(c => c.isActive);

  // Don't show switcher if user has only one company or is Super Admin
  if (!user || user.role === 'Super Admin' || companies.length <= 1) {
    return null;
  }

  const handleSwitchCompany = async (companyId) => {
    if (companyId === activeCompany?.companyId) {
      setIsOpen(false);
      return;
    }

    try {
      setSwitching(true);

      const { data } = await switchCompany({
        variables: { companyId }
      });

      if (data?.switchCompany?.success) {
        // Save new token
        if (data.switchCompany.token) {
          setAuthToken(data.switchCompany.token);
        }

        // Update auth context
        if (data.switchCompany.user) {
          login(data.switchCompany.user, data.switchCompany.token);
        }

        // Show success message
        console.log('✅ Switched to:', data.switchCompany.activeCompany?.name);

        // Close dropdown
        setIsOpen(false);

        // Reload page to refresh all data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error switching company:', error);
      alert(error.message || 'Failed to switch company');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="relative">
      {/* Current Company Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 transition-all"
        disabled={switching}
      >
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            {activeCompany?.companyName?.charAt(0) || 'C'}
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-900">
              {activeCompany?.companyName || 'Select Company'}
            </div>
            <div className="text-xs text-gray-500">{activeCompany?.role || 'Role'}</div>
          </div>
        </div>

        {!switching && (
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}

        {switching && (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && !switching && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute top-full mt-2 right-0 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-linear-to-r from-blue-50 to-purple-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Switch Company</h3>
              <p className="text-xs text-gray-600 mt-1">
                You have access to {companies.length} {companies.length === 1 ? 'company' : 'companies'}
              </p>
            </div>

            {/* Companies List */}
            <div className="max-h-80 overflow-y-auto">
              {companies.map((company) => (
                <button
                  key={company.companyId}
                  onClick={() => handleSwitchCompany(company.companyId)}
                  className={`w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${company.isActive ? 'bg-blue-50' : ''
                    }`}
                >
                  {/* Company Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${company.isActive
                    ? 'bg-linear-to-br from-blue-500 to-purple-600'
                    : 'bg-linear-to-br from-gray-400 to-gray-600'
                    }`}>
                    {company.companyName.charAt(0)}
                  </div>

                  {/* Company Info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {company.companyName}
                      </span>
                      {company.isActive && (
                        <span className="px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-600">{company.role}</span>
                      {company.salesPersonId && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{company.salesPersonId}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Active Indicator */}
                  {company.isActive && (
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-600 text-center">
                💡 Switching companies will reload the page
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
