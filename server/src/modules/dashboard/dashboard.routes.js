import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireBusiness } from '../../middleware/tenant.js';
import { getSummary } from './dashboard.controller.js';

const router = Router();

router.use(authenticate, requireBusiness);

router.get('/summary', getSummary);

export default router;

