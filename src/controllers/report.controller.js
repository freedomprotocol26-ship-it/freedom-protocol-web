/**
 * Freedom Protocol - Report Controller
 * HTTP handlers for report endpoints
 */

const reportService = require('../services/report.service');
const controllerErrorHandler = require('./controllerErrorHandler');

/**
 * Get my report (role-based)
 * GET /api/reports/me
 */
const getMyReport = controllerErrorHandler(async (req, res) => {

  const report = await reportService.getMyReport(req.user);

  res.status(200).json({
    success: true,
    data: { report },
    timestamp: new Date().toISOString()
  });
});

module.exports = {
  getMyReport
};
