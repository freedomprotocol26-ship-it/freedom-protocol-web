const patientProtocolService = require('../services/patientProtocol.service');

const assignProtocolToPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { templateId, versionId } = req.body;
    const { role, id: doctorId } = req.user;

    // Only doctors can assign protocols
    if (role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can assign protocols' });
    }

    // Basic validation
    if (!templateId) {
      return res.status(400).json({ error: 'templateId is required' });
    }

    const assignment = await patientProtocolService.assignProtocolToPatient({
      patientId,
      templateId,
      versionId,
      assignedBy: doctorId
    });

    return res.status(201).json(assignment);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  assignProtocolToPatient
};
