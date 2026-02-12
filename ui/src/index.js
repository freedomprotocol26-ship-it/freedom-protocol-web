require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");

// Route imports
const authRoutes = require("./routes/auth");
const patientRoutes = require("./routes/patient");
const subscriptionRoutes = require("./modules/subscriptions/subscription.routes");
const paymentRoutes = require("./modules/payments/payment.routes");
const facilityRoutes = require("./modules/facilities/facility.routes");
const protocolRoutes = require("./modules/protocols/routes/protocol.routes");
const doctorDashboardRoutes = require("./modules/doctorDashboard/routes/doctorDashboard.routes");
const adminRoutes = require("./routes/admin");

const app = express();

// Enable CORS
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}));

app.use(express.json());

/*
|--------------------------------------------------------------------------
| ROUTES
|--------------------------------------------------------------------------
*/

app.use("/auth", authRoutes);
app.use("/patients", patientRoutes);
app.use("/subscriptions", subscriptionRoutes);
app.use("/payments", paymentRoutes);
app.use("/facilities", facilityRoutes);
app.use("/admin", adminRoutes);
app.use("/", protocolRoutes);
app.use("/", doctorDashboardRoutes);

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("API running on", PORT);
});
