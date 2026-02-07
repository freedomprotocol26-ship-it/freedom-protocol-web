const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const patientController = require("../controllers/patient.controller");

router.post("/", auth, patientController.createPatient);

module.exports = router;
