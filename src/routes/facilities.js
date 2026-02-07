/**
 * Freedom Protocol - Facility Routes
 */

const express = require('express');
const router = express.Router();

const facilityController = require('../controllers/facility.controller');
const { authenticateJWT } = require('../middleware/auth');
const {
  authorizeRole,
  authorizeFacility
} = require('../middleware/role.middleware');

/**
 * Facility dashboard
 */
router.get(
  '/facilities/:facilityId/dashboard',
  authenticateJWT,
  authorizeRole(['partner', 'admin']),
  authorizeFacility('facilityId'),
  facilityController.getDashboard
);

module.exports = router;
