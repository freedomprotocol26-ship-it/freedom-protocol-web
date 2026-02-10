const protocolTemplateService = require('../services/protocolTemplate.service');
const protocolAssemblyService = require('../services/protocolAssembly.service');
const { authenticateToken } = require('../../../middleware/auth');

const listProtocolTemplates = async (req, res) => {
  try {
    const templates = await protocolTemplateService.listProtocolTemplates();
    return res.status(200).json(templates);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('forbidden')) {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
};

const getProtocolTemplateByCondition = async (req, res) => {
  try {
    const { condition } = req.params;
    const template = await protocolTemplateService.getProtocolTemplateByCondition(condition);
    return res.status(200).json(template);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('forbidden')) {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
};

const getProtocolVersionsForTemplate = async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'admin' && role !== 'doctor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { templateId } = req.params;
    const versions = await protocolTemplateService.getAllProtocolVersions(templateId);
    return res.status(200).json(versions);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('forbidden')) {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
};

const previewProtocolByVersion = async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'admin' && role !== 'doctor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { versionId } = req.params;
    const protocol = await protocolAssemblyService.assembleProtocolByVersion({
      protocolVersionId: versionId,
      viewerRole: role
    });

    return res.status(200).json(protocol);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('forbidden')) {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
};

const getPatientProtocol = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { role, userId } = req.user;

    if (role === 'patient' && userId !== patientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const protocol = await protocolAssemblyService.assembleProtocolForPatient({
      patientId,
      viewerRole: role
    });

    return res.status(200).json(protocol);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('forbidden')) {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  listProtocolTemplates,
  getProtocolTemplateByCondition,
  getProtocolVersionsForTemplate,
  previewProtocolByVersion,
  getPatientProtocol
};
