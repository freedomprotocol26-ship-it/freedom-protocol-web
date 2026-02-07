const patientService = require('./patient.service');

function getUserFromRequest(req) {
  return {
    userId: req.user?.userId,
    role: req.user?.role
  };
}

function handleError(res, error) {
  const status = error.status || 500;
  res.status(status).json({
    success: false,
    error: error.message || 'Server error'
  });
}

async function createPatient(req, res) {
  try {
    const patient = await patientService.createPatient(getUserFromRequest(req), req.body);
    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    handleError(res, error);
  }
}

async function listPatients(req, res) {
  try {
    const patients = await patientService.listPatients(getUserFromRequest(req));
    res.json({ success: true, data: patients });
  } catch (error) {
    handleError(res, error);
  }
}

async function getPatientById(req, res) {
  try {
    const patient = await patientService.getPatientById(
      getUserFromRequest(req),
      req.params.id
    );
    res.json({ success: true, data: patient });
  } catch (error) {
    handleError(res, error);
  }
}

async function updatePatient(req, res) {
  try {
    const patient = await patientService.updatePatient(
      getUserFromRequest(req),
      req.params.id,
      req.body
    );
    res.json({ success: true, data: patient });
  } catch (error) {
    handleError(res, error);
  }
}

async function deletePatient(req, res) {
  try {
    const patient = await patientService.deletePatient(
      getUserFromRequest(req),
      req.params.id
    );
    res.json({ success: true, data: patient });
  } catch (error) {
    handleError(res, error);
  }
}

async function getMe(req, res) {
  try {
    const patient = await patientService.getMe(getUserFromRequest(req));
    res.json({ success: true, data: patient });
  } catch (error) {
    handleError(res, error);
  }
}

async function updateMe(req, res) {
  try {
    const patient = await patientService.updateMe(getUserFromRequest(req), req.body);
    res.json({ success: true, data: patient });
  } catch (error) {
    handleError(res, error);
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