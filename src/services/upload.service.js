/**
 * Freedom Protocol - Upload Service
 * Handles uploads, AI drafts, and doctor review workflow
 */

const BaseError = require('../errors/baseError');
const uploadRepository = require('../repositories/upload.repository');
const aiService = require('./ai.service');

/**
 * Patient uploads file
 * AI draft is generated and immediately visible to patient
 */
const createUpload = async (data, requester) => {

  if (requester.role !== 'patient') {
    throw new BaseError(
      'Only patients can upload files',
      403,
      'FORBIDDEN'
    );
  }

  // 1. Create upload record
  const upload = await uploadRepository.createUpload({
    patient_id: requester.user_id,
    doctor_id: requester.doctor_id,
    type: data.type,
    file_url: data.file_url,
    status: 'ai_generating'
  });

  // 2. Generate AI draft
  const aiDraft = await aiService.generateInterpretation({
    type: upload.type,
    file_url: upload.file_url
  });

  // 3. Save AI draft (patient can now see this)
  const updatedUpload = await uploadRepository.updateUpload(
    upload.id,
    {
      ai_draft: aiDraft,
      status: 'ai_generated'
    }
  );

  return updatedUpload;
};

/**
 * Get patient uploads
 * Patient sees AI draft or doctor-edited note if present
 */
const getPatientUploads = async (patientId) => {
  return uploadRepository.getUploadsByPatient(patientId);
};

/**
 * Doctor reviews and optionally edits AI interpretation
 * Overrides AI draft for patient
 */
const doctorReviewUpload = async (uploadId, doctorNote) => {

  if (!doctorNote) {
    throw new BaseError(
      'Doctor note is required',
      400,
      'MISSING_DOCTOR_NOTE'
    );
  }

  return uploadRepository.updateUpload(uploadId, {
    doctor_note: doctorNote,
    status: 'approved'
  });
};

module.exports = {
  createUpload,
  getPatientUploads,
  doctorReviewUpload
};
