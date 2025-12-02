/**
 * Authentication Middleware for API Routes
 * Protects API endpoints by verifying JWT token
 */

import jwt from 'jsonwebtoken';

export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function getTokenFromRequest(request) {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookies
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => c.split('='))
    );
    return cookies.token;
  }
  
  return null;
}

export function requireAuth(request) {
  const token = getTokenFromRequest(request);
  
  if (!token) {
    return {
      error: 'Authentication required',
      status: 401
    };
  }
  
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return {
      error: 'Invalid or expired token',
      status: 401
    };
  }
  
  return {
    user: {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      companyId: decoded.companyId,
      activeCompanyId: decoded.activeCompanyId || decoded.companyId
    }
  };
}

export function requireRole(user, allowedRoles) {
  if (!user) {
    return {
      error: 'Authentication required',
      status: 401
    };
  }
  
  if (!allowedRoles.includes(user.role)) {
    return {
      error: `Unauthorized. Required role: ${allowedRoles.join(' or ')}`,
      status: 403
    };
  }
  
  return null; // No error
}


