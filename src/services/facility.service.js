/**
 * Freedom Protocol - Facility Service
 */

const BaseError = require('../errors/baseError');
const facilityRepository = require('../repositories/facility.repository');

/**
 * Get facility dashboard
 */
const getFacilityDashboard = async (facilityId) => {

  const facility = await facilityRepository.getFacilityById(facilityId);

  if (!facility) {
    throw new BaseError('Facility not found', 404, 'NOT_FOUND');
  }

  const doctors =
    await facilityRepository.getFacilityDoctors(facilityId);

  const earnings =
    await facilityRepository.getFacilityEarnings(facilityId);

  return {
    facility,
    doctors,
    earnings
  };
};

module.exports = {
  getFacilityDashboard
};
