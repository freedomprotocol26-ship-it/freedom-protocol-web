/**
 * Freedom Protocol - Base Error Class
 * Custom error handling for consistent API responses
 */

class BaseError extends Error {
  /**
   * Create a base error
   * 
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {string} code - Error code for client identification
   * @param {Array} errors - Optional array of detailed errors
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', errors = null) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON response format
   * 
   * @returns {Object} Error response object
   */
  toJSON() {
    const response = {
      success: false,
      error: this.code,
      message: this.message,
      timestamp: this.timestamp
    };

    if (this.errors && this.errors.length > 0) {
      response.errors = this.errors;
    }

    return response;
  }
}

module.exports = BaseError;