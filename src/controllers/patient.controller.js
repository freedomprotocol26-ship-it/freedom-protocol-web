const bcrypt = require("bcrypt");
const pool = require("../db");

exports.createPatient = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ error: "Only doctors can create patients" });
    }

    const { email, temporaryPassword } = req.body;

    const hashed = await bcrypt.hash(temporaryPassword, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1,$2,'patient')
       RETURNING id,email,role`,
      [email, hashed]
    );

    res.status(201).json({
      success: true,
      patient: result.rows[0]
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }

    res.status(500).json({ error: err.message });
  }
};
