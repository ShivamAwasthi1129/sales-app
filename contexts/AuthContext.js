'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUserFromToken, removeAuthToken } from '../lib/auth';
import { getDefaultPathForRole, hasAccess, isProtectedRoute } from '../config/navigation.config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Load user from token on mount
    const currentUser = getCurrentUserFromToken();
    setUser(currentUser);
    setLoading(false);

    // Check route access when pathname or user changes
    if (!loading && pathname) {
      checkRouteAccess(pathname, currentUser);
    }
  }, [pathname]);

  const checkRouteAccess = (path, currentUser) => {
    // Allow public routes
    if (!isProtectedRoute(path)) {
      return;
    }

    // Redirect to login if not authenticated
    if (!currentUser) {
      router.push('/login');
      return;
    }

    // Check if user has access to this specific route
    if (!hasAccess(path, currentUser.role)) {
      // Redirect to user's default dashboard
      const defaultPath = getDefaultPathForRole(currentUser.role);
      
      // Avoid infinite redirect loop
      if (path !== defaultPath) {
        console.warn(`Access denied to ${path} for role ${currentUser.role}. Redirecting to ${defaultPath}`);
        router.push(defaultPath);
      }
    }
  };

  const login = (userData, token) => {
    setUser(userData);
    // Redirect to role-specific dashboard
    const defaultPath = getDefaultPathForRole(userData.role);
    router.push(defaultPath);
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    router.push('/login');
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

