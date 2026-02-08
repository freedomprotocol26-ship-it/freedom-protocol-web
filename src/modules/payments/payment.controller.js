/**
 * Freedom Protocol - Payment Controller
 * HTTP handlers for payment endpoints
 */

const paymentService = require('./payment.service');
const controllerErrorHandler = require('../../controllers/controllerErrorHandler');

/**
 * Initiate payment
 * POST /payments/initiate
 */
const initiatePayment = controllerErrorHandler(async (req, res) => {
  const { patientId, plan } = req.body;

  const payment = await paymentService.initiatePayment(patientId, plan);

  res.status(201).json({
    success: true,
    data: payment
  });
});

/**
 * Confirm payment
 * POST /payments/confirm
 */
const confirmPayment = controllerErrorHandler(async (req, res) => {
  const { patientId, plan, reference } = req.body;

  const result = await paymentService.confirmPayment(
    patientId,
    plan,
    reference
  );

  res.status(200).json({
    success: true,
    data: result
  });
});

module.exports = {
  initiatePayment,
  confirmPayment
};
