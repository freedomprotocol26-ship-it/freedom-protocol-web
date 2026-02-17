const runtimeService = require('../services/patientProtocolRuntime.service');

/**
 * Start Protocol
 */
exports.startProtocol = async (req, res, next) => {
  try {
    const protocolId = req.params.id;
    const userId = req.user.id;

    const result = await runtimeService.startProtocol(protocolId, userId);

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    next(err);
  }
};


/**
 * Get Current Phase
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
 * Advance Phase
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
 * Submit Daily Report
 */
exports.submitDailyReport = async (req, res, next) => {
  try {
    const protocolId = req.params.id;
    const userId = req.user.id;

    // ✅ Now includes fastingGlucose
    const { reportText, fastingGlucose } = req.body;

    const result = await runtimeService.submitDailyReport(
      protocolId,
      userId,
      reportText,
      fastingGlucose
    );

    res.status(201).json({
      success: true,
      data: result
    });

  } catch (err) {
    next(err);
  }
};
