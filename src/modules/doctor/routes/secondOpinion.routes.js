const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../../middleware/auth');
const requireDoctor = require('../../../middleware/requireDoctor');
const secondOpinionService = require('../../../services/secondOpinion.service');

/**
 * CREATE SECOND OPINION REQUEST
 */
router.post(
  '/second-opinion/request',
  authenticateToken,
  requireDoctor,
  async (req, res, next) => {
    try {
      const doctorId = req.user.id;

      const {
        patientProtocolId,
        transitionRequestId,
        reviewerDoctorId,
        requestReason
      } = req.body;

      const result = await secondOpinionService.createSecondOpinionRequest({
        patientProtocolId,
        transitionRequestId,
        requestedByUserId: doctorId,
        requestedByRole: 'doctor',
        primaryDoctorId: doctorId,
        reviewerDoctorId,
        facilityId: null,
        requestReason
      });

      res.json({ success: true, data: result });

    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET PENDING SECOND OPINIONS
 */
router.get(
  '/second-opinion/pending',
  authenticateToken,
  requireDoctor,
  async (req, res, next) => {
    try {
      const doctorId = req.user.id;
      const results = await secondOpinionService.getPendingReviewsForDoctor(doctorId);
      res.json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * REVIEW SECOND OPINION
 */
router.post(
  '/second-opinion/:id/review',
  authenticateToken,
  requireDoctor,
  async (req, res, next) => {
    try {
      const doctorId = req.user.id;
      const { id } = req.params;
      const { decision, notes } = req.body;

      const result = await secondOpinionService.reviewSecondOpinion({
        secondOpinionId: id,
        reviewerDoctorId: doctorId,
        decision,
        notes
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;