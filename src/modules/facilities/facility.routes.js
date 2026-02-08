const express = require('express');
const router = express.Router();

const authModule = require('../../middleware/auth');
const facilityController = require('./facility.controller');

console.log("AUTH MODULE:", authModule);
console.log("FACILITY CONTROLLER:", facilityController);

const authenticateJWT = authModule.authenticateJWT || authModule;

if (typeof authenticateJWT !== 'function') {
  throw new Error('authenticateJWT is NOT a function');
}

if (typeof facilityController.createFacility !== 'function') {
  throw new Error('createFacility is NOT a function');
}

if (typeof facilityController.assignDoctorToFacility !== 'function') {
  throw new Error('assignDoctorToFacility is NOT a function');
}

if (typeof facilityController.getFacilityDoctors !== 'function') {
  throw new Error('getFacilityDoctors is NOT a function');
}

router.post('/', authenticateJWT, facilityController.createFacility);
router.post('/assign-doctor', authenticateJWT, facilityController.assignDoctorToFacility);
router.get('/:facilityId/doctors', authenticateJWT, facilityController.getFacilityDoctors);

module.exports = router;
