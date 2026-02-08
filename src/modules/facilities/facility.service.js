// src/modules/facilities/facility.service.js

const facilityRepository = require('./facility.repository');

/**
 * Create facility
 */
async function createFacility(ownerUserId, name) {
  try {
    return await facilityRepository.createFacility(ownerUserId, name);
  } catch (err) {
    console.error("Error in createFacility:", err);
    throw new Error("Failed to create facility");
  }
}

/**
 * Assign doctor to facility
 */
async function assignDoctorToFacility(doctorId, facilityId) {
  try {
    return await facilityRepository.assignDoctorToFacility(
      doctorId,
      facilityId
    );
  } catch (err) {
    console.error("Error in assignDoctorToFacility:", err);
    throw new Error("Failed to assign doctor to facility");
  }
}

/**
 * Get doctors for a facility
 */
async function getFacilityDoctors(facilityId) {
  try {
    return await facilityRepository.getFacilityDoctors(facilityId);
  } catch (err) {
    console.error("Error in getFacilityDoctors:", err);
    throw new Error("Failed to get facility doctors");
  }
}

module.exports = {
  createFacility,
  assignDoctorToFacility,
  getFacilityDoctors
};
