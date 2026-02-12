const doctorDashboardRepository = require('../repositories/doctorDashboard.repository');

const getDashboard = async (doctorId) => {
  const stats = await doctorDashboardRepository.getDoctorStats(doctorId);
  const patients = await doctorDashboardRepository.getDoctorPatients(doctorId);

  return {
    stats,
    patients
  };
};

const getPatients = async (doctorId) => {
  return doctorDashboardRepository.getDoctorPatients(doctorId);
};

module.exports = {
  getDashboard,
  getPatients
};
