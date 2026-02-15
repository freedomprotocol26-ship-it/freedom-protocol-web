const adminRepository = require('../repositories/admin.repository');

async function approveDoctor(doctorId) {
  const updated = await adminRepository.approveDoctor(doctorId);

  if (!updated) {
    return {
      success: false,
      message: 'Doctor not found or invalid role',
    };
  }

  return {
    success: true,
    message: 'Doctor approved successfully',
    data: updated,
  };
}

module.exports = {
  approveDoctor,
};
