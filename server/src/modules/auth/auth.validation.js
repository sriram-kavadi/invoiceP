import { z } from 'zod';

// ─── Register ────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address (e.g. name@company.com)'),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Phone must be a valid 10-digit Indian mobile number (starting with 6-9)')
    .optional()
    .or(z.literal('')),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long'),
  businessId: z.string().uuid('Invalid businessId').optional(),
  role: z.enum(['OWNER', 'ADMIN', 'STAFF']).optional().default('OWNER'),
});

// ─── Login ───────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address'),
  password: z.string({ required_error: 'Password is required' }),
});

// ─── Forgot password ─────────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address'),
});

// ─── Reset password ──────────────────────────────────────────────────────────

export const resetPasswordSchema = z.object({
  token: z.string({ required_error: 'Reset token is required' }).min(1),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
});
