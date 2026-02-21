const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../../middleware/auth');
const requireSupervisoryDoctor = require('../../../middleware/requireSupervisoryDoctor');

const supervisoryReviewService = require('../../../services/supervisoryReview.service');

/**
 * ======================================
 * LIST ASSIGNED SUPERVISORY REVIEWS
 * ======================================
 */
router.get(
  '/supervisory/reviews',
  authenticateToken,
  requireSupervisoryDoctor,
  async (req, res, next) => {
    try {
      const reviews =
        await supervisoryReviewService.getPendingReviewsForSupervisor(
          req.user.id
        );

      res.json({
        success: true,
        data: reviews
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * ======================================
 * COMPLETE SUPERVISORY REVIEW
 * ======================================
 */
router.post(
  '/supervisory/reviews/:id/complete',
  authenticateToken,
  requireSupervisoryDoctor,
  async (req, res, next) => {
    try {
      const { decision, notes } = req.body;

      const result =
        await supervisoryReviewService.completeSupervisoryReview({
          reviewId: req.params.id,
          supervisorId: req.user.id,
          decision,
          notes
        });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;