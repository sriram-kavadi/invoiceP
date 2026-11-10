import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Sign a JWT for a given userId and optional businessId.
 * Embedding businessId avoids a DB round-trip in tenant middleware on every request.
 * @param {string} userId
 * @param {string|null} [businessId] - primary business id to embed in token
 * @returns {string} signed JWT token
 */
export function generateToken(userId, businessId = null) {
  const payload = { sub: userId, id: userId };
  if (businessId) payload.businessId = businessId;
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT.
 * @param {string} token
 * @returns {object} decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Hash a plain-text password.
 * @param {string} password
 * @returns {Promise<string>} bcrypt hash
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

/**
 * Compare a plain-text password against a bcrypt hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Persist a session record (supports refresh-token flows).
 * @param {string} userId
 * @param {string} token  - the JWT / refresh token to store
 * @param {import('@prisma/client').PrismaClient} [db] - optional prisma instance (defaults to singleton)
 * @returns {Promise<import('@prisma/client').Session>}
 */
export async function createSession(userId, token, db = prisma) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7-day session window

  return db.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });
}

/**
 * Generate a cryptographically secure hex token for password-reset flows.
 * @param {number} [bytes=32]
 * @returns {string}
 */
export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
