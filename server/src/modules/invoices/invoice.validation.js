import { z } from 'zod';

export const invoiceItemSchema = z.object({
  productId: z.string().uuid().optional().nullable().or(z.literal('')),
  description: z.string({ required_error: 'Item description is required' }).trim().min(1, 'Item description cannot be empty'),
  hsnSacCode: z.string().trim().optional().nullable().or(z.literal('')),
  gstRate: z.coerce.number().min(0).max(100).default(0),
  taxClassification: z.enum(['TAXABLE', 'EXEMPT', 'NIL_RATED', 'NON_GST']).default('TAXABLE'),
  shippedQty: z.coerce.number().positive('Shipped quantity must be positive'),
  billedQty: z.coerce.number().positive('Billed quantity must be positive'),
  unit: z.string().trim().default('PCS'),
  rate: z.coerce.number().min(0, 'Rate must be zero or positive'),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
});

export const createInvoiceSchema = z.object({
  invoiceNumber: z.string().trim().optional(),
  invoiceType: z.enum(['GST', 'NON_GST']).default('GST'),
  gstType: z.enum(['INTRASTATE', 'INTERSTATE']).default('INTRASTATE'),
  customerId: z.string().uuid().optional().nullable().or(z.literal('')),

  invoiceDate: z.string().or(z.date()).optional(),
  dueDate: z.string().or(z.date()).optional().nullable(),
  deliveryNoteDate: z.string().or(z.date()).optional().nullable(),

  deliveryNote: z.string().trim().optional().nullable(),
  paymentTerms: z.string().trim().optional().nullable(),
  referenceNumber: z.string().trim().optional().nullable(),
  referenceDate: z.string().or(z.date()).optional().nullable(),
  otherReferences: z.string().trim().optional().nullable(),
  buyerOrderNumber: z.string().trim().optional().nullable(),
  buyerOrderDate: z.string().or(z.date()).optional().nullable(),
  dispatchDocNumber: z.string().trim().optional().nullable(),
  dispatchedThrough: z.string().trim().optional().nullable(),
  destination: z.string().trim().optional().nullable(),
  termsOfDelivery: z.string().trim().optional().nullable(),

  items: z.array(invoiceItemSchema).min(1, 'Invoice must have at least one product item'),
  notes: z.string().trim().optional().nullable(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  items: z.array(invoiceItemSchema).min(1).optional(),
});

export const cancelInvoiceSchema = z.object({
  reason: z.string({ required_error: 'Cancellation reason is required' }).trim().min(5, 'Reason must be at least 5 characters'),
});

