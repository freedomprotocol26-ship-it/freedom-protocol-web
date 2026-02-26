const aiOrchestrator = require('../services/aiOrchestrator.service');

/**
 * ======================================
 * GENERATE CONSULTATION AI SUMMARY
 * ======================================
 */
exports.generateSummary = async (req, res) => {
  try {
    const { consultationId } = req.body;

    if (!consultationId) {
      return res.status(400).json({
        success: false,
        error: 'consultationId required'
      });
    }

    const result =
      await aiOrchestrator.generateConsultationSummary(consultationId);

    return res.json({
      success: true,
      data: result
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
};


/**
 * ======================================
 * APPROVE AI SUMMARY
 * ======================================
 */
exports.approveSummary = async (req, res) => {
  try {
    const { consultationId } = req.body;

    if (!consultationId) {
      return res.status(400).json({
        success: false,
        error: 'consultationId required'
      });
    }

    const doctorId = req.user.id;

    const result =
      await aiOrchestrator.approveConsultationSummary(
        consultationId,
        doctorId
      );

    return res.json({
      success: true,
      data: result
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
};


/**
 * ======================================
 * GET APPROVED SUMMARY (PATIENT VIEW)
 * ======================================
 */
exports.getApprovedSummary = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const patientId = req.user.id;

    const result =
      await aiOrchestrator.getApprovedSummaryForPatient(
        consultationId,
        patientId
      );

    return res.json({
      success: true,
      data: result
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
};