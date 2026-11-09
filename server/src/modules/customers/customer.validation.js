import { z } from 'zod';

// ─── Customer Schema ──────────────────────────────────────────────────────────

export const customerSchema = z.object({
  name: z
    .string({ required_error: 'Customer name is required' })
    .trim()
    .min(1, 'Customer name is required'),
  customerType: z.enum(['INDIVIDUAL', 'BUSINESS']).optional(),
  gstin: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{15}$/, 'GSTIN must be 15 alphanumeric characters')
    .optional()
    .or(z.literal('')),
  pan: z
    .string()
    .trim()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'PAN must be 10 characters in format AAAAA9999A')
    .optional()
    .or(z.literal('')),

  // Billing address
  billingAddress: z.string().trim().optional(),
  billingCity: z.string().trim().optional(),
  billingState: z.string().trim().optional(),
  billingStateCode: z.string().trim().optional(),
  billingPincode: z.string().trim().optional(),

  // Shipping address
  sameAsShipping: z.boolean().optional().default(true),
  shippingAddress: z.string().trim().optional(),
  shippingCity: z.string().trim().optional(),
  shippingState: z.string().trim().optional(),
  shippingStateCode: z.string().trim().optional(),
  shippingPincode: z.string().trim().optional(),

  // Contact
  contactPerson: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  notes: z.string().trim().optional(),
});

// ─── Update Customer Schema (all optional) ────────────────────────────────────

export const updateCustomerSchema = customerSchema.partial().extend({
  // name stays required as a minimum if provided
});
