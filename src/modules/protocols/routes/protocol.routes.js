const express = require('express');
const router = express.Router();

const protocolController = require('../controllers/protocol.controller');
const patientProtocolController = require('../controllers/patientProtocol.controller');
const doctorOverrideController = require('../controllers/doctorOverride.controller');

const { authenticateToken } = require('../../../middleware/auth');

/*
|--------------------------------------------------------------------------
| PROTOCOL TEMPLATES
|--------------------------------------------------------------------------
*/

router.get('/protocols/templates', protocolController.listProtocolTemplates);

router.get(
  '/protocols/templates/:condition',
  protocolController.getProtocolTemplateByCondition
);

/*
|--------------------------------------------------------------------------
| TEMPLATE VERSIONS
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| PATIENT PROTOCOL
|--------------------------------------------------------------------------
*/

router.get(
  '/patients/:patientId/protocol',
  authenticateToken,
  protocolController.getPatientProtocol
);

router.post(
  '/patients/:patientId/protocol',
  authenticateToken,
  patientProtocolController.assignProtocolToPatient
);

/*
|--------------------------------------------------------------------------
| DOCTOR OVERRIDES
|--------------------------------------------------------------------------
*/

router.post(
  '/protocols/overrides',
  authenticateToken,
  doctorOverrideController.createOverride
);

router.get(
  '/patients/:patientId/protocol/overrides',
  authenticateToken,
  doctorOverrideController.getOverridesForPatient
);

module.exports = router;
