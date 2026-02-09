const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const authenticateJWT = require('../../middleware/auth.middleware');

router.post('/initiate', authenticateJWT, paymentController.initiatePayment);
router.post('/confirm', authenticateJWT, paymentController.confirmPayment);

module.exports = router;
