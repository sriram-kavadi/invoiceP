import { ZodError } from 'zod';

/**
 * validate - Zod validation middleware factory.
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate req.body against.
 * @returns Express middleware
 */
export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    // Replace req.body with the parsed (and coerced/stripped) data
    req.body = parsed;
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors = err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed. Please check the submitted data.',
        errors: fieldErrors,
      });
    }
    next(err);
  }
};
