/**
 * Freedom Protocol - Report Service (Simplified)
 * Role-based report access with direct repository calls
 */

const BaseError = require('../errors/baseError');
const reportRepository = require('../repositories/report.repository');

/**
 * Get report based on user role
 * 
 * @param {Object} user - User object from req.user
 * @param {number} user.user_id - User ID
 * @param {string} user.role - User role
 * @param {number} user.facility_id - Facility ID (nullable)
 * @param {number} user.doctor_id - Doctor ID (nullable)
 * @returns {Promise<Object>} Report data from repository
 */
const getMyReport = async (user) => {
  try {
    switch (user.role) {
      case 'patient':
        // Patient accesses their own report
        return await getPatientReport(user.user_id);
      
      case 'doctor':
        // Doctor accesses their doctor report
        if (!user.doctor_id) {
          throw new BaseError(
            'Doctor ID not found',
            400,
            'MISSING_DOCTOR_ID'
          );
        }
        return await getDoctorReport(user.doctor_id);
      
      case 'partner':
      case 'facility_admin':
        // Partner/facility admin accesses facility report
        if (!user.facility_id) {
          throw new BaseError(
            'Facility ID not found',
            400,
            'MISSING_FACILITY_ID'
          );
        }
        return await getFacilityReport(user.facility_id);
      
      case 'admin':
        // Admin accesses platform-wide report
        return await getAdminReport();
      
      default:
        throw new BaseError(
          `Invalid role for report access: ${user.role}`,
          403,
          'INVALID_ROLE'
        );
    }
  } catch (error) {
    if (error instanceof BaseError) {
      throw error;
    }
    
    console.error('Error in getMyReport service:', error);
    throw new BaseError(
      'Failed to generate report',
      500,
      'REPORT_ERROR'
    );
  }
};

/**
 * Get patient report
 * 
 * @param {number} patientId - Patient ID
 * @returns {Promise<Object>} Patient report from repository
 */
const getPatientReport = async (patientId) => {
  try {
    const report = await reportRepository.getPatientReport(patientId);
    
    if (!report) {
      throw new BaseError(
        'Patient report not found',
        404,
        'REPORT_NOT_FOUND'
      );
    }
    
    return report;
  } catch (error) {
    if (error instanceof BaseError) {
      throw error;
    }
    
    console.error('Error in getPatientReport service:', error);
    throw new BaseError(
      'Failed to retrieve patient report',
      500,
      'PATIENT_REPORT_ERROR'
    );
  }
};

/**
 * Get doctor report
 * 
 * @param {number} doctorId - Doctor ID
 * @returns {Promise<Object>} Doctor report from repository
 */
const getDoctorReport = async (doctorId) => {
  try {
    const report = await reportRepository.getDoctorReport(doctorId);
    
    if (!report) {
      throw new BaseError(
        'Doctor report not found',
        404,
        'REPORT_NOT_FOUND'
      );
    }
    
    return report;
  } catch (error) {
    if (error instanceof BaseError) {
      throw error;
    }
    
    console.error('Error in getDoctorReport service:', error);
    throw new BaseError(
      'Failed to retrieve doctor report',
      500,
      'DOCTOR_REPORT_ERROR'
    );
  }
};

/**
 * Get facility report
 * 
 * @param {number} facilityId - Facility ID
 * @returns {Promise<Object>} Facility report from repository
 */
const getFacilityReport = async (facilityId) => {
  try {
    const report = await reportRepository.getFacilityReport(facilityId);
    
    if (!report) {
      throw new BaseError(
        'Facility report not found',
        404,
        'REPORT_NOT_FOUND'
      );
    }
    
    return report;
  } catch (error) {
    if (error instanceof BaseError) {
      throw error;
    }
    
    console.error('Error in getFacilityReport service:', error);
    throw new BaseError(
      'Failed to retrieve facility report',
      500,
      'FACILITY_REPORT_ERROR'
    );
  }
};

/**
 * Get admin report
 * 
 * @returns {Promise<Object>} Admin report from repository
 */
const getAdminReport = async () => {
  try {
    const report = await reportRepository.getAdminReport();
    
    if (!report) {
      throw new BaseError(
        'Admin report not found',
        404,
        'REPORT_NOT_FOUND'
      );
    }
    
    return report;
  } catch (error) {
    if (error instanceof BaseError) {
      throw error;
    }
    
    console.error('Error in getAdminReport service:', error);
    throw new BaseError(
      'Failed to retrieve admin report',
      500,
      'ADMIN_REPORT_ERROR'
    );
  }
};

module.exports = {
  getMyReport,
  getPatientReport,
  getDoctorReport,
  getFacilityReport,
  getAdminReport
};