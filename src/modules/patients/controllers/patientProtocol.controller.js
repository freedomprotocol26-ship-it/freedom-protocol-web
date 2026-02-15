const patientProtocolService = require('../services/patientProtocol.service');

/**
 * ======================================
 * POST /patients/:patientId/assign-protocol
 * ======================================
 */
exports.assignProtocol = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { patientId } = req.params;
    const { protocolVersionId } = req.body;

    if (!protocolVersionId) {
      return res.status(400).json({
        success: false,
        message: 'protocolVersionId is required'
      });
    }

    const assignment = await patientProtocolService.assignProtocolToPatient({
      doctorId,
      patientId,
      protocolVersionId
    });

    res.status(201).json({
      success: true,
      message: 'Protocol assigned successfully',
      data: assignment
    });

  } catch (err) {
    next(err);
  }
};


/**
 * ======================================
 * GET /patients/:patientId/protocols
 * (Doctor view)
 * ======================================
 */
exports.getPatientProtocols = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { patientId } = req.params;

    const protocols = await patientProtocolService.getProtocolsForPatient({
      doctorId,
      patientId
    });

    res.json({
      success: true,
      count: protocols.length,
      data: protocols
    });

  } catch (err) {
    next(err);
  }
};


/**
 * ======================================
 * GET /patients/me/protocols
 * (Patient self view)
 * ======================================
 */
exports.getMyProtocols = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const protocols = await patientProtocolService.getMyProtocols(userId);

    res.json({
      success: true,
      count: protocols.length,
      data: protocols
    });

  } catch (err) {
    next(err);
  }
};
