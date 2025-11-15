'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { removeAuthToken, getCurrentUserFromToken } from '../../lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUserFromToken();
    setUser(currentUser);
    
    // Load collapsed state from localStorage
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

  const handleLogout = () => {
    removeAuthToken();
    router.push('/login');
  };

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      roles: ['Super Admin', 'Admin', 'AdminTeam', 'Client'],
    },
    {
      name: 'Catalogue',
      href: '/dashboard/catalogue',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      roles: ['Super Admin', 'Admin', 'AdminTeam'],
    },
    {
      name: 'User Management',
      href: '/dashboard/users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      roles: ['Super Admin', 'Admin'],
    },
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    if (!user) return false;
    return item.roles.includes(user.role);
  });
  return (
    <div className={`h-screen bg-gray-800 text-white flex flex-col transition-all duration-300 ease-in-out relative ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 z-10 bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded-full shadow-lg transition-all duration-300"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg 
          className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Header */}
      <div className={`p-6 border-b border-gray-800 transition-all duration-300 ${isCollapsed ? 'px-3' : ''}`}>
        {!isCollapsed ? (
          <>
            <h1 className="text-xl font-bold whitespace-nowrap">Sales App</h1>
            {user && (
              <p className="text-sm text-gray-400 mt-1 whitespace-nowrap">
                {user.role}
              </p>
            )}
          </>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold">S</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Navigation */}
      <nav className={`flex-1 p-4 space-y-2 transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
        {filteredMenuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-lg transition-all duration-200 group ${
                isCollapsed 
                  ? 'justify-center px-2 py-3' 
                  : 'space-x-3 px-4 py-3'
              } ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
              title={isCollapsed ? item.name : ''}
            >
              <div className="flex-shrink-0">
                {item.icon}
              </div>
              {!isCollapsed && (
                <span className="whitespace-nowrap">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`p-4 border-t border-gray-800 transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
        {!isCollapsed && user && (
          <div className="mb-4 px-4 py-2 bg-gray-800 rounded-lg">
            <p className="text-sm font-medium truncate">{user.email}</p>
            <p className="text-xs text-gray-400 truncate">{user.role}</p>
          </div>
        )}
        {isCollapsed && user && (
          <div className="mb-4 flex justify-center">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center rounded-lg transition-all duration-200 bg-red-600 hover:bg-red-700 ${
            isCollapsed 
              ? 'justify-center px-2 py-3' 
              : 'justify-center space-x-2 px-4 py-2'
          }`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}

