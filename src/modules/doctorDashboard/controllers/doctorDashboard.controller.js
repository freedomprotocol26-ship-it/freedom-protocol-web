const doctorDashboardService = require('../services/doctorDashboard.service');

const getDashboard = async (req, res) => {
  try {
    const doctorId = req.user.id;

    const data = await doctorDashboardService.getDashboard(doctorId);

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

const getPatients = async (req, res) => {
  try {
    const doctorId = req.user.id;

    const patients = await doctorDashboardService.getPatients(doctorId);

    return res.status(200).json({
      success: true,
      data: patients
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getDashboard,
  getPatients
};
