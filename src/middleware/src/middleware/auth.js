const jwt = require('jsonwebtoken');

/**
 * Authenticate JWT Bearer Token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  // Must be: Authorization: Bearer <token>
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Bearer token required'
    });
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Bearer token required'
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      error: 'JWT secret not configured'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Normalize user object
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email
    };

    next();
  });
}

module.exports = {
  authenticateToken
};
