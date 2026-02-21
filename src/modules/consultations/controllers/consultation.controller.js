const consultationService = require('../services/consultation.service');

/**
 * Create Consultation
 */
exports.createConsultation = async (req, res, next) => {
  try {

    const doctorId = req.user.id;
    const { patientId, protocolId, type, scheduledAt } = req.body;

    const result = await consultationService.createConsultation({
      doctorId,
      patientId,
      protocolId,
      type,
      scheduledAt
    });

    res.status(201).json({
      success: true,
      data: result
    });

  } catch (err) {
    next(err);
  }
};


/**
 * Start Consultation
 */
exports.startConsultation = async (req, res, next) => {
  try {

    const doctorId = req.user.id;
    const consultationId = req.params.id;

    const result = await consultationService.startConsultation(
      consultationId,
      doctorId
    );

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    next(err);
  }
};


/**
 * Generate Encounter Draft
 */
exports.generateEncounterDraft = async (req, res, next) => {
  try {

    const doctorId = req.user.id;
    const consultationId = req.params.id;

    const result = await consultationService.generateEncounterDraft(
      consultationId,
      doctorId
    );

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    next(err);
  }
};
