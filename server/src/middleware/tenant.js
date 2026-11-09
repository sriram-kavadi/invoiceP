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
