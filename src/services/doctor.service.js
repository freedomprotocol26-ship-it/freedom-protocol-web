/**
 * Freedom Protocol - Doctor Service
 * Business logic for doctor operations
 */

const BaseError = require('../errors/baseError');
const doctorRepository = require('../repositories/doctor.repository');
const earningsRepository = require('../repositories/earnings.repository');
const pool = require('../db');

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

/**
 * Get doctor's consultations
 */
const getConsultations = async (doctorUserId) => {

  const result = await pool.query(
    `
    SELECT 
      id,
      patient_id,
      consultation_type,
      booking_status,
      payment_status,
      scheduled_at,
      ai_summary_generated,
      ai_summary_approved
    FROM marketplace.consultations
    WHERE primary_doctor_id = $1
    ORDER BY scheduled_at DESC
    `,
    [doctorUserId]
  );

  return result.rows;
};

module.exports = {
  getDashboard,
  getWallet,
  getConsultations
};