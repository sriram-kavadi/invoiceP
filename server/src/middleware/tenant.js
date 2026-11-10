import prisma from '../config/database.js';
import { error } from '../utils/response.js';

/**
 * Resolves the business for the authenticated user.
 * - If the user belongs to exactly one business, selects it automatically.
 * - If the user belongs to multiple businesses, requires X-Business-Id header.
 * - Attaches req.businessId (server-verified; never trusts client-supplied body/params).
 * Returns null if the user has no business yet (onboarding flow).
 */
const resolveBusinessId = async (req, res) => {
  // Fast path: businessId was embedded in the JWT at login time (new tokens).
  // For single-business users this avoids a DB round-trip on every request.
  if (req.user.businessId) {
    // Multi-business override: if client explicitly passes a header AND it differs
    // from the embedded one, we must verify they actually have access.
    const headerBusinessId = req.headers['x-business-id'];
    if (headerBusinessId && headerBusinessId !== req.user.businessId) {
      // Fall through to DB to verify membership for the requested business
      const membership = await prisma.businessUser.findFirst({
        where: { userId: req.user.id, businessId: headerBusinessId },
        select: { businessId: true },
      });
      if (!membership) {
        return { __error: 'You do not have access to the specified business.', status: 403 };
      }
      return headerBusinessId;
    }
    return req.user.businessId;
  }

  // Slow path: old token without businessId claim — fall back to DB lookup
  const memberships = await prisma.businessUser.findMany({
    where: { userId: req.user.id },
    select: { businessId: true },
  });

  if (memberships.length === 0) {
    return null; // Onboarding — no business yet
  }

  if (memberships.length === 1) {
    return memberships[0].businessId;
  }

  // Multiple businesses: require the header
  const headerBusinessId = req.headers['x-business-id'];
  if (!headerBusinessId) {
    return { __error: 'You belong to multiple businesses. Please specify X-Business-Id header.', status: 400 };
  }

  const matched = memberships.find((m) => m.businessId === headerBusinessId);
  if (!matched) {
    return { __error: 'You do not have access to the specified business.', status: 403 };
  }

  return headerBusinessId;
};

/**
 * requireBusiness - Attaches req.businessId. Errors with 400/403 if business cannot be resolved.
 * Does NOT allow null (unonboarded) users through.
 */
export const requireBusiness = async (req, res, next) => {
  try {
    const result = await resolveBusinessId(req, res);

    if (result === null) {
      return error(res, 'No business found for this account. Please complete onboarding.', 403);
    }

    if (result && result.__error) {
      return error(res, result.__error, result.status);
    }

    req.businessId = result;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * attachBusiness - Attaches req.businessId if resolvable, sets null otherwise.
 * Useful for routes that work during onboarding or don't strictly need a business.
 */
export const attachBusiness = async (req, res, next) => {
  try {
    const result = await resolveBusinessId(req, res);

    if (result && result.__error) {
      return error(res, result.__error, result.status);
    }

    req.businessId = result ?? null;
    next();
  } catch (err) {
    next(err);
  }
};
