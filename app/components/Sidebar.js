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
    <div className={`h-screen bg-gradient-to-b from-indigo-50 via-purple-50 to-blue-50 text-gray-800 flex flex-col transition-all duration-300 ease-in-out relative shadow-xl border-r border-gray-200 ${
      isCollapsed ? 'w-20' : 'w-72'
    }`}>
      {/* Toggle Button - Modern Design */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-8 z-10 bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border-2 border-white"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg 
          className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Header - SaleStar Style */}
      <div className={`p-6 border-b border-gray-200 transition-all duration-300 ${isCollapsed ? 'px-3' : ''}`}>
        {!isCollapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {/* Lightning Bolt Icon */}
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold whitespace-nowrap tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">SaleStar</h1>
                <p className="text-xs text-gray-500 whitespace-nowrap">Lightning-Fast Sales</p>
              </div>
            </div>
            {user && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 backdrop-blur-sm rounded-lg px-3 py-2 border border-indigo-200">
                <p className="text-xs font-semibold text-indigo-700 whitespace-nowrap">
                  {user.role}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
              </svg>
            </div>
          </div>
        )}
      </div>
      
      {/* Navigation - Modern Clean Style */}
      <nav className={`flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          const icon = NAVIGATION_ICONS[item.icon];
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center rounded-xl transition-all duration-200 group relative ${
                isCollapsed 
                  ? 'justify-center px-2 py-3.5' 
                  : 'space-x-3 px-4 py-3.5'
              } ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg font-medium'
                  : 'text-gray-700 hover:bg-white/80 hover:text-indigo-600 hover:shadow-md'
              }`}
              title={isCollapsed ? item.name : item.description}
            >
              {/* Active Indicator */}
              {isActive && !isCollapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg"></div>
              )}
              
              <div className={`flex-shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
                {icon}
              </div>
              {!isCollapsed && (
                <span className="whitespace-nowrap font-medium">{item.name}</span>
              )}
              
              {/* Hover tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
                  {item.name}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer - Professional User Info */}
      <div className={`p-4 border-t border-gray-200 transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
        {!isCollapsed && user && (
          <div className="mb-4 px-4 py-3 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-white shadow-md">
                {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-gray-900">{user.name || user.email}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
        {isCollapsed && user && (
          <div className="mb-4 flex justify-center">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-white shadow-md">
              {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={`w-full flex items-center rounded-xl transition-all duration-200 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 hover:border-red-500 group ${
            isCollapsed 
              ? 'justify-center px-2 py-3.5' 
              : 'justify-center space-x-2 px-4 py-3'
          }`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <svg className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!isCollapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
}