/**
 * Freedom Protocol - Role Authorization Middleware
 * Role-based and context-based authorization
 */

const BaseError = require('../errors/baseError');
const patientRepository = require('../repositories/patient.repository');
const subscriptionRepository = require('../repositories/subscription.repository');

/**
 * Authorize based on user role
 */
const authorizeRole = (roles) => {
  return (req, res, next) => {

    if (!req.user || !req.user.role) {
      return next(
        new BaseError('Authentication required', 401, 'UNAUTHORIZED')
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new BaseError('Access denied', 403, 'FORBIDDEN')
      );
    }

    next();
  };
};

/**
 * Authorize self access
 */
const authorizeSelf = (paramName) => {
  return (req, res, next) => {

    if (!req.user) {
      return next(
        new BaseError('Authentication required', 401, 'UNAUTHORIZED')
      );
    }

    const resourceId = req.params[paramName];

    if (!resourceId) {
      return next(
        new BaseError('Missing parameter', 400, 'INVALID_PARAMETER')
      );
    }

    if (req.user.user_id !== resourceId) {
      return next(
        new BaseError('Access denied', 403, 'FORBIDDEN')
      );
    }

    next();
  };
};

/**
 * Authorize facility ownership
 */
const authorizeFacility = (paramName) => {
  return (req, res, next) => {

    if (!req.user || !req.user.facility_id) {
      return next(
        new BaseError('Facility access denied', 403, 'NO_FACILITY')
      );
    }

    const resourceFacilityId = req.params[paramName];

    if (!resourceFacilityId) {
      return next(
        new BaseError('Missing parameter', 400, 'INVALID_PARAMETER')
      );
    }

    if (req.user.facility_id !== resourceFacilityId) {
      return next(
        new BaseError('Access denied', 403, 'FORBIDDEN')
      );
    }

    next();
  };
};

/**
 * Doctor → Patient ownership
 */
const authorizeDoctorPatient = () => {
  return async (req, res, next) => {
    try {

      if (!req.user || req.user.role !== 'doctor') {
        return next(
          new BaseError('Doctor access required', 403, 'FORBIDDEN')
        );
      }

      const patientId = req.params.patientId;

      if (!patientId) {
        return next(
          new BaseError('Missing patientId', 400, 'INVALID_PARAMETER')
        );
      }

      const patient = await patientRepository.getPatientById(patientId);

      if (!patient) {
        return next(
          new BaseError('Patient not found', 404, 'NOT_FOUND')
        );
      }

      if (patient.doctor_id !== req.user.user_id) {
        return next(
          new BaseError('Access denied', 403, 'FORBIDDEN')
        );
      }

      next();
    } catch (err) {
      console.error(err);
      return next(
        new BaseError('Authorization failed', 500, 'AUTHORIZATION_ERROR')
      );
    }
  };
};

/**
 * Patient subscription gate
 */
const subscriptionGate = () => {
  return async (req, res, next) => {
    try {

      // Doctors and admins bypass subscription gate
      if (req.user.role === 'doctor' || req.user.role === 'admin') {
        return next();
      }

      if (req.user.role !== 'patient') {
        return next(
          new BaseError('Invalid role', 403, 'FORBIDDEN')
        );
      }

      const subscription =
        await subscriptionRepository.getActiveSubscriptionByUserId(
          req.user.user_id
        );

      if (!subscription) {
        return next(
          new BaseError('Subscription inactive', 403, 'SUBSCRIPTION_REQUIRED')
        );
      }

      if (!['active', 'trial'].includes(subscription.status)) {
        return next(
          new BaseError('Subscription inactive', 403, 'SUBSCRIPTION_REQUIRED')
        );
      }

      req.subscription = subscription;
      next();

    } catch (err) {
      console.error(err);
      return next(
        new BaseError('Subscription check failed', 500, 'SUBSCRIPTION_ERROR')
      );
    }
  };
};

module.exports = {
  authorizeRole,
  authorizeSelf,
  authorizeFacility,
  authorizeDoctorPatient,
  subscriptionGate
};
