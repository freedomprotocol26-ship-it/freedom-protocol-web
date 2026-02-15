const {
  getPatientsByDoctorId,
} = require('../repositories/patients.repository');

async function fetchDoctorPatients(doctorId) {
  if (!doctorId) {
    throw new Error('Doctor ID is required');
  }

  const patients = await getPatientsByDoctorId(doctorId);
  return patients;
}

module.exports = {
  fetchDoctorPatients,
};
