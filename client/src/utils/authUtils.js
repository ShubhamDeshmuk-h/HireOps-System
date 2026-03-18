// Standardized authentication utilities
export const authUtils = {
  // Set authentication data
  setAuthData: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userEmail', user?.email || '');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('userRole', user?.role || '');
  },

  // Get authentication data
  getAuthData: () => {
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('userEmail');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userRole = localStorage.getItem('userRole');
    
    return { token, userEmail, user, userRole };
  },

  // Clear authentication data
  clearAuthData: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  },

  // Get token for API calls
  getToken: () => {
    return localStorage.getItem('token');
  },

  // Get user info
  getUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Get user email
  getUserEmail: () => {
    return localStorage.getItem('userEmail') || '';
  }
}; 