const protocolTemplateRepository = require('../repositories/protocolTemplate.repository');
const protocolVersionRepository = require('../repositories/protocolVersion.repository');

const listProtocolTemplates = async () => {
  return await protocolTemplateRepository.listTemplates();
};

const getProtocolTemplateByCondition = async (condition) => {
  const template = await protocolTemplateRepository.getTemplateByCondition(condition);
  if (!template) {
    throw new Error(`Protocol template not found for condition: ${condition}`);
  }
  return template;
};

const getProtocolTemplateById = async (templateId) => {
  const template = await protocolTemplateRepository.getTemplateById(templateId);
  if (!template) {
    throw new Error(`Protocol template not found: ${templateId}`);
  }
  return template;
};

const getLatestProtocolVersion = async (templateId) => {
  const template = await protocolTemplateRepository.getTemplateById(templateId);
  if (!template) {
    throw new Error(`Protocol template not found: ${templateId}`);
  }
  
  const version = await protocolVersionRepository.getLatestVersionByTemplateId(templateId);
  if (!version) {
    throw new Error(`No versions found for template: ${templateId}`);
  }
  
  return version;
};

const getAllProtocolVersions = async (templateId) => {
  const template = await protocolTemplateRepository.getTemplateById(templateId);
  if (!template) {
    throw new Error(`Protocol template not found: ${templateId}`);
  }
  
  return await protocolVersionRepository.getVersionsByTemplateId(templateId);
};

module.exports = {
  listProtocolTemplates,
  getProtocolTemplateByCondition,
  getProtocolTemplateById,
  getLatestProtocolVersion,
  getAllProtocolVersions
};