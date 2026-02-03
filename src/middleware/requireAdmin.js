/**
 * Admin-only authorization middleware
 * Must be used AFTER authenticateToken
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required'
    });
  }

  next();
}

module.exports = requireAdmin;
