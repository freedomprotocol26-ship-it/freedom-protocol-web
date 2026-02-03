const { pool } = require("../db");

module.exports = async function requireDoctor(req, res, next) {
  try {
    if (!req.user || req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Doctor access required",
      });
    }

    const result = await pool.query(
      "SELECT status FROM doctors WHERE user_id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Doctor profile not approved",
      });
    }

    if (result.rows[0].status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Doctor is not active",
      });
    }

    next();
  } catch (err) {
    console.error("requireDoctor error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
