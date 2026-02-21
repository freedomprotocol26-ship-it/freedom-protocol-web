const phaseTransitionService = require('../services/phaseTransition.service');

/**
 * ======================================
 * LIST PENDING TRANSITIONS
 * ======================================
 */
exports.listPending = async (req, res, next) => {
  try {
    const doctorId = req.user.id;

    const results = await phaseTransitionService.listPendingTransitions(
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


/**
 * ======================================
 * REQUEST TRANSITION
 * ======================================
 */
exports.requestTransition = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { patientProtocolId, toPhaseId, reason } = req.body;

    if (!patientProtocolId || !toPhaseId) {
      throw new Error('patientProtocolId and toPhaseId are required');
    }

    const result = await phaseTransitionService.requestTransition({
      patientProtocolId,
      toPhaseId,
      reason,
      doctorId
    });

    return res.json({
      success: true,
      data: result
    });

  } catch (err) {
    next(err);
  }
};


/**
 * ======================================
 * APPROVE TRANSITION
 * ======================================
 */
exports.approve = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { id } = req.params;

    const result = await phaseTransitionService.approveTransition(
      id,
      doctorId
    );

    return res.json({
      success: true,
      data: result
    });

  } catch (err) {
    next(err);
  }
};


/**
 * ======================================
 * REJECT TRANSITION
 * ======================================
 */
exports.reject = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { id } = req.params;

    const result = await phaseTransitionService.rejectTransition(
      id,
      doctorId
    );

    return res.json({
      success: true,
      data: result
    });

  } catch (err) {
    next(err);
  }
};