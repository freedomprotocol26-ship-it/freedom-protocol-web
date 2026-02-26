/**
 * Freedom Protocol - Doctor Controller
 */

const doctorService = require('../services/doctor.service');
const controllerErrorHandler = require('./controllerErrorHandler');

/**
 * GET /api/doctor/dashboard
 */
const getDashboard = controllerErrorHandler(async (req, res) => {

  const data = await doctorService.getDashboard(req.user.user_id);

  res.status(200).json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/doctor/wallet
 */
const getWallet = controllerErrorHandler(async (req, res) => {

  const data = await doctorService.getWallet(req.user.user_id);

  res.status(200).json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/doctor/consultations
 */
const getConsultations = controllerErrorHandler(async (req, res) => {

  const consultations =
    await doctorService.getConsultations(req.user.user_id);

  res.status(200).json({
    success: true,
    data: consultations,
    timestamp: new Date().toISOString()
  });
});

module.exports = {
  getDashboard,
  getWallet,
  getConsultations
};