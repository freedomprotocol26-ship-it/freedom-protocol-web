const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../middleware/auth');
const facilityController = require('./facility.controller');

router.post('/', authenticateToken, facilityController.createFacility);

router.post(
  '/assign-doctor',
  authenticateToken,
  facilityController.assignDoctorToFacility
);

router.get(
  '/:facilityId/doctors',
  authenticateToken,
  facilityController.getFacilityDoctors
);

module.exports = router;
