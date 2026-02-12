const doctorOverrideService = require('../services/doctorOverride.service');

const createOverride = async (req, res) => {
  try {
    const doctorId = req.user.id;

    const {
      patientId,
      protocolVersionId,
      protocolPhaseId,
      protocolActionId,
      overrideType,
      overridePayload,
      reason
    } = req.body;

    const override = await doctorOverrideService.createDoctorOverride({
      doctorId,
      patientId,
      protocolVersionId,
      protocolPhaseId,
      protocolActionId,
      overrideType,
      overridePayload,
      reason
    });

    return res.status(201).json(override);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const getOverridesForPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    const overrides =
      await doctorOverrideService.getDoctorOverridesForPatient(patientId);

    return res.status(200).json(overrides);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createOverride,
  getOverridesForPatient
};
