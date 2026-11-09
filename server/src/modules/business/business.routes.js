import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireBusiness, attachBusiness } from '../../middleware/tenant.js';
import { validate } from '../../middleware/validate.js';
import {
  onboardSchema,
  updateProfileSchema,
  updateSettingsSchema,
  bankAccountSchema,
} from './business.validation.js';
import {
  getProfile,
  updateProfile,
  onboard,
  getSettings,
  updateSettings,
  listBankAccounts,
  addBankAccount,
  updateBankAccount,
  deleteBankAccount,
  uploadLogo,
  logoUpload,
} from './business.controller.js';

const router = Router();

// ─── Onboarding ───────────────────────────────────────────────────────────────
// Only requires authenticate (user may not have a business yet)
router.post('/onboard', authenticate, attachBusiness, validate(onboardSchema), onboard);

// ─── All routes below require authenticate + attachBusiness ───────────────────

// Profile
router.get('/profile', authenticate, attachBusiness, getProfile);
router.put('/profile', authenticate, attachBusiness, validate(updateProfileSchema), updateProfile);

// Settings
router.get('/settings', authenticate, attachBusiness, getSettings);
router.put('/settings', authenticate, attachBusiness, validate(updateSettingsSchema), updateSettings);

// Bank Accounts
router.get('/bank-accounts', authenticate, attachBusiness, listBankAccounts);
router.post('/bank-accounts', authenticate, attachBusiness, validate(bankAccountSchema), addBankAccount);
router.put('/bank-accounts/:id', authenticate, attachBusiness, validate(bankAccountSchema), updateBankAccount);
router.delete('/bank-accounts/:id', authenticate, attachBusiness, deleteBankAccount);

// Logo upload
router.post(
  '/upload-logo',
  authenticate,
  attachBusiness,
  logoUpload.single('logo'),
  uploadLogo,
);

export default router;
