import jwt from 'jsonwebtoken';
import { error } from '../utils/response.js';

const extractToken = (req) => {
  // Try Authorization header first
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // Fallback to cookie
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
};

/**
 * authenticate - Required auth middleware.
 * Rejects with 401 if no valid token is present.
 */
export const authenticate = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return error(res, 'Authentication required. Please provide a valid token.', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token has expired. Please log in again.', 401);
    }
    return error(res, 'Invalid token. Please log in again.', 401);
  }
};

/**
 * optionalAuth - Non-blocking auth middleware.
 * Attaches req.user if a valid token is present, but doesn't reject if absent.
 */
export const optionalAuth = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };
  } catch {
    req.user = null;
  }

  next();
};
