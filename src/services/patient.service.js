/**
 * Freedom Protocol - Patient Service
 * Business logic for patient operations
 */

const patientRepository = require('../repositories/patient.repository');

/**
 * Create standardized service error
 */
function createServiceError(message, status) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

/**
 * Ensure user role exists
 */
function ensureRole(role) {
  if (!role) {
    createServiceError('User role is required', 403);
  }
}

/**
 * Create patient (Doctor only)
 */
async function createPatient(user, payload) {
  ensureRole(user.role);

  if (user.role !== 'doctor') {
    createServiceError('Only doctors can create patients', 403);
  }

  const existingPatient = await patientRepository.findPatientByEmail(payload.email);
  if (existingPatient) {
    createServiceError('Email already exists', 409);
  }

  const patientData = {
    doctor_id: user.userId,
    first_name: payload.first_name,
    last_name: payload.last_name,
    email: payload.email,
    phone: payload.phone,
    gender: payload.gender,
    dob: payload.dob,
    subscription_status: payload.subscription_status || 'trial'
  };

  return patientRepository.createPatient(patientData);
}

/**
 * List patients
 */
async function listPatients(user) {
  ensureRole(user.role);

  if (user.role === 'admin') {
    return patientRepository.listPatients();
  }

  if (user.role === 'doctor') {
    return patientRepository.listPatientsByDoctorId(user.userId);
  }

  createServiceError('Patients are not allowed to list patients', 403);
}

/**
 * Get patient by ID
 */
async function getPatientById(user, patientId) {
  ensureRole(user.role);

  const patient = await patientRepository.findPatientById(patientId);

  if (!patient) {
    createServiceError('Patient not found', 404);
  }

  if (user.role === 'admin') {
    return patient;
  }

  if (user.role === 'doctor') {
    if (patient.doctor_id !== user.userId) {
      createServiceError('Access denied to patient', 403);
    }
    return patient;
  }

  if (user.role === 'patient') {
    if (patient.id !== user.userId) {
      createServiceError('Access denied to patient', 403);
    }
    return patient;
  }

  createServiceError('Access denied', 403);
}

/**
 * Update patient
 */
async function updatePatient(user, patientId, updates) {
  ensureRole(user.role);

  const patient = await patientRepository.findPatientById(patientId);

  if (!patient) {
    createServiceError('Patient not found', 404);
  }

  if (user.role === 'doctor' && patient.doctor_id !== user.userId) {
    createServiceError('Access denied to patient', 403);
  }

  if (user.role === 'patient' && patient.id !== user.userId) {
    createServiceError('Access denied to patient', 403);
  }

  if (updates.email) {
    const existingPatient = await patientRepository.findPatientByEmail(updates.email);
    if (existingPatient && existingPatient.id !== patientId) {
      createServiceError('Email already exists', 409);
    }
  }

  return patientRepository.updatePatient(patientId, updates);
}

/**
 * Delete patient
 */
async function deletePatient(user, patientId) {
  ensureRole(user.role);

  const patient = await patientRepository.findPatientById(patientId);

  if (!patient) {
    createServiceError('Patient not found', 404);
  }

  if (user.role === 'doctor' && patient.doctor_id !== user.userId) {
    createServiceError('Access denied to patient', 403);
  }

  if (user.role !== 'admin' && user.role !== 'doctor') {
    createServiceError('Access denied', 403);
  }

  return patientRepository.deletePatient(patientId);
}

/**
 * Get own patient record
 */
async function getMe(user) {
  return getPatientById(user, user.userId);
}

/**
 * Update own patient record
 */
async function updateMe(user, updates) {
  return updatePatient(user, user.userId, updates);
}

module.exports = {
  createPatient,
  listPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getMe,
  updateMe
};
