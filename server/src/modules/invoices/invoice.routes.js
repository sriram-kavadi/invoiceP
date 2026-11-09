import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireBusiness } from '../../middleware/tenant.js';
import { validate } from '../../middleware/validate.js';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  cancelInvoiceSchema,
} from './invoice.validation.js';
import {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  issueInvoice,
  cancelInvoice,
  downloadPdf,
  getPreviewHtml,
  duplicateInvoice,
  getSharedInvoice,
} from './invoice.controller.js';

const router = Router();

// Public route for authorized invoice sharing via unique token
router.get('/share/:token', getSharedInvoice);

// Protected routes requiring authentication & tenant context
router.use(authenticate, requireBusiness);

router.get('/', listInvoices);
router.post('/', validate(createInvoiceSchema), createInvoice);
router.get('/:id', getInvoice);
router.put('/:id', validate(updateInvoiceSchema), updateInvoice);
router.post('/:id/issue', issueInvoice);
router.post('/:id/cancel', validate(cancelInvoiceSchema), cancelInvoice);
router.get('/:id/pdf', downloadPdf);
router.get('/:id/preview-html', getPreviewHtml);
router.post('/:id/duplicate', duplicateInvoice);

export default router;

