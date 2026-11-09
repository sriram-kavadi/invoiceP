import { INDIAN_STATES } from './constants';

/**
 * Format a date to a readable string.
 * @param {string|Date} date
 * @param {string} format - 'DD-Mon-YY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
 */
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

export function numberToWords(amount) {
  if (!amount || Number(amount) === 0) return 'Zero';
  const num = Number(amount);
  const rupees = Math.floor(num);
  const paiseRaw = Math.round((num - rupees) * 100);

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
  return (words || 'Zero') + ' only';
}

export function formatDate(date, format = 'DD-Mon-YY') {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = d.getMonth(); // 0-based
  const year = d.getFullYear();
  const year2 = String(year).slice(-2);

  const MONTHS_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const MONTHS_FULL = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const mm = String(month + 1).padStart(2, '0');
  const mon = MONTHS_SHORT[month];
  const monthFull = MONTHS_FULL[month];

  switch (format) {
    case 'DD-Mon-YY':
      return `${day}-${mon}-${year2}`;
    case 'DD-Mon-YYYY':
      return `${day}-${mon}-${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${mm}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${mm}-${day}`;
    case 'DD MMMM YYYY':
      return `${day} ${monthFull} ${year}`;
    default:
      return `${day}-${mon}-${year2}`;
  }
}

/**
 * Format a number as Indian currency (₹ with Indian comma grouping).
 * @param {number|string} amount
 * @param {boolean} showSymbol
 */
export function formatIndianCurrency(amount, showSymbol = true) {
  const num = parseFloat(amount);
  if (isNaN(num)) return showSymbol ? '₹0.00' : '0.00';

  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return showSymbol ? `₹${formatted}` : formatted;
}

/**
 * Look up a state name from an Indian state code.
 * @param {string} code
 */
export function getStateByCode(code) {
  if (!code) return '';
  const state = INDIAN_STATES.find(
    (s) => s.code === String(code).padStart(2, '0') || s.code === code
  );
  return state ? state.name : '';
}

/**
 * Look up a state code from a state name.
 * @param {string} stateName
 */
export function getStateCode(stateName) {
  if (!stateName) return '';
  const state = INDIAN_STATES.find(
    (s) => s.name.toLowerCase() === stateName.toLowerCase()
  );
  return state ? state.code : '';
}

/**
 * Trigger a file download in the browser.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Generate a WhatsApp message link.
 * @param {string} phone - Phone number (with or without country code)
 * @param {string} message - Pre-filled message text
 */
export function getWhatsAppLink(phone, message = '') {
  if (!phone) return '#';
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  // Add Indian country code if not present
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleaned}${encoded ? `?text=${encoded}` : ''}`;
}

/**
 * Calculate the date range based on a preset key.
 * Returns { startDate: string, endDate: string } in YYYY-MM-DD format.
 * @param {string} preset
 */
export function getDateRangeFromPreset(preset) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  let startDate, endDate;

  switch (preset) {
    case 'this_month':
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0);
      break;
    case 'last_month':
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
      break;
    case 'this_quarter': {
      const quarterStart = Math.floor(month / 3) * 3;
      startDate = new Date(year, quarterStart, 1);
      endDate = new Date(year, quarterStart + 3, 0);
      break;
    }
    case 'this_fy': {
      // Indian FY: April 1 to March 31
      const fyStartYear = month >= 3 ? year : year - 1;
      startDate = new Date(fyStartYear, 3, 1); // April 1
      endDate = new Date(fyStartYear + 1, 2, 31); // March 31
      break;
    }
    default:
      startDate = new Date(year, month, 1);
      endDate = new Date();
  }

  return {
    startDate: formatDate(startDate, 'YYYY-MM-DD'),
    endDate: formatDate(endDate, 'YYYY-MM-DD'),
  };
}

/**
 * Truncate a string to a given length with ellipsis.
 */
export function truncate(str, maxLen = 30) {
  if (!str) return '';
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str;
}

/**
 * Capitalize the first letter of each word.
 */
export function titleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
