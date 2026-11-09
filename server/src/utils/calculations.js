// ─────────────────────────────────────────────────────────────────────────────
// Invoice Calculation Utilities
// All monetary values are plain JS numbers; final values are rounded to 2dp.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Round a number to 2 decimal places.
 * @param {number} value
 * @returns {number}
 */
const round2 = (value) => parseFloat(value.toFixed(2));

/**
 * calculateInvoiceItem
 * Calculates all amounts for a single line item.
 *
 * @param {Object} item
 * @param {number} item.rate               - Unit price
 * @param {number} item.billedQty          - Billed quantity
 * @param {number} item.shippedQty         - Shipped quantity (may differ from billedQty)
 * @param {number} item.discountPercent    - Discount percentage (0-100)
 * @param {number} item.gstRate            - Total GST rate percentage (e.g. 18 for 18%)
 * @param {string} item.taxClassification  - e.g. "TAXABLE", "EXEMPT", "ZERO_RATED"
 * @param {'INTRASTATE'|'INTERSTATE'} gstType
 * @returns {Object} Computed amounts for the item
 */
export const calculateInvoiceItem = (item, gstType) => {
  const { rate, billedQty, shippedQty, discountPercent, gstRate, taxClassification } = item;

  const grossAmount = round2(rate * billedQty);
  const discountAmount = round2(grossAmount * (discountPercent / 100));
  const taxableAmount = round2(grossAmount - discountAmount);

  const isTaxable = taxClassification === 'TAXABLE' || !taxClassification;

  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isTaxable && gstRate > 0) {
    if (gstType === 'INTRASTATE') {
      cgstRate = round2(gstRate / 2);
      sgstRate = round2(gstRate / 2);
      cgstAmount = round2(taxableAmount * (cgstRate / 100));
      sgstAmount = round2(taxableAmount * (sgstRate / 100));
    } else {
      // INTERSTATE
      igstRate = gstRate;
      igstAmount = round2(taxableAmount * (igstRate / 100));
    }
  }

  const totalTax = round2(cgstAmount + sgstAmount + igstAmount);
  const amount = round2(taxableAmount + totalTax);

  return {
    grossAmount,
    discountAmount,
    taxableAmount,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    amount,
    shippedQty: shippedQty ?? billedQty,
    billedQty,
  };
};

/**
 * calculateInvoiceTotals
 * Aggregates line item amounts into invoice-level totals.
 *
 * @param {Array<Object>} items            - Array of raw item objects (same shape as calculateInvoiceItem input)
 * @param {'INTRASTATE'|'INTERSTATE'} gstType
 * @param {boolean} roundOffEnabled        - Whether to apply round-off to grandTotal
 * @returns {Object} Invoice totals
 */
export const calculateInvoiceTotals = (items, gstType, roundOffEnabled = false) => {
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalShippedQty = 0;
  let totalBilledQty = 0;

  for (const item of items) {
    const calc = calculateInvoiceItem(item, gstType);
    subtotal += calc.grossAmount;
    totalDiscount += calc.discountAmount;
    taxableAmount += calc.taxableAmount;
    cgstAmount += calc.cgstAmount;
    sgstAmount += calc.sgstAmount;
    igstAmount += calc.igstAmount;
    totalShippedQty += Number(calc.shippedQty) || 0;
    totalBilledQty += Number(calc.billedQty) || 0;
  }

  subtotal = round2(subtotal);
  totalDiscount = round2(totalDiscount);
  taxableAmount = round2(taxableAmount);
  cgstAmount = round2(cgstAmount);
  sgstAmount = round2(sgstAmount);
  igstAmount = round2(igstAmount);
  const totalTax = round2(cgstAmount + sgstAmount + igstAmount);

  let grandTotal = round2(taxableAmount + totalTax);
  let roundOff = 0;

  if (roundOffEnabled) {
    const rounded = Math.round(grandTotal);
    roundOff = round2(rounded - grandTotal);
    grandTotal = rounded;
  }

  return {
    subtotal,
    totalDiscount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    roundOff,
    grandTotal,
    totalShippedQty: round2(totalShippedQty),
    totalBilledQty: round2(totalBilledQty),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Number to Words (Indian numbering system)
// ─────────────────────────────────────────────────────────────────────────────

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

const twoDigits = (n) => {
  if (n < 20) return ones[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return tens[ten] + (one ? ' ' + ones[one] : '');
};

const threeDigits = (n) => {
  if (n === 0) return '';
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  let result = '';
  if (hundred) result += ones[hundred] + ' Hundred';
  if (remainder) result += (result ? ' ' : '') + twoDigits(remainder);
  return result;
};

/**
 * numberToWords
 * Converts an integer or decimal amount to Indian currency words.
 * e.g. 326805 -> "Three Lakh Twenty-Six Thousand Eight Hundred Five"
 *
 * @param {number} amount
 * @returns {string}
 */
export const numberToWords = (amount) => {
  if (amount === 0) return 'Zero';

  const rupees = Math.floor(amount);
  const paiseRaw = Math.round((amount - rupees) * 100);

  const convertRupees = (n) => {
    if (n === 0) return '';

    const crore = Math.floor(n / 10000000);
    const lakh = Math.floor((n % 10000000) / 100000);
    const thousand = Math.floor((n % 100000) / 1000);
    const remainder = n % 1000;

    let result = '';
    if (crore) result += threeDigits(crore) + ' Crore';
    if (lakh) result += (result ? ' ' : '') + twoDigits(lakh) + ' Lakh';
    if (thousand) result += (result ? ' ' : '') + twoDigits(thousand) + ' Thousand';
    if (remainder) result += (result ? ' ' : '') + threeDigits(remainder);
    return result;
  };

  let words = convertRupees(rupees);

  if (paiseRaw > 0) {
    words += ' and ' + twoDigits(paiseRaw) + ' Paise';
  }

  return words.trim();
};

// ─────────────────────────────────────────────────────────────────────────────
// Indian Currency Formatter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * formatCurrency
 * Formats a number in Indian numbering system with 2 decimal places.
 * e.g. 123456.5 -> "1,23,456.50"
 *
 * @param {number} amount
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '0.00';

  const fixed = parseFloat(amount).toFixed(2);
  const [intPart, decPart] = fixed.split('.');

  // Indian grouping: last 3 digits, then groups of 2
  const lastThree = intPart.slice(-3);
  const remaining = intPart.slice(0, -3);
  const formatted =
    remaining.length > 0
      ? remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
      : lastThree;

  return `${formatted}.${decPart}`;
};
