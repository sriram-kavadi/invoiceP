/**
 * Client-side invoice calculation utilities.
 * Mirrors server calculations for instant real-time UI feedback.
 */

import { numberToWords as numWords, formatIndianCurrency } from './helpers';

export const numberToWords = numWords;

/**
 * Calculate line item amounts and tax
 */
export function calculateItemAmount(item, gstType = 'INTRASTATE') {
  const rate = Number(item.rate || 0);
  const billedQty = Number(item.billedQty || 0);
  const discountPercent = Number(item.discountPercent || 0);

  const gross = rate * billedQty;
  const discountAmount = (gross * discountPercent) / 100;
  const taxable = Math.max(0, gross - discountAmount);

  return parseFloat(taxable.toFixed(2));
}

/**
 * Calculate invoice aggregate totals
 */
export function calculateTotals(items = [], gstType = 'INTRASTATE', roundOffEnabled = true) {
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalShippedQty = 0;
  let totalBilledQty = 0;

  for (const item of items) {
    const rate = Number(item.rate || 0);
    const billedQty = Number(item.billedQty || 0);
    const shippedQty = Number(item.shippedQty || 0);
    const discountPercent = Number(item.discountPercent || 0);
    const gstRate = gstType === 'NON_GST' ? 0 : Number(item.gstRate || 0);

    const gross = rate * billedQty;
    const itemDiscount = (gross * discountPercent) / 100;
    const itemTaxable = Math.max(0, gross - itemDiscount);

    subtotal += gross;
    totalDiscount += itemDiscount;
    taxableAmount += itemTaxable;
    totalShippedQty += shippedQty;
    totalBilledQty += billedQty;

    if (gstType === 'INTERSTATE') {
      igstAmount += (itemTaxable * gstRate) / 100;
    } else if (gstType === 'INTRASTATE') {
      cgstAmount += (itemTaxable * (gstRate / 2)) / 100;
      sgstAmount += (itemTaxable * (gstRate / 2)) / 100;
    }
  }

  const totalTax = cgstAmount + sgstAmount + igstAmount;
  const rawTotal = taxableAmount + totalTax;

  let roundOff = 0;
  let grandTotal = rawTotal;

  if (roundOffEnabled) {
    grandTotal = Math.round(rawTotal);
    roundOff = parseFloat((grandTotal - rawTotal).toFixed(2));
  } else {
    grandTotal = parseFloat(rawTotal.toFixed(2));
  }

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    totalDiscount: parseFloat(totalDiscount.toFixed(2)),
    taxableAmount: parseFloat(taxableAmount.toFixed(2)),
    cgstAmount: parseFloat(cgstAmount.toFixed(2)),
    sgstAmount: parseFloat(sgstAmount.toFixed(2)),
    igstAmount: parseFloat(igstAmount.toFixed(2)),
    totalTax: parseFloat(totalTax.toFixed(2)),
    roundOff,
    grandTotal,
    totalShippedQty,
    totalBilledQty,
  };
}

