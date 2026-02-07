const authRoutes = require("./routes/auth");
const express = require("express");
const pool = require("./db");
const patientRoutes = require("./routes/patient");

const app = express();
app.use(express.json());
app.use("/patients", patientRoutes);
app.use("/auth", authRoutes);
const subscriptionRoutes = require("./modules/subscriptions/subscription.routes");
app.use("/subscriptions", subscriptionRoutes);



app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API running on", PORT));
