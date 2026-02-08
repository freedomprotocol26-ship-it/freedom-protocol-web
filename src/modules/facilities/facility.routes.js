/**
 * Freedom Protocol - Facility Routes
 */

const express = require('express');
const router = express.Router();
const facilityController = require('./facility.controller');
const { authenticateJWT } = require('../../middleware/auth');

router.post(
  '/',
  authenticateJWT,
  facilityController.createFacility
);

router.post(
  '/assign-doctor',
  authenticateJWT,
  facilityController.assignDoctorToFacility
);

router.get(
  '/:facilityId/doctors',
  authenticateJWT,
  facilityController.getFacilityDoctors
);

module.exports = router;
