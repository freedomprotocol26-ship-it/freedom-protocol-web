const secondOpinionService = require('../../../services/secondOpinion.service');

/**
 * ======================================
 * LIST PENDING SECOND OPINIONS (Reviewer)
 * ======================================
 */
exports.listPending = async (req, res, next) => {
  try {
    const doctorId = req.user.id;

    const results = await secondOpinionService.getPendingReviewsForDoctor(
      doctorId
    );

    return res.json({
      success: true,
      data: results
    });

  } catch (err) {
    next(err);
  }
};


/**
 * ======================================
 * REVIEW SECOND OPINION
 * ======================================
 */
exports.review = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { id } = req.params;
    const { decision, notes } = req.body;

    if (!decision) {
      throw new Error('Decision is required');
    }

    const result = await secondOpinionService.reviewSecondOpinion({
      secondOpinionId: id,
      reviewerDoctorId: doctorId,
      decision,
      notes
    });

    return res.json({
      success: true,
      data: result
    });

  } catch (err) {
    next(err);
  }
};