// components/Sidebar.js

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getNavigationForRole, NAVIGATION_ICONS } from '../../config/navigation.config';
import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';

const GET_USER_COMPANY = gql`
  query GetCurrentUser {
    getCurrentUser {
      id
      companyId
      company {
        id
        sidebarModules {
          name
          path
          icon
          enabled
        }
      }
    }
  }
`;

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch company sidebar modules for non-super-admin users
  const { data: companyData, refetch: refetchCompanyData } = useQuery(GET_USER_COMPANY, {
    skip: !user || user.role === 'Super Admin',
    fetchPolicy: 'network-only',
    pollInterval: 30000,
  });

  useEffect(() => {
    if (user && user.role !== 'Super Admin') {
      refetchCompanyData();
    }
  }, [user, refetchCompanyData]);

  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', newState.toString());
  };

  let menuItems = user ? getNavigationForRole(user.role) : [];

  if (user && user.role !== 'Super Admin' && companyData?.getCurrentUser?.company?.sidebarModules) {
    const enabledModulesMap = new Map();
    companyData.getCurrentUser.company.sidebarModules.forEach(module => {
      enabledModulesMap.set(module.path, module.enabled);
    });

    menuItems = menuItems.filter(item => {
      const isEnabled = enabledModulesMap.has(item.path) ? enabledModulesMap.get(item.path) : true;
      return isEnabled;
    });
  }

  if (!user) {
    return null;
  }

  return (
    <div className={`h-screen bg-white text-gray-800 flex flex-col transition-all duration-300 ease-in-out relative border-r border-gray-200 ${isCollapsed ? 'w-20' : 'w-60'
      }`}>
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-4 top-8 z-50 bg-white text-gray-500 p-2.5 rounded-full shadow-lg hover:shadow-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-all duration-300 group cursor-pointer active:scale-95"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        type="button"
      >
        <svg
          className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Header */}
      <div className={`px-6 py-4 shrink-0 transition-all duration-300 relative z-10 ${isCollapsed ? 'px-3' : ''}`}>
        {!isCollapsed ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              {/* Logo Icon */}
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  SaleStar
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  Lightning Fast Sales
                </p>
              </div>
            </div>
            {user && (
              <div className="px-2 py-1 bg-gray-100 rounded-md border border-gray-200">
                <p className="text-xs font-semibold text-gray-700 leading-tight">
                  {user.role}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 px-3 py-2 space-y-0.5 overflow-hidden relative z-10 flex flex-col transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
        {menuItems.map((item, index) => {
          const isActive = pathname === item.path;
          const icon = NAVIGATION_ICONS[item.icon];

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center rounded-md transition-all duration-300 group relative shrink-0 ${isCollapsed
                ? 'justify-center px-2 py-2.5'
                : 'space-x-2.5 px-2.5 py-2.5'
                } ${isActive
                  ? 'bg-blue-900 text-white border border-blue-900 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-200 border border-transparent'
                }`}
              title={isCollapsed ? item.name : item.description}
            >
              <div className={`shrink-0 transition-all duration-300 flex items-center justify-center w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                }`}>
                {icon}
              </div>
              {!isCollapsed && (
                <span className={`whitespace-nowrap font-medium text-xs leading-tight ${isActive ? 'text-white font-semibold' : 'text-gray-700'
                  }`}>{item.name}</span>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 whitespace-nowrap z-50 shadow-lg">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`px-3 py-3 shrink-0 space-y-2.5 transition-all duration-300 relative z-10 ${isCollapsed ? 'px-2' : ''}`}>
        {!isCollapsed && user && (
          <div className="px-2 py-2 bg-gray-50 rounded-md border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center font-semibold text-blue-600 shrink-0 text-xs">
                {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-gray-500 truncate leading-tight">{user.email}</p>
              </div>
            </div>
          </div>
        )}
        {isCollapsed && user && (
          <div className="flex justify-center">
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center font-semibold text-blue-600 text-xs">
              {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={`w-full flex items-center rounded-md transition-all duration-300 bg-red-600 hover:bg-red-700 text-white border border-red-600 hover:border-red-700 group shadow-sm hover:shadow-md shrink-0 ${isCollapsed
            ? 'justify-center px-2 py-2.5'
            : 'justify-center space-x-2 px-2.5 py-2.5'
            }`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <svg className="w-4 h-4 shrink-0 transition-all duration-300" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!isCollapsed && <span className="font-medium text-xs leading-tight">Logout</span>}
        </button>
      </div>
    </div>
  );
}
