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
    <div className={`h-screen bg-gradient-to-b from-blue-50 via-indigo-50 to-purple-50 text-gray-800 flex flex-col transition-all duration-500 ease-in-out relative shadow-2xl border-r border-white/50 backdrop-blur-sm ${
      isCollapsed ? 'w-20' : 'w-72'
    }`}>
      {/* Animated Background Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Toggle Button - Enhanced Design */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-8 z-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white p-2.5 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 hover-glow border-2 border-white group"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg 
          className={`w-4 h-4 transition-transform duration-500 group-hover:scale-110 ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Header - SaleStar Lightning Theme */}
      <div className={`p-6 border-b border-white/40 transition-all duration-300 relative z-10 ${isCollapsed ? 'px-3' : ''}`}>
        {!isCollapsed ? (
          <div className="space-y-3 animate-fade-in-up">
            <div className="flex items-center gap-3 group">
              {/* Animated Lightning Bolt Icon */}
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-xl hover-glow group-hover:scale-110 transition-transform duration-300 relative overflow-hidden">
                <svg className="w-7 h-7 text-white animate-lightning relative z-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-black whitespace-nowrap tracking-tight gradient-text">
                  SaleStar
                </h1>
                <p className="text-xs font-medium bg-gradient-to-r from-gray-600 to-gray-500 bg-clip-text text-transparent whitespace-nowrap">
                  ⚡ Lightning-Fast Sales
                </p>
              </div>
            </div>
            {user && (
              <div className="glass-effect rounded-xl px-4 py-2.5 border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <p className="text-xs font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent whitespace-nowrap">
                  {user.role}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center animate-fade-in-up">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-xl hover-glow hover:scale-110 transition-transform duration-300 relative overflow-hidden group">
              <svg className="w-7 h-7 text-white animate-lightning relative z-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
              </svg>
            </div>
          </div>
        )}
      </div>
      
      {/* Navigation - Lightning Fast Theme */}
      <nav className={`flex-1 p-4 space-y-2 overflow-y-auto enhanced-scrollbar transition-all duration-300 relative z-10 ${isCollapsed ? 'px-2' : ''}`}>
        {menuItems.map((item, index) => {
          const isActive = pathname === item.path;
          const icon = NAVIGATION_ICONS[item.icon];
          
          return (
            <Link
              key={item.path}
              href={item.path}
              style={{ animationDelay: `${index * 50}ms` }}
              className={`flex items-center rounded-xl transition-all duration-300 group relative overflow-hidden animate-fade-in-up ${
                isCollapsed 
                  ? 'justify-center px-2 py-4' 
                  : 'space-x-3.5 px-4 py-4'
              } ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-xl font-semibold scale-105 hover-glow'
                  : 'text-gray-700 hover:bg-white/90 hover:text-indigo-600 hover:shadow-lg hover:scale-105 glass-effect'
              }`}
              title={isCollapsed ? item.name : item.description}
            >
              {/* Active Indicator Bar */}
              {isActive && !isCollapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-white rounded-r-full shadow-lg animate-pulse-ring"></div>
              )}
              
              <div className={`flex-shrink-0 transition-all duration-300 relative z-10 ${
                isActive ? 'scale-110 drop-shadow-lg' : 'group-hover:scale-125 group-hover:rotate-6'
              }`}>
                {icon}
              </div>
              {!isCollapsed && (
                <span className="whitespace-nowrap font-semibold tracking-wide relative z-10">{item.name}</span>
              )}
              
              {/* Hover tooltip for collapsed state - Enhanced */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-4 py-2.5 bg-gradient-to-r from-gray-900 to-gray-800 text-white text-sm font-medium rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 whitespace-nowrap z-50 shadow-2xl border border-white/10 group-hover:translate-x-1">
                  {item.name}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer - Lightning Theme User Info */}
      <div className={`p-4 border-t border-white/40 transition-all duration-300 relative z-10 ${isCollapsed ? 'px-2' : ''}`}>
        {!isCollapsed && user && (
          <div className="mb-4 px-4 py-3.5 glass-effect rounded-xl border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 card-3d">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-white shadow-xl relative overflow-hidden group">
                <span className="relative z-10 text-base">
                  {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-gray-600 truncate font-medium">{user.email}</p>
              </div>
            </div>
          </div>
        )}
        {isCollapsed && user && (
          <div className="mb-4 flex justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 relative overflow-hidden group">
              <span className="relative z-10 text-base">
                {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={`w-full flex items-center rounded-xl transition-all duration-300 bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-500 hover:via-red-600 hover:to-pink-600 text-red-600 hover:text-white border-2 border-red-200 hover:border-red-500 group shadow-md hover:shadow-xl hover:scale-105 relative overflow-hidden ${
            isCollapsed 
              ? 'justify-center px-2 py-4' 
              : 'justify-center space-x-2.5 px-4 py-3.5'
          }`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <svg className="w-5 h-5 flex-shrink-0 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!isCollapsed && <span className="font-bold tracking-wide relative z-10">Logout</span>}
        </button>
      </div>
    </div>
  );
}