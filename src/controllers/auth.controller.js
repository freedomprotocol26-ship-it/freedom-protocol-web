const bcrypt = require("bcrypt");
const pool = require("../db");

exports.registerDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1,$2,'doctor')
       RETURNING id,email,role`,
      [email, hashed]
    );

    res.status(201).json({
      success: true,
      user: result.rows[0]
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }

    res.status(500).json({ error: err.message });
  }
};
