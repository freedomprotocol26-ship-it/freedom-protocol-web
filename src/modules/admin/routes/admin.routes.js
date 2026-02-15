const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../../middleware/auth');
const requireAdmin = require('../../../middleware/requireAdmin');
const adminController = require('../controllers/admin.controller');

/**
 * PATCH /admin/doctors/:id/approve
 */
router.patch(
  '/doctors/:id/approve',
  authenticateToken,
  requireAdmin,
  adminController.approveDoctor
);

module.exports = router;
