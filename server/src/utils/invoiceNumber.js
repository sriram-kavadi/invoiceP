/**
 * Invoice Number Generation Utilities
 * Uses atomic DB transactions to prevent duplicate numbers under concurrent load.
 */

/**
 * getFinancialYear
 * Returns the Indian financial year string (e.g. "2526" for Apr 2025 – Mar 2026).
 * FY starts on 1st April.
 *
 * @param {Date} [date] - Defaults to current date
 * @returns {string} e.g. "2526"
 */
export const getFinancialYear = (date = new Date()) => {
  const month = date.getMonth(); // 0-indexed; April = 3
  const year = date.getFullYear();

  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;

  const start = String(startYear).slice(-2);
  const end = String(endYear).slice(-2);

  return `${start}${end}`;
};

/**
 * generateInvoiceNumber
 * Atomically increments the invoice sequence for a given business + prefix + FY
 * and returns a formatted invoice number.
 *
 * Format: PREFIX/FYYY/NNNN e.g. INV/2526/0001
 *
 * @param {string} businessId   - The business ID (tenant)
 * @param {string} prefix       - Invoice prefix e.g. "INV"
 * @param {import('@prisma/client').PrismaClient} prisma - Prisma client instance
 * @returns {Promise<string>}   - Formatted invoice number
 */
export const generateInvoiceNumber = async (businessId, prefix = 'INV', prisma) => {
  const fy = getFinancialYear();

  const sequence = await prisma.invoiceSequence.upsert({
    where: {
      businessId_prefix_financialYear: {
        businessId,
        prefix,
        financialYear: fy,
      },
    },
    update: {
      currentNumber: { increment: 1 },
    },
    create: {
      businessId,
      prefix,
      financialYear: fy,
      currentNumber: 1,
    },
  });

  const paddedNumber = String(sequence.currentNumber).padStart(4, '0');
  return `${prefix}/${fy}/${paddedNumber}`;
};
