import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireBusiness } from '../../middleware/tenant.js';
import { validate } from '../../middleware/validate.js';
import { customerSchema, updateCustomerSchema } from './customer.validation.js';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerInvoices,
} from './customer.controller.js';

const router = Router();

router.use(authenticate, requireBusiness);

router.get('/', listCustomers);
router.post('/', validate(customerSchema), createCustomer);
router.get('/:id', getCustomer);
router.put('/:id', validate(updateCustomerSchema), updateCustomer);
router.delete('/:id', deleteCustomer);
router.get('/:id/invoices', getCustomerInvoices);

export default router;

