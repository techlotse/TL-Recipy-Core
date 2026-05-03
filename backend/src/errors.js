export class ApiError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function badRequest(message, details = undefined) {
  return new ApiError(400, message, details);
}

export function notFound(message = 'Resource not found') {
  return new ApiError(404, message);
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  const status = error.name === 'ZodError' ? 400 : error.status || 500;
  const payload = {
    error: {
      message: status === 500 ? 'Unexpected server error' : error.message
    }
  };

  if (error.details) payload.error.details = error.details;
  if (error.name === 'ZodError') {
    payload.error.message = 'Validation failed';
    payload.error.details = error.issues;
  }

  if (status === 500) {
    console.error(error);
  }

  res.status(status).json(payload);
}
