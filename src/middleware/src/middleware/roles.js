/**
 * Role-based authorization middleware
 */
function authorizeRole(allowedRoles = []) {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(403).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Authorization roles not configured'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Role not authorized'
      });
    }

    next();
  };
}

module.exports = {
  authorizeRole
};

