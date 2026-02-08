const express = require('express');
const router = express.Router();

/* Existing domain routes */
const authRoutes = require('./auth');
const doctorRoutes = require('./doctor');
const patientRoutes = require('./patient');
const subscriptionRoutes = require('../modules/subscriptions/subscription.routes');

/* Payment Domain */
const paymentRoutes = require('../modules/payments/payment.routes');

/* Mount routes */
router.use('/auth', authRoutes);
router.use('/doctors', doctorRoutes);
router.use('/patients', patientRoutes);
router.use('/subscriptions', subscriptionRoutes);

/* Payments */
router.use('/payments', paymentRoutes);

module.exports = router;
