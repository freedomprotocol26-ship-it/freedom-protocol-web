/**
 * Freedom Protocol - Facility Controller
 */

const facilityService = require('../services/facility.service');
const controllerErrorHandler = require('./controllerErrorHandler');

/**
 * GET /api/facilities/:facilityId/dashboard
 */
const getDashboard = controllerErrorHandler(async (req, res) => {

  const data = await facilityService.getFacilityDashboard(
    req.params.facilityId
  );

  res.status(200).json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
});

module.exports = {
  getDashboard
};
