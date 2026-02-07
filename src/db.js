require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.query("SELECT 1")
  .then(() => console.log("Connected to Supabase"))
  .catch(err => console.error("DB connection error:", err));

module.exports = pool;
