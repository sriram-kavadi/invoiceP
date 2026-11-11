import { z } from 'zod';

// ─── Customer Schema ──────────────────────────────────────────────────────────

export const customerSchema = z.object({
  name: z
    .string({ required_error: 'Customer / Company name is required' })
    .trim()
    .min(1, 'Customer name cannot be empty')
    .max(255, 'Customer name cannot exceed 255 characters'),
  customerType: z.enum(['INDIVIDUAL', 'BUSINESS']).optional().default('BUSINESS'),
  gstin: z
    .string()
    .trim()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format (15 characters, e.g. 36AABCU9603R1ZM)')
    .or(z.literal(''))
    .optional(),
  pan: z
    .string()
    .trim()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (10 characters, e.g. ABCDE1234F)')
    .or(z.literal(''))
    .optional(),

  // Billing address
  billingAddress: z.string().trim().optional(),
  billingCity: z.string().trim().optional(),
  billingState: z.string().trim().optional(),
  billingStateCode: z.string().trim().optional(),
  billingPincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits').or(z.literal('')).optional(),

  // Shipping address
  sameAsShipping: z.boolean().optional().default(true),
  shippingAddress: z.string().trim().optional(),
  shippingCity: z.string().trim().optional(),
  shippingState: z.string().trim().optional(),
  shippingStateCode: z.string().trim().optional(),
  shippingPincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits').or(z.literal('')).optional(),

  // Contact
  contactPerson: z.string().trim().optional(),
  phone: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, 'Invalid phone number format').or(z.literal('')).optional(),
  email: z.string().trim().email('Invalid email address format (e.g. buyer@example.com)').or(z.literal('')).optional(),
  notes: z.string().trim().optional(),
});

// ─── Update Customer Schema (all optional) ────────────────────────────────────

export const updateCustomerSchema = customerSchema.partial().extend({
  // name stays required as a minimum if provided
});
