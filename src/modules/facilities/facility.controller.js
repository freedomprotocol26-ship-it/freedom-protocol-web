// src/modules/facilities/facility.controller.js
/**
 * Freedom Protocol - Facility Controller
 * HTTP handlers for facility endpoints
 */

const facilityService = require('./facility.service');
const controllerErrorHandler = require('../../controllers/controllerErrorHandler');

/**
 * Create facility
 * POST /facilities
 * 
 * Body:
 * {
 *   "ownerUserId": "uuid-here",
 *   "name": "East Legon Medical Center"
 * }
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createFacility = controllerErrorHandler(async (req, res) => {
  const { ownerUserId, name } = req.body;

  const facility = await facilityService.createFacility(ownerUserId, name);

  res.status(201).json({
    success: true,
    message: 'Facility created successfully',
    data: facility,
    timestamp: new Date().toISOString()
  });
});

/**
 * Assign doctor to facility
 * POST /facilities/assign-doctor
 * 
 * Body:
 * {
 *   "doctorId": "uuid-here",
 *   "facilityId": "uuid-here"
 * }
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const assignDoctorToFacility = controllerErrorHandler(async (req, res) => {
  const { doctorId, facilityId } = req.body;

  const assignment = await facilityService.assignDoctorToFacility(doctorId, facilityId);

  res.status(201).json({
    success: true,
    message: 'Doctor assigned to facility successfully',
    data: assignment,
    timestamp: new Date().toISOString()
  });
});

/**
 * Get facility doctors
 * GET /facilities/:facilityId/doctors
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getFacilityDoctors = controllerErrorHandler(async (req, res) => {
  const facilityId = req.params.facilityId;

  const result = await facilityService.getFacilityDoctors(facilityId);

  res.status(200).json({
    success: true,
    message: 'Facility doctors retrieved successfully',
    data: result,
    timestamp: new Date().toISOString()
  });
});

module.exports = {
  createFacility,
  assignDoctorToFacility,
  getFacilityDoctors
};