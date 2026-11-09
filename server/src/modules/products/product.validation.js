import { z } from 'zod';

// ─── Product Zod Schema ───────────────────────────────────────────────────────

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),

  sku: z.string().max(100).optional().nullable(),

  description: z.string().max(2000).optional().nullable(),

  hsnSacCode: z.string().max(20).optional().nullable(),

  unit: z
    .enum(['PCS', 'KG', 'BOX', 'WAL', 'LTR', 'MTR', 'NOS', 'SET', 'DZ', 'PACK', 'OTHER'], {
      errorMap: () => ({
        message:
          'unit must be one of: PCS, KG, BOX, WAL, LTR, MTR, NOS, SET, DZ, PACK, OTHER',
      }),
    })
    .default('PCS'),

  sellingPrice: z
    .number({ invalid_type_error: 'sellingPrice must be a number' })
    .positive('sellingPrice must be a positive number'),

  gstRate: z
    .number({ invalid_type_error: 'gstRate must be a number' })
    .refine((v) => [0, 5, 12, 18, 28].includes(v), {
      message: 'gstRate must be one of: 0, 5, 12, 18, 28',
    })
    .default(0),

  taxClassification: z
    .enum(['TAXABLE', 'EXEMPT', 'NIL_RATED', 'NON_GST'], {
      errorMap: () => ({
        message: 'taxClassification must be one of: TAXABLE, EXEMPT, NIL_RATED, NON_GST',
      }),
    })
    .default('TAXABLE'),

  defaultDiscount: z
    .number({ invalid_type_error: 'defaultDiscount must be a number' })
    .min(0, 'defaultDiscount cannot be negative')
    .max(100, 'defaultDiscount cannot exceed 100')
    .default(0),

  isService: z.boolean().default(false),
});

// Partial schema for updates (all fields optional)
export const productUpdateSchema = productSchema.partial();
