const db = require('../../../db');

/**
 * Get all patients assigned to a doctor
 */
const getDoctorPatients = async (doctorId) => {
  const query = `
    SELECT 
      p.id,
      p.first_name,
      p.last_name,
      (p.first_name || ' ' || p.last_name) as full_name,
      p.email,
      p.date_of_birth,
      p.gender,
      p.created_at,
      ppa.id as assignment_id,
      ppa.protocol_version_id,
      ppa.assigned_at,
      pv.version_number,
      pt.name as protocol_name,
      pt.condition
    FROM patients p
    INNER JOIN patient_protocol_assignments ppa 
      ON p.id = ppa.patient_id
    LEFT JOIN protocol_versions pv 
      ON ppa.protocol_version_id = pv.id
    LEFT JOIN protocol_templates pt 
      ON pv.template_id = pt.id
    WHERE ppa.assigned_by = $1
    ORDER BY p.created_at DESC
  `;

  const { rows } = await db.query(query, [doctorId]);
  return rows;
};

/**
 * Get single patient under doctor
 */
const getDoctorPatientById = async (doctorId, patientId) => {
  const query = `
    SELECT 
      p.id,
      p.first_name,
      p.last_name,
      (p.first_name || ' ' || p.last_name) as full_name,
      p.email,
      p.date_of_birth,
      p.gender,
      p.created_at,
      ppa.id as assignment_id,
      ppa.protocol_version_id,
      ppa.assigned_at,
      pv.version_number,
      pt.name as protocol_name,
      pt.condition
    FROM patients p
    INNER JOIN patient_protocol_assignments ppa 
      ON p.id = ppa.patient_id
    LEFT JOIN protocol_versions pv 
      ON ppa.protocol_version_id = pv.id
    LEFT JOIN protocol_templates pt 
      ON pv.template_id = pt.id
    WHERE ppa.assigned_by = $1 
      AND p.id = $2
  `;

  const { rows } = await db.query(query, [doctorId, patientId]);
  return rows[0];
};

/**
 * Doctor dashboard statistics
 */
const getDoctorStats = async (doctorId) => {
  const query = `
    SELECT 
      COUNT(DISTINCT p.id) as total_patients,
      COUNT(
        DISTINCT CASE 
          WHEN ppa.assigned_at >= NOW() - INTERVAL '30 days' 
          THEN p.id 
        END
      ) as new_patients_30d,
      COUNT(DISTINCT ppa.protocol_version_id) as active_protocols
    FROM patients p
    INNER JOIN patient_protocol_assignments ppa 
      ON p.id = ppa.patient_id
    WHERE ppa.assigned_by = $1
  `;

  const { rows } = await db.query(query, [doctorId]);
  return rows[0];
};

/**
 * Search patients under doctor
 */
const searchDoctorPatients = async (doctorId, searchTerm) => {
  const query = `
    SELECT 
      p.id,
      p.first_name,
      p.last_name,
      (p.first_name || ' ' || p.last_name) as full_name,
      p.email,
      p.date_of_birth,
      p.gender,
      p.created_at,
      ppa.id as assignment_id,
      ppa.protocol_version_id,
      ppa.assigned_at,
      pv.version_number,
      pt.name as protocol_name,
      pt.condition
    FROM patients p
    INNER JOIN patient_protocol_assignments ppa 
      ON p.id = ppa.patient_id
    LEFT JOIN protocol_versions pv 
      ON ppa.protocol_version_id = pv.id
    LEFT JOIN protocol_templates pt 
      ON pv.template_id = pt.id
    WHERE ppa.assigned_by = $1
      AND (
        p.first_name ILIKE $2 OR 
        p.last_name ILIKE $2 OR
        p.email ILIKE $2
      )
    ORDER BY p.created_at DESC
  `;

  const searchPattern = `%${searchTerm}%`;
  const { rows } = await db.query(query, [doctorId, searchPattern]);
  return rows;
};

module.exports = {
  getDoctorPatients,
  getDoctorPatientById,
  getDoctorStats,
  searchDoctorPatients
};
