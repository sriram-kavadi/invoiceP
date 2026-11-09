import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
} from './auth.controller.js';

const router = Router();

// ─── Public routes ───────────────────────────────────────────────────────────

/** Create a new account */
router.post('/register', register);

/** Authenticate and receive a JWT */
router.post('/login', login);

/** Invalidate the current session / clear the cookie */
router.post('/logout', logout);

/** Request a password-reset email */
router.post('/forgot-password', forgotPassword);

/** Consume the reset token and set a new password */
router.post('/reset-password', resetPassword);

// ─── Protected routes ────────────────────────────────────────────────────────

/** Return the authenticated user (with business info) */
router.get('/me', authenticate, getMe);

export default router;
