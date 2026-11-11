import QRCode from 'qrcode';

/**
 * Validate a UPI Virtual Payment Address (VPA).
 * Format: username@bank / mobile@upi (e.g. merchant@okaxis, 9876543210@paytm)
 * @param {string} upiId
 * @returns {boolean}
 */
export function isValidUpiId(upiId) {
  if (!upiId || typeof upiId !== 'string') return false;
  const trimmed = upiId.trim();
  // Standard NPCI VPA regex: 2-256 characters before @, 2-64 characters after @
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  return upiRegex.test(trimmed);
}

/**
 * Build a standard NPCI-compliant UPI Intent URI.
 * Spec: upi://pay?pa={vpa}&pn={payeeName}&am={amount}&cu=INR&tn={note}&tr={ref}
 * @param {object} params
 * @param {string} params.upiId - Merchant / Business UPI ID
 * @param {string} [params.payeeName] - Name of business
 * @param {number|string} params.amount - Total amount (formatted to 2 decimal places)
 * @param {string} [params.invoiceNumber] - Invoice reference number
 * @param {string} [params.invoiceId] - Unique invoice identifier
 * @returns {string} upi://pay URI
 */
export function buildUpiUri({ upiId, payeeName, amount, invoiceNumber, invoiceId }) {
  if (!upiId) return '';
  const cleanUpi = upiId.trim();
  const cleanName = (payeeName || 'Business').trim().replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 50);
  const numAmount = Number(amount || 0);
  const cleanAmount = numAmount > 0 ? numAmount.toFixed(2) : '';

  const params = new URLSearchParams();
  params.set('pa', cleanUpi);
  params.set('pn', cleanName);
  if (cleanAmount) params.set('am', cleanAmount);
  params.set('cu', 'INR');
  if (invoiceNumber) params.set('tn', `Invoice ${invoiceNumber}`.substring(0, 50));
  if (invoiceId) params.set('tr', String(invoiceId).substring(0, 35));

  return `upi://pay?${params.toString()}`;
}

/**
 * Generate a high-resolution base64 PNG Data URL for a UPI payment QR code.
 * @param {object} params - Same as buildUpiUri
 * @returns {Promise<string>} data:image/png;base64,...
 */
export async function generateUpiQrDataUrl(params) {
  if (!params.upiId) return null;
  const uri = buildUpiUri(params);
  if (!uri) return null;

  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 200,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

