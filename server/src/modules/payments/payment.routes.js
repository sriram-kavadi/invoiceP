import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireBusiness } from '../../middleware/tenant.js';
import { validate } from '../../middleware/validate.js';
import { paymentSchema } from './payment.validation.js';
import {
  listAllPayments,
  listInvoicePayments,
  recordPayment,
  deletePayment,
} from './payment.controller.js';

const router = Router();

router.use(authenticate, requireBusiness);

router.get('/', listAllPayments);
router.get('/invoices/:invoiceId', listInvoicePayments);
router.post('/invoices/:invoiceId', validate(paymentSchema), recordPayment);
router.delete('/invoices/:invoiceId/:paymentId', deletePayment);

export default router;

