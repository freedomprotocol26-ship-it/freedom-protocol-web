const runtimeService = require('../services/patientProtocolRuntime.service');

/**
 * ======================================
 * Start Protocol
 * ======================================
 */
exports.startProtocol = async (req, res) => {
  try {
    const protocolId = req.params.id;
    const userId = req.user.id;

    const result = await runtimeService.startProtocol(protocolId, userId);

    res.json({
      success: true,
      message: 'Protocol started successfully',
      data: result
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

/**
 * ======================================
 * Get Current Phase
 * ======================================
 */
exports.getCurrentPhase = async (req, res) => {
  try {
    const protocolId = req.params.id;
    const userId = req.user.id;

    const result = await runtimeService.getCurrentPhase(protocolId, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};
