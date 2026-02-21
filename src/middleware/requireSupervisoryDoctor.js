/**
 * ======================================
 * REQUIRE SUPERVISORY DOCTOR ROLE
 * ======================================
 */

function requireSupervisoryDoctor(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.user.role !== 'supervisory_doctor') {
    return res.status(403).json({
      success: false,
      error: 'Access restricted to supervisory doctors only'
    });
  }

  next();
}

module.exports = requireSupervisoryDoctor;