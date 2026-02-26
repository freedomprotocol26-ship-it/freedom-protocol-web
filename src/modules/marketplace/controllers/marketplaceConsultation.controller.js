const marketplaceConsultationService = require('../services/marketplaceConsultation.service');

/**
 * ======================================
 * CONFIRM PAYMENT + LOCK CONSULTATION
 * ======================================
 */
exports.confirmPayment = async (req, res) => {

  try {
    const { consultationId, paymentId } = req.body;

    if (!consultationId || !paymentId) {
      return res.status(400).json({
        success: false,
        error: 'consultationId and paymentId required'
      });
    }

    const result =
      await marketplaceConsultationService
        .confirmPaymentAndLockConsultation(
          consultationId,
          paymentId
        );

    return res.json({
      success: true,
      data: result
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
};