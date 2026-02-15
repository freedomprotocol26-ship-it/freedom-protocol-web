const patientProtocolService = require('../services/patientProtocol.service');

/**
 * POST /patients/:patientId/assign-protocol
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
