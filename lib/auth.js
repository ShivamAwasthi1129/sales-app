import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

// Set authentication token
export const setAuthToken = (token) => {
  Cookies.set('token', token, { expires: 7 }); // 7 days
};

// Get authentication token
export const getAuthToken = () => {
  return Cookies.get('token');
};

// Remove authentication token
export const removeAuthToken = () => {
  Cookies.remove('token');
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const decoded = jwtDecode(token);
    // Check if token is expired
    if (decoded.exp * 1000 < Date.now()) {
      removeAuthToken();
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
};

// Get current user data from token
export const getCurrentUserFromToken = () => {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    if (decoded.exp * 1000 < Date.now()) {
      removeAuthToken();
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
};

// Check if user has specific role
export const hasRole = (allowedRoles) => {
  const user = getCurrentUserFromToken();
  if (!user) return false;
  return allowedRoles.includes(user.role);
};


