const doctorIntelligenceService = require('../../../services/doctorIntelligence.service');

/**
 * ======================================
 * GET PRIORITISED PATIENT LIST
 * ======================================
 */
exports.getPriorityList = async (req, res, next) => {
  try {
    const doctorId = req.user.id;

    const results = await doctorIntelligenceService.getDoctorPriorityList(
      doctorId
    );

    return res.json({
      success: true,
      data: results
    });

  } catch (err) {
    next(err);
  }
};