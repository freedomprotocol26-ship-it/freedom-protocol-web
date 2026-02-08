/**
 * Freedom Protocol - Payment Controller
 */

const paymentService = require('./payment.service');
const controllerErrorHandler = require('../../controllers/controllerErrorHandler');

const initiatePayment = controllerErrorHandler(async (req, res) => {
  const { patientId, plan } = req.body;

  const payment = await paymentService.initiatePayment(patientId, plan);

  res.status(201).json({
    success: true,
    data: payment
  });
});

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
