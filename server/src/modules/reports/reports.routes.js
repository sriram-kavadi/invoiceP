import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireBusiness } from '../../middleware/tenant.js';
import {
  getSalesReport,
  exportSalesReport,
  getPaymentsReport,
  exportPaymentsReport,
} from './reports.controller.js';

const router = Router();

router.use(authenticate, requireBusiness);

router.get('/sales', getSalesReport);
router.get('/sales/export', exportSalesReport);
router.get('/payments', getPaymentsReport);
router.get('/payments/export', exportPaymentsReport);

export default router;

