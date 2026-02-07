/**
 * Freedom Protocol - Controller Error Handler
 * Higher-order function for consistent error handling in controllers
 */

/**
 * Wraps async controller functions to catch errors and send consistent JSON responses
 * 
 * @param {Function} fn - Async controller function
 * @returns {Function} Wrapped function with error handling
 */
const controllerErrorHandler = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      // Log error for debugging
      console.error('Controller error:', error);

      // Extract error details or use defaults
      const statusCode = error.statusCode || 500;
      const code = error.code || 'INTERNAL_ERROR';
      const message = error.message || 'An unexpected error occurred';
      const timestamp = error.timestamp || new Date().toISOString();

      // Build response object
      const response = {
        success: false,
        error: code,
        message: message,
        timestamp: timestamp
      };

      // Include errors array if present
      if (error.errors && error.errors.length > 0) {
        response.errors = error.errors;
      }

      // Send JSON response
      res.status(statusCode).json(response);
    }
  };
};

module.exports = controllerErrorHandler;