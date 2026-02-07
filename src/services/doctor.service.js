/**
 * Freedom Protocol - Doctor Service
 * Business logic for doctor operations
 */

const BaseError = require('../errors/baseError');
const doctorRepository = require('../repositories/doctor.repository');
const earningsRepository = require('../repositories/earnings.repository');

/**
 * Get doctor dashboard
 */
const getDashboard = async (doctorUserId) => {

  const doctor = await doctorRepository.getDoctorByUserId(doctorUserId);

  if (!doctor) {
    throw new BaseError('Doctor profile not found', 404, 'NOT_FOUND');
  }

  const totalEarnings =
    await earningsRepository.getDoctorTotalEarnings(doctor.id);

  const totalConsultations =
    await doctorRepository.getDoctorConsultationCount(doctor.id);

  return {
    doctor,
    stats: {
      totalEarnings,
      totalConsultations
    }
  };
};

/**
 * Get doctor wallet
 */
const getWallet = async (doctorUserId) => {

  const doctor = await doctorRepository.getDoctorByUserId(doctorUserId);

  if (!doctor) {
    throw new BaseError('Doctor profile not found', 404, 'NOT_FOUND');
  }

  const balance =
    await earningsRepository.getDoctorTotalEarnings(doctor.id);

  const transactions =
    await earningsRepository.getDoctorTransactions(doctor.id);

  return {
    doctorId: doctor.id,
    balance,
    transactions
  };
};

module.exports = {
  getDashboard,
  getWallet
};
