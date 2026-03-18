const roleAuth = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole
      });
    }
    
    next();
  };
};

// Specific role checkers
const requireHR = roleAuth(['hr', 'admin']);
const requireAdmin = roleAuth(['admin']);
const requireInterviewer = roleAuth(['interviewer', 'hr', 'admin']);

module.exports = {
  roleAuth,
  requireHR,
  requireAdmin,
  requireInterviewer
}; 