import { z } from 'zod';

// ─── Product Zod Schema ───────────────────────────────────────────────────────

export const productSchema = z.object({
  name: z
    .string({ required_error: 'Product name is required' })
    .trim()
    .min(1, 'Product name is required')
    .max(255, 'Product name cannot exceed 255 characters'),

  sku: z.string().trim().max(100).optional().nullable(),

  description: z.string().trim().max(2000).optional().nullable(),

  hsnSacCode: z
    .string()
    .trim()
    .regex(/^[0-9]{2,8}$/, 'HSN/SAC code must be between 2 and 8 digits')
    .optional()
    .nullable()
    .or(z.literal('')),

  unit: z
    .enum(['PCS', 'KG', 'BOX', 'WAL', 'LTR', 'MTR', 'NOS', 'SET', 'DZ', 'PACK', 'OTHER'], {
      errorMap: () => ({
        message: 'Unit must be one of: PCS, KG, BOX, WAL, LTR, MTR, NOS, SET, DZ, PACK, OTHER',
      }),
    })
    .default('PCS'),

  sellingPrice: z.coerce
    .number({ invalid_type_error: 'Please enter a valid selling price' })
    .positive('Selling price must be greater than zero'),

  gstRate: z.coerce
    .number({ invalid_type_error: 'GST rate must be a number' })
    .refine((v) => [0, 5, 12, 18, 28].includes(v), {
      message: 'GST rate must be one of standard rates: 0%, 5%, 12%, 18%, or 28%',
    })
    .default(0),

  taxClassification: z
    .enum(['TAXABLE', 'EXEMPT', 'NIL_RATED', 'NON_GST'], {
      errorMap: () => ({
        message: 'Tax classification must be: TAXABLE, EXEMPT, NIL_RATED, or NON_GST',
      }),
    })
    .default('TAXABLE'),

  defaultDiscount: z.coerce
    .number({ invalid_type_error: 'Default discount must be a number' })
    .min(0, 'Discount percentage cannot be negative')
    .max(100, 'Discount percentage cannot exceed 100%')
    .default(0),

  isService: z.boolean().default(false),
});

// Partial schema for updates (all fields optional)
export const productUpdateSchema = productSchema.partial();
