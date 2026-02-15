const doctorDashboardRepository = require('../repositories/doctorDashboard.repository');

/**
 * Get doctor dashboard statistics
 */
exports.getDoctorStats = async (doctorId) => {
  return await doctorDashboardRepository.getDoctorStats(doctorId);
};

/**
 * Get all patients under doctor
 */
exports.getDoctorPatients = async (doctorId) => {
  return await doctorDashboardRepository.getDoctorPatients(doctorId);
};

/**
 * Get single patient
 */
exports.getDoctorPatientById = async (doctorId, patientId) => {
  return await doctorDashboardRepository.getDoctorPatientById(
    doctorId,
    patientId
  );
};

/**
 * Search patients
 */
exports.searchDoctorPatients = async (doctorId, searchTerm) => {
  return await doctorDashboardRepository.searchDoctorPatients(
    doctorId,
    searchTerm
  );
};
