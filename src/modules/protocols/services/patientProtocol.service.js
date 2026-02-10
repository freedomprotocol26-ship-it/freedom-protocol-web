const patientProtocolRepository = require('../repositories/patientProtocol.repository');
const protocolVersionRepository = require('../repositories/protocolVersion.repository');
const protocolTemplateRepository = require('../repositories/protocolTemplate.repository');

const assignProtocolToPatient = async ({ patientId, templateId, versionId, assignedBy }) => {
  const template = await protocolTemplateRepository.getTemplateById(templateId);
  if (!template) {
    throw new Error(`Protocol template not found: ${templateId}`);
  }

  let resolvedVersionId = versionId;
  
  if (!resolvedVersionId) {
    const latestVersion = await protocolVersionRepository.getLatestVersionByTemplateId(templateId);
    if (!latestVersion) {
      throw new Error(`No versions available for template: ${templateId}`);
    }
    resolvedVersionId = latestVersion.id;
  } else {
    const version = await protocolVersionRepository.getVersionById(resolvedVersionId);
    if (!version) {
      throw new Error(`Protocol version not found: ${resolvedVersionId}`);
    }
    if (version.template_id !== templateId) {
      throw new Error(`Version ${resolvedVersionId} does not belong to template ${templateId}`);
    }
  }

  return await patientProtocolRepository.assignProtocol({
    patient_id: patientId,
    protocol_version_id: resolvedVersionId,
    assigned_by: assignedBy
  });
};

const getPatientProtocol = async (patientId) => {
  const assignment = await patientProtocolRepository.getPatientProtocol(patientId);
  if (!assignment) {
    throw new Error(`No protocol assigned to patient: ${patientId}`);
  }
  return assignment;
};

const getPatientProtocolVersion = async (patientId) => {
  const assignment = await patientProtocolRepository.getPatientProtocol(patientId);
  if (!assignment) {
    throw new Error(`No protocol assigned to patient: ${patientId}`);
  }
  
  const version = await protocolVersionRepository.getVersionById(assignment.protocol_version_id);
  if (!version) {
    throw new Error(`Protocol version not found: ${assignment.protocol_version_id}`);
  }
  
  return version;
};

module.exports = {
  assignProtocolToPatient,
  getPatientProtocol,
  getPatientProtocolVersion
};