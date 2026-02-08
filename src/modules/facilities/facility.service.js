// src/modules/facilities/facility.service.js
/**
 * Freedom Protocol - Facility Service
 * Business logic for facility management
 */

const BaseError = require('../../errors/baseError');
const facilityRepository = require('./facility.repository');

/**
 * Create new facility
 * 
 * @param {string} ownerUserId - Owner user UUID
 * @param {string} name - Facility name
 * @returns {Promise<Object>} Created facility
 * @throws {BaseError} If validation fails
 */
const createFacility = async (ownerUserId, name) => {
  try {
    // Validate inputs
    if (!ownerUserId) {
      throw new BaseError(
        'Owner user ID is required',
        400,
        'MISSING_OWNER_USER_ID'
      );
    }

    if (!name || name.trim().length === 0) {
      throw new BaseError(
        'Facility name is required',
        400,
        'MISSING_FACILITY_NAME'
      );
    }

    if (name.trim().length < 3) {
      throw new BaseError(
        'Facility name must be at least 3 characters',
        400,
        'INVALID_FACILITY_NAME'
      );
    }

    // Create facility
    const facility = await facilityRepository.createFacility({
      name: name.trim(),
      owner_user_id: ownerUserId
    });

    return {
      id: facility.id,
      name: facility.name,
      ownerUserId: facility.owner_user_id,
      createdAt: facility.created_at
    };
  } catch (error) {
    console.error('Error in createFacility:', error);
    
    if (error instanceof BaseError) {
      throw error;
    }
    
    throw new BaseError(
      'Failed to create facility',
      500,
      'FACILITY_CREATION_ERROR'
    );
  }
};

/**
 * Assign doctor to facility
 * 
 * @param {string} doctorId - Doctor user UUID
 * @param {string} facilityId - Facility UUID
 * @returns {Promise<Object>} Assignment result
 * @throws {BaseError} If validation fails or facility not found
 */
const assignDoctorToFacility = async (doctorId, facilityId) => {
  try {
    // Validate inputs
    if (!doctorId) {
      throw new BaseError(
        'Doctor ID is required',
        400,
        'MISSING_DOCTOR_ID'
      );
    }

    if (!facilityId) {
      throw new BaseError(
        'Facility ID is required',
        400,
        'MISSING_FACILITY_ID'
      );
    }

    // Check if facility exists
    const facility = await facilityRepository.getFacilityById(facilityId);
    
    if (!facility) {
      throw new BaseError(
        'Facility not found',
        404,
        'FACILITY_NOT_FOUND'
      );
    }

    // Check if already assigned
    const isAssigned = await facilityRepository.isDoctorAssignedToFacility(doctorId, facilityId);
    
    if (isAssigned) {
      throw new BaseError(
        'Doctor is already assigned to this facility',
        409,
        'DOCTOR_ALREADY_ASSIGNED'
      );
    }

    // Assign doctor to facility
    const assignment = await facilityRepository.assignDoctorToFacility(doctorId, facilityId);

    return {
      doctorId: doctorId,
      facilityId: facilityId,
      facilityName: facility.name,
      assignedAt: assignment.assigned_at
    };
  } catch (error) {
    console.error('Error in assignDoctorToFacility:', error);
    
    if (error instanceof BaseError) {
      throw error;
    }
    
    throw new BaseError(
      'Failed to assign doctor to facility',
      500,
      'ASSIGNMENT_ERROR'
    );
  }
};

/**
 * Get doctors assigned to facility
 * 
 * @param {string} facilityId - Facility UUID
 * @returns {Promise<Object>} Facility and doctors list
 * @throws {BaseError} If validation fails or facility not found
 */
const getFacilityDoctors = async (facilityId) => {
  try {
    // Validate input
    if (!facilityId) {
      throw new BaseError(
        'Facility ID is required',
        400,
        'MISSING_FACILITY_ID'
      );
    }

    // Check if facility exists
    const facility = await facilityRepository.getFacilityById(facilityId);
    
    if (!facility) {
      throw new BaseError(
        'Facility not found',
        404,
        'FACILITY_NOT_FOUND'
      );
    }

    // Get doctors
    const doctors = await facilityRepository.getDoctorsByFacility(facilityId);

    return {
      facility: {
        id: facility.id,
        name: facility.name,
        ownerUserId: facility.owner_user_id
      },
      doctors: doctors.map(doctor => ({
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone,
        assignedAt: doctor.assigned_at
      })),
      total: doctors.length
    };
  } catch (error) {
    console.error('Error in getFacilityDoctors:', error);
    
    if (error instanceof BaseError) {
      throw error;
    }
    
    throw new BaseError(
      'Failed to get facility doctors',
      500,
      'GET_DOCTORS_ERROR'
    );
  }
};

/**
 * Get facility by ID
 * 
 * @param {string} facilityId - Facility UUID
 * @returns {Promise<Object>} Facility details
 * @throws {BaseError} If validation fails or facility not found
 */
const getFacilityById = async (facilityId) => {
  try {
    // Validate input
    if (!facilityId) {
      throw new BaseError(
        'Facility ID is required',
        400,
        'MISSING_FACILITY_ID'
      );
    }

    // Get facility
    const facility = await facilityRepository.getFacilityById(facilityId);
    
    if (!facility) {
      throw new BaseError(
        'Facility not found',
        404,
        'FACILITY_NOT_FOUND'
      );
    }

    return {
      id: facility.id,
      name: facility.name,
      ownerUserId: facility.owner_user_id,
      createdAt: facility.created_at
    };
  } catch (error) {
    console.error('Error in getFacilityById:', error);
    
    if (error instanceof BaseError) {
      throw error;
    }
    
    throw new BaseError(
      'Failed to get facility',
      500,
      'GET_FACILITY_ERROR'
    );
  }
};

module.exports = {
  createFacility,
  assignDoctorToFacility,
  getFacilityDoctors,
  getFacilityById
};