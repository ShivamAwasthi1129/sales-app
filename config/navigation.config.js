/**
 * Centralized Navigation Configuration
 * Single source of truth for role-based navigation and routing
 */

// Role constants for type safety and consistency
export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  SALES_PERSON: 'Sales Person',
  CUSTOMER: 'Customer',
};

// Navigation configuration for each role
export const SIDEBAR_CONFIG = {
  [ROLES.SUPER_ADMIN]: [
    {
      name: 'Dashboard',
      path: '/super-admin/dashboard',
      icon: 'dashboard',
      description: 'System overview and analytics',
    },
    {
      name: 'Users',
      path: '/super-admin/users',
      icon: 'users',
      description: 'User management and permissions',
    },
    {
      name: 'Companies',
      path: '/super-admin/companies',
      icon: 'companies',
      description: 'Company management',
    },
    {
      name: 'Plans & Packages',
      path: '/super-admin/plans',
      icon: 'plans',
      description: 'Subscription plans and packages',
    },
    {
      name: 'Control Center',
      path: '/super-admin/control',
      icon: 'settings',
      description: 'System configuration and settings',
    },
  ],
  [ROLES.ADMIN]: [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: 'dashboard',
      description: 'Admin overview and metrics',
    },
    {
      name: 'Product Catalogue',
      path: '/admin/catalogue',
      icon: 'products',
      description: 'Manage products and services',
    },
    {
      name: 'Manage Quotation',
      path: '/admin/quotes',
      icon: 'quotations',
      description: 'Create and manage quotations',
    },
    {
      name: 'Quotation Tracking',
      path: '/admin/tracking',
      icon: 'tracking',
      description: 'Track quotation status and history',
    },
    {
      name: 'Sales Person Management',
      path: '/admin/sales-person-management',
      icon: 'users',
      description: 'Manage your sales persons',
    },
    {
      name: 'Coupons & Offer',
      path: '/admin/offers',
      icon: 'coupons',
      description: 'Discount codes and promotions',
    },
    {
      name: 'Global Settings',
      path: '/admin/settings',
      icon: 'settings',
      description: 'Application settings',
    },
  ],
  [ROLES.SALES_PERSON]: [
    {
      name: 'Dashboard',
      path: '/sales/dashboard',
      icon: 'dashboard',
      description: 'Sales overview and performance',
    },
    {
      name: 'Manage Quotation',
      path: '/sales/quotes',
      icon: 'quotations',
      description: 'Your quotations',
    },
    {
      name: 'Quotation Tracking',
      path: '/sales/tracking',
      icon: 'tracking',
      description: 'Track quotation status',
    },
  ],
  [ROLES.CUSTOMER]: [
    {
      name: 'Dashboard',
      path: '/customer/dashboard',
      icon: 'dashboard',
      description: 'Your account overview',
    },
    {
      name: 'Quotations',
      path: '/customer/quotes',
      icon: 'quotations',
      description: 'View your quotations',
    },
    {
      name: 'Invoices & Contracts',
      path: '/customer/invoices',
      icon: 'invoices',
      description: 'Billing documents',
    },
    {
      name: 'Settings',
      path: '/customer/settings',
      icon: 'settings',
      description: 'Manage your profile',
    },
  ],
};

// Route to role mapping for authorization
export const ROUTE_PERMISSIONS = {
  // Super Admin routes
  '/super-admin/dashboard': [ROLES.SUPER_ADMIN],
  '/super-admin/users': [ROLES.SUPER_ADMIN],
  '/super-admin/companies': [ROLES.SUPER_ADMIN],
  '/super-admin/plans': [ROLES.SUPER_ADMIN],
  '/super-admin/control': [ROLES.SUPER_ADMIN],
  
  // Admin routes
  '/admin/dashboard': [ROLES.ADMIN],
  '/admin/catalogue': [ROLES.ADMIN],
  '/admin/quotes': [ROLES.ADMIN],
  '/admin/tracking': [ROLES.ADMIN],
  '/admin/sales-person-management': [ROLES.ADMIN],
  '/admin/offers': [ROLES.ADMIN],
  '/admin/settings': [ROLES.ADMIN],
  
  // Sales Person routes
  '/sales/dashboard': [ROLES.SALES_PERSON],
  '/sales/quotes': [ROLES.SALES_PERSON],
  '/sales/analytics': [ROLES.SALES_PERSON],
  '/sales/tracking': [ROLES.SALES_PERSON],
  
  // Customer routes
  '/customer/dashboard': [ROLES.CUSTOMER],
  '/customer/quotes': [ROLES.CUSTOMER],
  '/customer/invoices': [ROLES.CUSTOMER],
  '/customer/settings': [ROLES.CUSTOMER],
};

// Default redirect paths for each role after login
export const ROLE_DEFAULT_PATHS = {
  [ROLES.SUPER_ADMIN]: '/super-admin/dashboard',
  [ROLES.ADMIN]: '/admin/dashboard',
  [ROLES.SALES_PERSON]: '/sales/dashboard',
  [ROLES.CUSTOMER]: '/customer/dashboard',
};

// Icon mapping for navigation items
export const NAVIGATION_ICONS = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  companies: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  plans: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  products: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  quotations: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  coupons: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  analytics: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  tracking: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  invoices: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
    </svg>
  ),
};

/**
 * Helper function to get navigation items for a specific role
 * @param {string} role - User role
 * @returns {Array} Navigation items for the role
 */
export function getNavigationForRole(role) {
  return SIDEBAR_CONFIG[role] || [];
}

/**
 * Helper function to check if a user has access to a specific route
 * @param {string} path - Route path
 * @param {string} userRole - User's role
 * @returns {boolean} Whether user has access
 */
export function hasAccess(path, userRole) {
  const allowedRoles = ROUTE_PERMISSIONS[path];
  if (!allowedRoles) {
    return false;
  }
  return allowedRoles.includes(userRole);
}

/**
 * Get the default redirect path for a role
 * @param {string} role - User role
 * @returns {string} Default path for the role
 */
export function getDefaultPathForRole(role) {
  return ROLE_DEFAULT_PATHS[role] || '/login';
}

/**
 * Check if a route requires authentication
 * @param {string} path - Route path
 * @returns {boolean} Whether the route requires authentication
 */
export function isProtectedRoute(path) {
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/'];
  return !publicRoutes.some(route => path.startsWith(route));
}

