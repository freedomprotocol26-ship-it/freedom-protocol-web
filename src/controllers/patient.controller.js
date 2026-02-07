const patientService = require('../services/patient.service');

function getUser(req) {
  return {
    userId: req.user?.userId,
    role: req.user?.role
  };
}

function handleError(res, error) {
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Server error'
  });
}

async function createPatient(req, res) {
  try {
    const patient = await patientService.createPatient(getUser(req), req.body);
    res.status(201).json({
      success: true,
      data: patient
    });
  } catch (err) {
    handleError(res, err);
  }
}

async function listPatients(req, res) {
  try {
    const patients = await patientService.listPatients(getUser(req));
    res.json({
      success: true,
      data: patients
    });
  } catch (err) {
    handleError(res, err);
  }
}

async function getPatientById(req, res) {
  try {
    const patient = await patientService.getPatientById(
      getUser(req),
      req.params.id
    );
    res.json({
      success: true,
      data: patient
    });
  } catch (err) {
    handleError(res, err);
  }
}

async function updatePatient(req, res) {
  try {
    const patient = await patientService.updatePatient(
      getUser(req),
      req.params.id,
      req.body
    );
    res.json({
      success: true,
      data: patient
    });
  } catch (err) {
    handleError(res, err);
  }
}

async function deletePatient(req, res) {
  try {
    const patient = await patientService.deletePatient(
      getUser(req),
      req.params.id
    );
    res.json({
      success: true,
      data: patient
    });
  } catch (err) {
    handleError(res, err);
  }
}

async function getMe(req, res) {
  try {
    const patient = await patientService.getMe(getUser(req));
    res.json({
      success: true,
      data: patient
    });
  } catch (err) {
    handleError(res, err);
  }
}

async function updateMe(req, res) {
  try {
    const patient = await patientService.updateMe(getUser(req), req.body);
    res.json({
      success: true,
      data: patient
    });
  } catch (err) {
    handleError(res, err);
  }
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
