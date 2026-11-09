import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';

/**
 * Global Express error handler.
 * Must be registered as the LAST middleware: app.use(errorHandler)
 */
export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (process.env.NODE_ENV === 'development') {
    console.error('[ErrorHandler]', err);
  }

  // ── Prisma known request errors ──────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const fields = err.meta?.target ?? ['field'];
        return res.status(409).json({
          success: false,
          message: `A record with this ${fields.join(', ')} already exists.`,
          errors: [{ field: fields.join(', '), message: 'Must be unique.' }],
        });
      }
      case 'P2025':
        return res.status(404).json({
          success: false,
          message: err.meta?.cause ?? 'The requested record was not found.',
        });
      case 'P2003':
        return res.status(400).json({
          success: false,
          message: 'Invalid reference: related record does not exist.',
        });
      case 'P2014':
        return res.status(400).json({
          success: false,
          message: 'The change would violate a required relation.',
        });
      default:
        return res.status(500).json({
          success: false,
          message: 'A database error occurred. Please try again.',
        });
    }
  }

  // ── Prisma validation errors ─────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid data provided to the database layer.',
    });
  }

  // ── Zod validation errors ────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const fieldErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: fieldErrors,
    });
  }

  // ── JWT errors ───────────────────────────────────────────────────────────
  if (err instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please log in again.',
    });
  }

  if (err instanceof jwt.TokenExpiredError) {
    return res.status(401).json({
      success: false,
      message: 'Token has expired. Please log in again.',
    });
  }

  if (err instanceof jwt.NotBeforeError) {
    return res.status(401).json({
      success: false,
      message: 'Token not yet active.',
    });
  }

  // ── HTTP errors with an explicit statusCode ──────────────────────────────
  if (err.statusCode || err.status) {
    const statusCode = err.statusCode || err.status;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'An error occurred.',
    });
  }

  // ── Fallback: unexpected server error ────────────────────────────────────
  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again later.'
        : err.message || 'Internal server error.',
  });
};
