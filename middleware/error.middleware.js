/**
 * Centralized error handling middleware
 */

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = [];
  
  // Handle specific error types
  
  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    
    // Extract specific validation errors
    for (const field in err.errors) {
      errors.push({
        field,
        message: err.errors[field].message
      });
    }
  }
  
  // Mongoose cast errors (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }
  
  // MongoDB duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate entry found';
    
    // Extract the duplicate field
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    errors.push({
      field,
      message: `${field} '${value}' already exists`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // AI service errors
  if (err.message && err.message.includes('AI')) {
    statusCode = 503;
    message = 'AI service temporarily unavailable';
  }

  // Send standardized error response
  res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;