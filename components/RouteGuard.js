'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { hasAccess, isProtectedRoute, getDefaultPathForRole } from '../config/navigation.config';
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

/**
 * RouteGuard Component
 * Centralized route protection middleware
 * Enforces role-based access control at the router level
 */
export default function RouteGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // Fetch company sidebar modules for non-super-admin users
  const { data: companyData } = useQuery(GET_USER_COMPANY, {
    skip: !user || user.role === 'Super Admin',
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (loading) return;

    // Allow public routes
    if (!isProtectedRoute(pathname)) {
      return;
    }

    // Redirect to login if not authenticated
    if (!user) {
      console.warn(`Unauthorized access attempt to ${pathname}. Redirecting to login.`);
      router.push('/login');
      return;
    }

    // Check if user has permission for this route
    if (!hasAccess(pathname, user.role)) {
      const defaultPath = getDefaultPathForRole(user.role);
      console.warn(
        `Access denied: ${user.role} attempted to access ${pathname}. Redirecting to ${defaultPath}`
      );
      
      // Redirect to role's default dashboard
      router.push(defaultPath);
      return;
    }

    // Check if the module is disabled for the company (only for non-super-admin users)
    if (user.role !== 'Super Admin' && companyData?.getCurrentUser?.company?.sidebarModules) {
      const moduleForCurrentPath = companyData.getCurrentUser.company.sidebarModules.find(
        module => module.path === pathname
      );
      
      if (moduleForCurrentPath && !moduleForCurrentPath.enabled) {
        const defaultPath = getDefaultPathForRole(user.role);
        console.warn(
          `Module disabled: ${pathname} is disabled for this company. Redirecting to ${defaultPath}`
        );
        router.push(defaultPath);
        return;
      }
    }

    // Access granted
    console.info(`Access granted: ${user.role} accessing ${pathname}`);
  }, [pathname, user, loading, router, companyData]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting for unauthorized access
  if (isProtectedRoute(pathname) && (!user || !hasAccess(pathname, user.role))) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return children;
}

/**
 * Higher-order component to protect individual pages
 * Usage: export default withAuth(YourPage, 'Admin');
 */
export function withAuth(Component, requiredRole = null) {
  return function ProtectedPage(props) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (loading) return;

      if (!user) {
        router.push('/login');
        return;
      }

      // Check specific role requirement if provided
      if (requiredRole && user.role !== requiredRole) {
        const defaultPath = getDefaultPathForRole(user.role);
        router.push(defaultPath);
        return;
      }
    }, [user, loading, router]);

    if (loading || !user) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (requiredRole && user.role !== requiredRole) {
      return null;
    }

    return <Component {...props} user={user} />;
  };
}

