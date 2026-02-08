const express = require('express');
const router = express.Router();

const { authenticateJWT } = require('../../middleware/auth');
const facilityController = require('./facility.controller');

router.post('/', authenticateJWT, facilityController.createFacility);

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
