require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const express = require("express");
const cors = require("cors");
const path = require("path");

const initDb = require("./db/init");
const authenticateToken = require("./middleware/authenticateToken");
const requireAdmin = require("./middleware/requireAdmin");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const doctorRoutes = require("./routes/doctor");
const episodeRoutes = require("./routes/episodes");
const telemedicineRoutes = require("./routes/telemedicine");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const publicPath = path.join(__dirname, "../public");
app.use(express.static(publicPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "login.html"));
});

app.use("/api", authRoutes);
app.use("/api/telemedicine", telemedicineRoutes);
app.use("/api/doctor", authenticateToken, doctorRoutes);
app.use("/api", episodeRoutes);
app.use("/api/admin", authenticateToken, requireAdmin, adminRoutes);

async function startServer() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

startServer();
