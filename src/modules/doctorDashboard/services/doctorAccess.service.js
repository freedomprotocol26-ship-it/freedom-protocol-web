const doctorRepository = require('../repositories/doctor.repository');

async function validateActiveDoctor(userId) {
  const doctor = await doctorRepository.getDoctorApprovalStatus(userId);

  if (!doctor) {
    return {
      allowed: false,
      message: 'Doctor not found',
    };
  }

  if (doctor.approval_status !== 'approved') {
    return {
      allowed: false,
      message: 'Doctor not approved',
    };
  }

  return { allowed: true };
}

module.exports = {
  validateActiveDoctor,
};
