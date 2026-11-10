import prisma from '../../config/database.js';
import {
  generateToken,
  hashPassword,
  comparePassword,
  generateSecureToken,
  createSession,
} from './auth.service.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const COOKIE_NAME = 'token';

/** Set the JWT as a secure httpOnly cookie. */
function setTokenCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
}

/** Strip the passwordHash from a user object before sending to the client. */
function sanitizeUser(user) {
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}

// ─── Register ────────────────────────────────────────────────────────────────

/**
 * POST /auth/register
 * Creates a new User, optionally links them to an existing Business,
 * issues a JWT and stores a Session.
 */
export async function register(req, res) {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: result.error.flatten().fieldErrors,
    });
  }

  const { name, email, password, businessId, role } = result.data;

  try {
    // Reject duplicate emails
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const passwordHash = await hashPassword(password);

    // Create the User (and optionally BusinessUser) in one transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { name, email, passwordHash },
      });

      if (businessId) {
        // Verify the business exists first
        const business = await tx.business.findUnique({ where: { id: businessId } });
        if (!business) {
          throw Object.assign(new Error('Business not found'), { status: 404 });
        }

        await tx.businessUser.create({
          data: { userId: newUser.id, businessId, role },
        });
      }

      return newUser;
    });

    // Reload user with business relations for the response
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        businesses: {
          include: { business: true },
        },
      },
    });

    const sanitized = sanitizeUser(fullUser);
    const primaryBusiness = sanitized.businesses?.[0]?.business || null;

    // Embed businessId in JWT so tenant middleware skips DB on every request
    const token = generateToken(user.id, primaryBusiness?.id || null);
    await createSession(user.id, token);
    setTokenCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: sanitized,
      business: primaryBusiness,
      data: {
        token,
        user: sanitized,
        business: primaryBusiness,
      },
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    console.error('[Auth] register error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── Login ───────────────────────────────────────────────────────────────────

/**
 * POST /auth/login
 * Authenticates a user, issues a JWT (httpOnly cookie + response body).
 */
export async function login(req, res) {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: result.error.flatten().fieldErrors,
    });
  }

  const { email, password } = result.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        businesses: {
          include: { business: true },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const passwordValid = await comparePassword(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const sanitized = sanitizeUser(user);
    const primaryBusiness = sanitized.businesses?.[0]?.business || null;

    // Embed businessId in JWT so tenant middleware skips DB on every request
    const token = generateToken(user.id, primaryBusiness?.id || null);
    await createSession(user.id, token);
    setTokenCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: sanitized,
      business: primaryBusiness,
      data: {
        token,
        user: sanitized,
        business: primaryBusiness,
      },
    });
  } catch (err) {
    console.error('[Auth] login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── Logout ──────────────────────────────────────────────────────────────────

/**
 * POST /auth/logout
 * Clears the auth cookie and optionally invalidates the session.
 */
export async function logout(req, res) {
  try {
    const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.split(' ')[1];

    if (token) {
      // Best-effort session deletion; ignore if session doesn't exist
      await prisma.session.deleteMany({ where: { token } }).catch(() => {});
    }

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('[Auth] logout error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── Forgot Password ─────────────────────────────────────────────────────────

/**
 * POST /auth/forgot-password
 * Generates a secure reset token, stores it in PasswordReset table (1 hr expiry),
 * and sends an email (or logs to console in dev when SMTP is not configured).
 */
export async function forgotPassword(req, res) {
  const result = forgotPasswordSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: result.error.flatten().fieldErrors,
    });
  }

  const { email } = result.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return 200 to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If that email is registered, a reset link has been sent.',
      });
    }

    // Invalidate any existing unused tokens for this user
    await prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    if (process.env.SMTP_HOST) {
      // SMTP configured — send real email
      try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.default.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"InvoiceHub" <noreply@invoicehub.app>`,
          to: user.email,
          subject: 'Reset your InvoiceHub password',
          html: `
            <p>Hi ${user.name},</p>
            <p>You requested a password reset. Click the link below to set a new password:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>This link expires in 1 hour.</p>
            <p>If you did not request this, please ignore this email.</p>
          `,
        });
      } catch (mailErr) {
        console.error('[Auth] Failed to send reset email:', mailErr.message);
        // Do not expose the error; the token is already created
      }
    } else {
      // Dev mode — log to console
      console.info(`[Auth][DEV] Password reset token for ${email}: ${token}`);
      console.info(`[Auth][DEV] Reset URL: ${resetUrl}`);
    }

    return res.status(200).json({
      success: true,
      message: 'If that email is registered, a reset link has been sent.',
      // Expose token only in development when SMTP is not set
      ...(process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST
        ? { devToken: token }
        : {}),
    });
  } catch (err) {
    console.error('[Auth] forgotPassword error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── Reset Password ──────────────────────────────────────────────────────────

/**
 * POST /auth/reset-password
 * Validates the token, checks expiry, hashes the new password,
 * updates the user, and marks the token as used.
 */
export async function resetPassword(req, res) {
  const result = resetPasswordSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: result.error.flatten().fieldErrors,
    });
  }

  const { token, password } = result.data;

  try {
    const record = await prisma.passwordReset.findUnique({ where: { token } });

    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    if (record.usedAt) {
      return res.status(400).json({ success: false, message: 'Reset token has already been used' });
    }

    if (new Date() > record.expiresAt) {
      return res.status(400).json({ success: false, message: 'Reset token has expired' });
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all active sessions for this user so old tokens stop working
      prisma.session.deleteMany({ where: { userId: record.userId } }),
    ]);

    return res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('[Auth] resetPassword error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── Get Me ──────────────────────────────────────────────────────────────────

/**
 * GET /auth/me  (requires authenticate middleware)
 * Returns the authenticated user along with their linked businesses.
 */
export async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isEmailVerified: true,
        createdAt: true,
        businesses: {
          take: 1,
          select: {
            role: true,
            business: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
                state: true,
                stateCode: true,
                pincode: true,
                phone: true,
                email: true,
                gstin: true,
                pan: true,
                businessType: true,
                isGstRegistered: true,
                onboardingCompleted: true,
                authorizedSignatory: true,
                jurisdiction: true,
                declaration: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const primaryBusiness = user.businesses?.[0]?.business || null;
    const { businesses: _biz, ...userWithoutBiz } = user;

    return res.status(200).json({
      success: true,
      user: userWithoutBiz,
      business: primaryBusiness,
      data: {
        user: userWithoutBiz,
        business: primaryBusiness,
      },
    });
  } catch (err) {
    console.error('[Auth] getMe error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
