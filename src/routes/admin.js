const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const adminController = require('../controllers/adminController');

// ======================================
// ADMIN GOVERNANCE ROUTES
// ======================================

router.get(
  '/doctors',
  authenticateToken,
  requireAdmin,
  adminController.getDoctors
);

router.patch(
  '/doctors/:id/approve',
  authenticateToken,
  requireAdmin,
  adminController.approveDoctor
);

router.patch(
  '/doctors/:id/suspend',
  authenticateToken,
  requireAdmin,
  adminController.suspendDoctor
);

module.exports = router;
