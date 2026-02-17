const runtimeService = require('../services/patientProtocolRuntime.service');

/**
 * ======================================
 * START PROTOCOL
 * ======================================
 */
exports.startProtocol = async (req, res, next) => {
  try {
    const protocolId = req.params.id;

    const result = await runtimeService.startProtocol(protocolId);

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    next(err);
  }
};


/**
 * ======================================
 * GET CURRENT PHASE
 * ======================================
 */
exports.getCurrentPhase = async (req, res, next) => {
  try {
    const protocolId = req.params.id;
    const userId = req.user.id;

    const result = await runtimeService.getCurrentPhase(protocolId, userId);

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    next(err);
  }
};


/**
 * ======================================
 * ADVANCE PHASE (Manual Doctor Trigger)
 * ======================================
 */
exports.advancePhase = async (req, res, next) => {
  try {
    const protocolId = req.params.id;
    const userId = req.user.id;

    const result = await runtimeService.advancePhase(protocolId, userId);

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    next(err);
  }
};


/**
 * ======================================
 * POST /patients/me/protocols/:id/daily-report
 * ======================================
 */
exports.submitDailyReport = async (req, res, next) => {
  try {
    const protocolId = req.params.id;
    const userId = req.user.id;

    // ✅ Now supports structured glucose entry
    const { reportText, fastingGlucose } = req.body;

    const result = await runtimeService.submitDailyReport(
      protocolId,
      userId,
      reportText,
      fastingGlucose
    );

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    next(err);
  }
};
