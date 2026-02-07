/**
 * Freedom Protocol - Upload Controller
 */

const uploadService = require('../services/upload.service');
const controllerErrorHandler = require('./controllerErrorHandler');

/**
 * POST /api/uploads
 */
const createUpload = controllerErrorHandler(async (req, res) => {

  const upload = await uploadService.createUpload(
    req.body,
    req.user
  );

  res.status(201).json({
    success: true,
    data: { upload },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/patients/:patientId/uploads
 */
const getPatientUploads = controllerErrorHandler(async (req, res) => {

  const uploads = await uploadService.getPatientUploads(
    req.params.patientId
  );

  res.status(200).json({
    success: true,
    data: { uploads },
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/uploads/:uploadId/review
 */
const reviewUpload = controllerErrorHandler(async (req, res) => {

  const upload = await uploadService.doctorReviewUpload(
    req.params.uploadId,
    req.body.doctor_note
  );

  res.status(200).json({
    success: true,
    data: { upload },
    timestamp: new Date().toISOString()
  });
});

module.exports = {
  createUpload,
  getPatientUploads,
  reviewUpload
};
