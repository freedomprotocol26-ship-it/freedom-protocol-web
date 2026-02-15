/**
 * Doctor-only authorization middleware
 * Must be used AFTER authenticateToken
 */
function requireDoctor(req, res, next) {
  if (!req.user || req.user.role !== 'doctor') {
    return res.status(403).json({
      success: false,
      message: 'Doctor access required',
    });
  }

  next();
}

module.exports = requireDoctor;
