const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../../middleware/auth');

const marketplaceConsultationController =
  require('../controllers/marketplaceConsultation.controller');

const payoutReleaseController =
  require('../controllers/payoutRelease.controller');

/**
 * ======================================
 * CONFIRM PAYMENT + LOCK CONSULTATION
 * ======================================
 */
router.post(
  '/consultations/confirm-payment',
  authenticateToken,
  marketplaceConsultationController.confirmPayment
);

/**
 * ======================================
 * RELEASE ELIGIBLE PAYOUTS
 * ======================================
 * (Admin/internal use)
 */
router.post(
  '/payouts/release',
  authenticateToken,
  payoutReleaseController.releasePayouts
);

module.exports = router;