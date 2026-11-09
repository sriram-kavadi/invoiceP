import { z } from 'zod';

// ─── Onboard Schema ──────────────────────────────────────────────────────────

export const onboardSchema = z.object({
  name: z
    .string({ required_error: 'Business name is required' })
    .trim()
    .min(1, 'Business name is required'),
  businessType: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  stateCode: z.string().trim().optional(),
  pincode: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  website: z.string().trim().optional(),
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
  isGstRegistered: z.boolean().optional().default(false),
  authorizedSignatory: z.string().trim().optional(),
  jurisdiction: z.string().trim().optional(),
  declaration: z.string().trim().optional(),
});

// ─── Update Profile Schema ────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Business name cannot be empty').optional(),
  businessType: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  stateCode: z.string().trim().optional(),
  pincode: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  website: z.string().trim().optional(),
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
  isGstRegistered: z.boolean().optional(),
  authorizedSignatory: z.string().trim().optional(),
  jurisdiction: z.string().trim().optional(),
  declaration: z.string().trim().optional(),
});

// ─── Business Settings Schema ─────────────────────────────────────────────────

export const updateSettingsSchema = z.object({
  defaultPaymentTerms: z.string().trim().optional(),
  defaultGstType: z.enum(['INTRASTATE', 'INTERSTATE']).optional(),
  invoicePrefix: z.string().trim().optional(),
  invoiceNumberFormat: z.string().trim().optional(),
  roundOffEnabled: z.boolean().optional(),
  defaultDueDays: z.number().int().min(0).optional(),
  showBankDetails: z.boolean().optional(),
  showSignature: z.boolean().optional(),
  showFooterNote: z.boolean().optional(),
  footerNote: z.string().trim().optional(),
});

// ─── Bank Account Schema ──────────────────────────────────────────────────────

export const bankAccountSchema = z.object({
  accountHolder: z
    .string({ required_error: 'Account holder name is required' })
    .trim()
    .min(1, 'Account holder name is required'),
  bankName: z
    .string({ required_error: 'Bank name is required' })
    .trim()
    .min(1, 'Bank name is required'),
  accountNumber: z
    .string({ required_error: 'Account number is required' })
    .trim()
    .min(1, 'Account number is required'),
  ifscCode: z
    .string({ required_error: 'IFSC code is required' })
    .trim()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format (e.g. SBIN0001234)')
    .or(z.string().trim().min(1, 'IFSC code is required')),
  branch: z.string().trim().optional(),
  isDefault: z.boolean().optional().default(false),
});
