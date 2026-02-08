const express = require("express");
const pool = require("./db");

const authRoutes = require("./routes/auth");
const patientRoutes = require("./routes/patient");
const subscriptionRoutes = require("./modules/subscriptions/subscription.routes");
const paymentRoutes = require("./modules/payments/payment.routes");
const facilityRoutes = require("./modules/facilities/facility.routes");

const app = express();
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/patients", patientRoutes);
app.use("/subscriptions", subscriptionRoutes);
app.use("/payments", paymentRoutes);
app.use("/facilities", facilityRoutes);

// Health check
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
