const doctorOverrideRepository = require('../repositories/doctorOverride.repository');
const protocolVersionRepository = require('../repositories/protocolVersion.repository');
const protocolPhaseRepository = require('../repositories/protocolPhase.repository');
const protocolActionRepository = require('../repositories/protocolAction.repository');

const createDoctorOverride = async ({
  doctorId,
  patientId,
  protocolVersionId,
  protocolPhaseId,
  protocolActionId,
  overrideType,
  overridePayload,
  reason
}) => {
  if (protocolVersionId) {
    const version = await protocolVersionRepository.getVersionById(protocolVersionId);
    if (!version) {
      throw new Error(`Protocol version not found: ${protocolVersionId}`);
    }
  }

  if (protocolPhaseId) {
    const phase = await protocolPhaseRepository.getPhaseById(protocolPhaseId);
    if (!phase) {
      throw new Error(`Protocol phase not found: ${protocolPhaseId}`);
    }
  }

  if (protocolActionId) {
    const action = await protocolActionRepository.getActionById(protocolActionId);
    if (!action) {
      throw new Error(`Protocol action not found: ${protocolActionId}`);
    }
  }

  if (!protocolVersionId && !protocolPhaseId && !protocolActionId) {
    throw new Error('Override must target a version, phase, or action');
  }

  return doctorOverrideRepository.createOverride({
    doctor_id: doctorId,
    patient_id: patientId,
    protocol_version_id: protocolVersionId,
    protocol_phase_id: protocolPhaseId,
    protocol_action_id: protocolActionId,
    override_type: overrideType,
    override_payload: overridePayload,
    reason
  });
};

const getDoctorOverridesForPatient = async (patientId) => {
  return doctorOverrideRepository.getOverridesForPatient(patientId);
};

module.exports = {
  createDoctorOverride,
  getDoctorOverridesForPatient
};
