const pool = require("./index");

async function initDb() {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Database ready");
  } catch (err) {
    console.error("❌ Database initialization failed:", err);
    process.exit(1);
  }
}

module.exports = initDb;
