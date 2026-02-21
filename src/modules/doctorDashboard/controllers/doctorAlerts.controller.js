const doctorAlertsService = require('../services/doctorAlerts.service');

/**
 * GET DOCTOR ALERTS
 */
exports.getDoctorAlerts = async (req, res, next) => {
  try {
    const doctorId = req.user.id;

    const data = await doctorAlertsService.getDoctorAlerts(doctorId);

    res.json({
      success: true,
      data,
    });

  } catch (err) {
    next(err);
  }
};
