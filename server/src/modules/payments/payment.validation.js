import { z } from 'zod';

export const paymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  paymentDate: z.string().or(z.date()).optional(),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER']),
  transactionRef: z.string().trim().optional().nullable().or(z.literal('')),
  notes: z.string().trim().optional().nullable(),
});

