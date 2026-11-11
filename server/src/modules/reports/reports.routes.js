import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireBusiness } from '../../middleware/tenant.js';
import {
  getSalesReport,
  exportSalesReport,
  getPaymentsReport,
  exportPaymentsReport,
  getAnalytics,
  exportAnalyticsReport,
} from './reports.controller.js';

const router = Router();

router.use(authenticate, requireBusiness);

router.get('/analytics', getAnalytics);
router.get('/analytics/export', exportAnalyticsReport);
router.get('/sales', getSalesReport);
router.get('/sales/export', exportSalesReport);
router.get('/payments', getPaymentsReport);
router.get('/payments/export', exportPaymentsReport);

export default router;

