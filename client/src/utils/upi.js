import QRCode from 'qrcode';

/**
 * Validate a UPI Virtual Payment Address (VPA).
 * @param {string} upiId
 * @returns {boolean}
 */
export function isValidUpiId(upiId) {
  if (!upiId || typeof upiId !== 'string') return false;
  const trimmed = upiId.trim();
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  return upiRegex.test(trimmed);
}

/**
 * Build standard UPI Intent URI.
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
 * Generate a base64 PNG Data URL for a UPI payment QR code on the client.
 */
export async function generateUpiQrDataUrl(params) {
  if (!params?.upiId) return null;
  const uri = buildUpiUri(params);
  if (!uri) return null;

  try {
    return await QRCode.toDataURL(uri, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 180,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate UPI QR code:', err);
    return null;
  }
}

