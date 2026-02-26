const payoutReleaseService = require('../services/payoutRelease.service');

/**
 * ======================================
 * RELEASE ELIGIBLE PAYOUTS (ADMIN)
 * ======================================
 *
 * This endpoint:
 * - Releases payouts whose hold has expired
 * - Skips disputed consultations
 *
 * For now:
 * - Protected by authenticateToken
 * - Later we can restrict to admin role only
 */

exports.releasePayouts = async (req, res) => {
  try {
    const result = await payoutReleaseService.releaseEligiblePayouts();

    return res.json({
      success: true,
      data: result
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};