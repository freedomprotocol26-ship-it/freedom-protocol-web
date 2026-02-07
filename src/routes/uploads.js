/**
 * Freedom Protocol - Upload Routes
 */

const express = require('express');
const router = express.Router();

const uploadController = require('../controllers/upload.controller');
const { authenticateJWT } = require('../middleware/auth');
const {
  authorizeRole,
  authorizeDoctorPatient,
  subscriptionGate
} = require('../middleware/role.middleware');

/**
 * Patient uploads file
 */
router.post(
  '/uploads',
  authenticateJWT,
  authorizeRole(['patient']),
  subscriptionGate(),
  uploadController.createUpload
);

/**
 * Get patient uploads
 */
router.get(
  '/patients/:patientId/uploads',
  authenticateJWT,
  authorizeRole(['patient', 'doctor']),
  authorizeDoctorPatient(),
  uploadController.getPatientUploads
);

/**
 * Doctor reviews AI interpretation
 */
router.post(
  '/uploads/:uploadId/review',
  authenticateJWT,
  authorizeRole(['doctor']),
  uploadController.reviewUpload
);

module.exports = router;
