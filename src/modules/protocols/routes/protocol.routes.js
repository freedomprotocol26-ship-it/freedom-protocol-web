const express = require('express');
const router = express.Router();

const protocolController = require('../controllers/protocol.controller');
const { authenticateToken } = require('../../../middleware/auth');

// Public / Read-only
router.get('/protocols/templates', protocolController.listProtocolTemplates);
router.get('/protocols/templates/:condition', protocolController.getProtocolTemplateByCondition);

// Admin / Doctor
router.get(
  '/protocols/templates/:templateId/versions',
  authenticateToken,
  protocolController.getProtocolVersionsForTemplate
);

router.get(
  '/protocols/versions/:versionId/preview',
  authenticateToken,
  protocolController.previewProtocolByVersion
);

// Patient / Doctor
router.get(
  '/patients/:patientId/protocol',
  authenticateToken,
  protocolController.getPatientProtocol
);

module.exports = router;
