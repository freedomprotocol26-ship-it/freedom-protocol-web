const { pool } = require('../db');

async function createPatient(patientData) {
  const {
    doctor_id,
    first_name,
    last_name,
    email,
    phone,
    gender,
    dob,
    subscription_status
  } = patientData;

  const result = await pool.query(
    `INSERT INTO patients (
      id,
      doctor_id,
      first_name,
      last_name,
      email,
      phone,
      gender,
      dob,
      subscription_status,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      $1,$2,$3,$4,$5,$6,$7,$8,NOW()
    )
    RETURNING
      id,
      doctor_id,
      first_name,
      last_name,
      email,
      phone,
      gender,
      dob,
      subscription_status,
      created_at`,
    [doctor_id, first_name, last_name, email, phone, gender, dob, subscription_status]
  );

  return result.rows[0];
}

async function findPatientByEmail(email) {
  const result = await pool.query(
    `SELECT
      id,
      doctor_id,
      first_name,
      last_name,
      email,
      phone,
      gender,
      dob,
      subscription_status,
      created_at
     FROM patients
     WHERE email=$1
     LIMIT 1`,
    [email]
  );

  return result.rows[0];
}

async function findPatientById(id) {
  const result = await pool.query(
    `SELECT
      id,
      doctor_id,
      first_name,
      last_name,
      email,
      phone,
      gender,
      dob,
      subscription_status,
      created_at
     FROM patients
     WHERE id=$1`,
    [id]
  );

  return result.rows[0];
}

async function listPatients() {
  const result = await pool.query(
    `SELECT
      id,
      doctor_id,
      first_name,
      last_name,
      email,
      phone,
      gender,
      dob,
      subscription_status,
      created_at
     FROM patients
     ORDER BY created_at DESC`
  );

  return result.rows;
}

async function listPatientsByDoctorId(doctorId) {
  const result = await pool.query(
    `SELECT
      id,
      doctor_id,
      first_name,
      last_name,
      email,
      phone,
      gender,
      dob,
      subscription_status,
      created_at
     FROM patients
     WHERE doctor_id=$1
     ORDER BY created_at DESC`,
    [doctorId]
  );

  return result.rows;
}

async function updatePatient(id, updates) {
  const {
    first_name,
    last_name,
    email,
    phone,
    gender,
    dob,
    subscription_status
  } = updates;

  const result = await pool.query(
    `UPDATE patients
     SET first_name=COALESCE($1,first_name),
         last_name=COALESCE($2,last_name),
         email=COALESCE($3,email),
         phone=COALESCE($4,phone),
         gender=COALESCE($5,gender),
         dob=COALESCE($6,dob),
         subscription_status=COALESCE($7,subscription_status)
     WHERE id=$8
     RETURNING
      id,
      doctor_id,
      first_name,
      last_name,
      email,
      phone,
      gender,
      dob,
      subscription_status,
      created_at`,
    [first_name, last_name, email, phone, gender, dob, subscription_status, id]
  );

  return result.rows[0];
}

async function deletePatient(id) {
  const result = await pool.query(
    'DELETE FROM patients WHERE id=$1 RETURNING id',
    [id]
  );

  return result.rows[0];
}

module.exports = {
  createPatient,
  findPatientByEmail,
  findPatientById,
  listPatients,
  listPatientsByDoctorId,
  updatePatient,
  deletePatient
};
