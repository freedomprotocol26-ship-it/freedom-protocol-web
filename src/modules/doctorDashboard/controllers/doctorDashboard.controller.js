const doctorDashboardService = require('../services/doctorDashboard.service');
const doctorAccessService = require('../services/doctorAccess.service');

/**
 * GET Dashboard Stats
 */
exports.getDoctorStats = async (req, res, next) => {
  try {
    const doctorId = req.user.id;

    const access = await doctorAccessService.validateActiveDoctor(doctorId);
    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: access.message,
      });
    }

    const data = await doctorDashboardService.getDoctorStats(doctorId);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET All Patients
 */
exports.getDoctorPatients = async (req, res, next) => {
  try {
    const doctorId = req.user.id;

    const access = await doctorAccessService.validateActiveDoctor(doctorId);
    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: access.message,
      });
    }

    const data = await doctorDashboardService.getDoctorPatients(doctorId);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET Single Patient
 */
exports.getDoctorPatientById = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { patientId } = req.params;

    const access = await doctorAccessService.validateActiveDoctor(doctorId);
    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: access.message,
      });
    }

    const data = await doctorDashboardService.getDoctorPatientById(
      doctorId,
      patientId
    );

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * SEARCH Patients
 */
exports.searchDoctorPatients = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { q } = req.query;

    const access = await doctorAccessService.validateActiveDoctor(doctorId);
    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: access.message,
      });
    }

    const data = await doctorDashboardService.searchDoctorPatients(
      doctorId,
      q
    );

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
