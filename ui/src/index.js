const express = require("express");
const cors = require("cors");

const app = express();

// ✅ Enable CORS and JSON parsing
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}));
app.use(express.json());

// ✅ Simple login route
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  console.log("Login request body:", req.body);

  if (email === "admin@freedom.local" && password === "admin123") {
    return res.json({
      token: "fake-jwt-token",
      user: { email }
    });
  }

  res.status(401).json({ message: "Invalid credentials" });
});

app.listen(3000, () => {
  console.log("✅ Server running on port 3000");
});
