/**
 * Freedom Protocol - Auth Routes
 */

const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

/**
 * Public Routes
 */

// Doctor application
router.post("/apply-doctor", authController.applyDoctor);

// Login (Doctor or Patient)
router.post("/login", authController.login);

module.exports = router;


