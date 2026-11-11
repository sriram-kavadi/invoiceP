import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { generateUpiQrDataUrl, isValidUpiId } from '../utils/upi.js';
import { getQrDataUrl } from './storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Format a number in Indian currency format: 1,23,456.00
 */
function formatIndianCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return '0.00';
  const num = Number(amount);
  const fixed = Math.abs(num).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  let result = '';
  const len = intPart.length;
  if (len <= 3) {
    result = intPart;
  } else {
    result = intPart.slice(len - 3);
    let remaining = intPart.slice(0, len - 3);
    while (remaining.length > 2) {
      result = remaining.slice(remaining.length - 2) + ',' + result;
      remaining = remaining.slice(0, remaining.length - 2);
    }
    if (remaining.length > 0) result = remaining + ',' + result;
  }
  return (num < 0 ? '-' : '') + result + '.' + decPart;
}

/**
 * Format a date as DD-Mon-YY (e.g. 10-Apr-24)
 */
function formatDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dd = String(d.getDate()).padStart(2, '0');
  const mon = months[d.getMonth()];
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mon}-${yy}`;
}

/**
 * Convert a number to words (Indian numbering system)
 */
function numberToWords(num) {
  if (num === null || num === undefined || isNaN(Number(num))) return 'Zero';
  const n = Math.abs(Math.round(Number(num)));
  if (n === 0) return 'Zero';

  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen',
    'Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  function convertTwoDigit(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }

  function convertThreeDigit(n) {
    if (n === 0) return '';
    if (n < 100) return convertTwoDigit(n);
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertTwoDigit(n % 100) : '');
  }

  let parts = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  if (crore) parts.push(convertThreeDigit(crore) + ' Crore');
  if (lakh) parts.push(convertThreeDigit(lakh) + ' Lakh');
  if (thousand) parts.push(convertThreeDigit(thousand) + ' Thousand');
  if (rest) parts.push(convertThreeDigit(rest));

  return parts.join(' ');
}

/**
 * Amount in words with paise
 */
function amountInWords(amount) {
  if (!amount && amount !== 0) return 'Zero Only';
  const num = Number(amount);
  const rupees = Math.floor(Math.abs(num));
  const paise = Math.round((Math.abs(num) - rupees) * 100);
  let words = numberToWords(rupees);
  if (paise > 0) {
    words += ' and ' + numberToWords(paise) + ' Paise';
  }
  return words + ' Only';
}

/**
 * Format quantity: "300.00 WAL" style
 */
function formatQty(qty, unit) {
  if (qty === null || qty === undefined || qty === '') return '';
  const q = Number(qty);
  if (isNaN(q)) return String(qty);
  return q.toFixed(2) + (unit ? ' ' + unit : '');
}

/**
 * Safe string – return empty string if falsy
 */
function s(val) {
  return val || '';
}

// ─── PDF Service ─────────────────────────────────────────────────────────────

class PdfService {
  /**
   * Generate a PDF from invoice data, write to outputPath, and return the Buffer.
   */
  async generateInvoicePdf(invoiceData, outputPath) {
    const html = await this.generateInvoiceHtml(invoiceData);

    let browser;
    try {
      let executablePath = null;
      let chromiumArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ];

      // On Vercel / AWS Lambda environment
      if (process.env.VERCEL) {
        try {
          const chromium = (await import('@sparticuz/chromium')).default;
          executablePath = await chromium.executablePath();
          chromiumArgs = chromium.args;
        } catch (err) {
          console.warn('[PDF Service] @sparticuz/chromium not available:', err.message);
        }
      }

      if (!executablePath) {
        const systemBrowsers = [
          process.env.PUPPETEER_EXECUTABLE_PATH,
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
          'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
        ];
        executablePath = systemBrowsers.find((p) => p && fs.existsSync(p));
      }

      browser = await puppeteer.launch({
        headless: true,
        ...(executablePath ? { executablePath } : {}),
        args: chromiumArgs,
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '6mm', right: '6mm', bottom: '6mm', left: '6mm' },
      });

      if (outputPath) {
        try {
          const finalPath = process.env.VERCEL
            ? path.join('/tmp', path.basename(outputPath))
            : outputPath;
          const dir = path.dirname(finalPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(finalPath, pdfBuffer);
        } catch (fsErr) {
          console.warn('[PDF Service] Disk write skipped (ephemeral environment):', fsErr.message);
        }
      }

      return pdfBuffer;
    } finally {
      if (browser) await browser.close();
    }
  }

  /**
   * Build the complete HTML string for the invoice.
   */
  async generateInvoiceHtml(invoiceData) {
    const { invoice, business, customer, bankAccount } = invoiceData;

    // ── Derived flags ────────────────────────────────────────────────────────
    const isGst = invoice.gstType && invoice.gstType !== 'NON_GST';
    const isInterstate = invoice.gstType === 'INTERSTATE';
    const isIntrastate = invoice.gstType === 'INTRASTATE';

    // ── Computed totals (fall back to whatever the caller provides) ──────────
    const grandTotal = Number(invoice.grandTotal || 0);
    const roundOff   = Number(invoice.roundOff   || 0);
    const totalTax   = Number(invoice.totalTax   || 0);

    // ── Tax summary rows from items ──────────────────────────────────────────
    // Group by rate so we can produce one row per rate bracket
    const taxGroups = {};
    if (isGst && invoice.items && invoice.items.length) {
      for (const item of invoice.items) {
        const rate = Number(item.gstRate || 0);
        const key  = rate.toFixed(2);
        if (!taxGroups[key]) {
          taxGroups[key] = {
            rate,
            taxableValue: 0,
            cgstRate:  Number(item.cgstRate  || rate / 2),
            cgstAmt:   0,
            sgstRate:  Number(item.sgstRate  || rate / 2),
            sgstAmt:   0,
            igstRate:  Number(item.igstRate  || rate),
            igstAmt:   0,
          };
        }
        taxGroups[key].taxableValue += Number(item.amount || 0);
        taxGroups[key].cgstAmt  += Number(item.cgstAmount || 0);
        taxGroups[key].sgstAmt  += Number(item.sgstAmount || 0);
        taxGroups[key].igstAmt  += Number(item.igstAmount || 0);
      }
    }
    const taxRows = Object.values(taxGroups);

    // ── Tax-related totals ───────────────────────────────────────────────────
    const totalCgst = taxRows.reduce((s, r) => s + r.cgstAmt, 0);
    const totalSgst = taxRows.reduce((s, r) => s + r.sgstAmt, 0);
    const totalIgst = taxRows.reduce((s, r) => s + r.igstAmt, 0);
    const totalTaxableValue = taxRows.reduce((s, r) => s + r.taxableValue, 0);

    const taxAmtWords = isGst && totalTax > 0
      ? `INR ${amountInWords(totalTax)}`
      : 'NIL';

    // ── Items HTML ───────────────────────────────────────────────────────────
    const items = invoice.items || [];
    const itemRows = items.map((item, idx) => {
      const slNo       = item.slNo || idx + 1;
      const desc       = s(item.description);
      const hsn        = s(item.hsnSacCode);
      const gstRate    = item.gstRate != null ? Number(item.gstRate).toFixed(2) + '%' : '';
      const shippedQty = formatQty(item.shippedQty, item.unit);
      const billedQty  = formatQty(item.billedQty,  item.unit);
      const rate       = item.rate != null ? formatIndianCurrency(item.rate) : '';
      const per        = s(item.unit);
      const disc       = item.discountPercent != null ? Number(item.discountPercent).toFixed(2) + '%' : '';
      const amount     = item.amount != null ? formatIndianCurrency(item.amount) : '';

      const gstCell = isGst ? `<td class="tc center">${gstRate}</td>` : '';

      return `
        <tr>
          <td class="tc center">${slNo}</td>
          <td class="tc">${desc}</td>
          <td class="tc center">${hsn}</td>
          ${gstCell}
          <td class="tc center">${shippedQty}</td>
          <td class="tc center">${billedQty}</td>
          <td class="tc right">${rate}</td>
          <td class="tc center">${per}</td>
          <td class="tc center">${disc}</td>
          <td class="tc right">${amount}</td>
        </tr>`;
    }).join('');

    // Dynamic blank filler rows: fills printable A4 portrait page intelligently
    const targetRows = isGst ? 12 : 14;
    const fillerCnt = Math.max(0, targetRows - items.length);
    const gstBlank  = isGst ? '<td class="tc"></td>' : '';
    const fillerRows = Array.from({ length: fillerCnt }, () => `
      <tr class="filler-row">
        <td class="tc">&nbsp;</td>
        <td class="tc"></td>
        <td class="tc"></td>
        ${gstBlank}
        <td class="tc"></td>
        <td class="tc"></td>
        <td class="tc"></td>
        <td class="tc"></td>
        <td class="tc"></td>
        <td class="tc"></td>
      </tr>`).join('');

    // Totals row
    const gstTotalBlank = isGst ? '<td class="tc"></td>' : '';
    const totalRow = `
      <tr class="totals-row">
        <td class="tc center bold" colspan="${isGst ? 4 : 3}">Total</td>
        <td class="tc center bold">${formatQty(invoice.totalShippedQty, '')}</td>
        <td class="tc center bold">${formatQty(invoice.totalBilledQty, '')}</td>
        <td class="tc"></td>
        <td class="tc"></td>
        <td class="tc"></td>
        <td class="tc right bold">${formatIndianCurrency(grandTotal + (roundOff < 0 ? Math.abs(roundOff) : -roundOff))}</td>
      </tr>`;

    // Round off row (only if non-zero)
    const roundOffRow = roundOff !== 0 ? `
      <tr>
        <td class="tc" colspan="${isGst ? 9 : 8}">Less: ROUND OFF</td>
        <td class="tc right">${formatIndianCurrency(roundOff)}</td>
      </tr>` : '';

    // ── Tax summary table HTML ───────────────────────────────────────────────
    let taxSummaryHtml = '';
    if (isGst) {
      const taxSummaryRows = taxRows.map(r => {
        if (isIntrastate) {
          return `
            <tr>
              <td class="ts">${formatIndianCurrency(r.taxableValue)}</td>
              <td class="ts center">${r.cgstRate.toFixed(2)}%</td>
              <td class="ts right">${formatIndianCurrency(r.cgstAmt)}</td>
              <td class="ts center">${r.sgstRate.toFixed(2)}%</td>
              <td class="ts right">${formatIndianCurrency(r.sgstAmt)}</td>
              <td class="ts center">—</td>
              <td class="ts right">—</td>
              <td class="ts right">${formatIndianCurrency(r.cgstAmt + r.sgstAmt)}</td>
            </tr>`;
        } else {
          return `
            <tr>
              <td class="ts">${formatIndianCurrency(r.taxableValue)}</td>
              <td class="ts center">—</td>
              <td class="ts right">—</td>
              <td class="ts center">—</td>
              <td class="ts right">—</td>
              <td class="ts center">${r.igstRate.toFixed(2)}%</td>
              <td class="ts right">${formatIndianCurrency(r.igstAmt)}</td>
              <td class="ts right">${formatIndianCurrency(r.igstAmt)}</td>
            </tr>`;
        }
      }).join('');

      const taxTotalsRow = `
        <tr class="totals-row">
          <td class="ts bold">${formatIndianCurrency(totalTaxableValue)}</td>
          <td class="ts center bold">${isIntrastate ? '' : '—'}</td>
          <td class="ts right bold">${isIntrastate ? formatIndianCurrency(totalCgst) : '—'}</td>
          <td class="ts center bold">${isIntrastate ? '' : '—'}</td>
          <td class="ts right bold">${isIntrastate ? formatIndianCurrency(totalSgst) : '—'}</td>
          <td class="ts center bold">${isInterstate ? '' : '—'}</td>
          <td class="ts right bold">${isInterstate ? formatIndianCurrency(totalIgst) : '—'}</td>
          <td class="ts right bold">${formatIndianCurrency(totalTax)}</td>
        </tr>`;

      taxSummaryHtml = `
        <table class="tax-table">
          <thead>
            <tr>
              <th class="ts" rowspan="2">Taxable<br>Value</th>
              <th class="ts center" colspan="2">Central Tax</th>
              <th class="ts center" colspan="2">State Tax</th>
              <th class="ts center" colspan="2">Integrated Tax</th>
              <th class="ts center" rowspan="2">Total<br>Tax Amount</th>
            </tr>
            <tr>
              <th class="ts center">Rate</th>
              <th class="ts center">Amount</th>
              <th class="ts center">Rate</th>
              <th class="ts center">Amount</th>
              <th class="ts center">Rate</th>
              <th class="ts center">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${taxSummaryRows}
            ${taxTotalsRow}
          </tbody>
        </table>
        <div class="tax-words-row">
          Tax Amount (in words): <strong>${taxAmtWords}</strong>
        </div>`;
    }

    // ── Invoice fields (2-column key-value grid for compact layout) ──────────
    const refDateFormatted = formatDate(invoice.referenceDate);
    const refCombined = [s(invoice.referenceNumber), refDateFormatted].filter(Boolean).join(' dt. ');
    const buyerOrderDateFormatted = formatDate(invoice.buyerOrderDate);
    const deliveryNoteDateFormatted = formatDate(invoice.deliveryNoteDate);

    const rightGridRows = [
      {
        l1: 'Invoice No.', v1: s(invoice.invoiceNumber) || 'DRAFT',
        l2: 'Dated', v2: formatDate(invoice.invoiceDate) || '-'
      },
      {
        l1: 'Delivery Note', v1: s(invoice.deliveryNote) || '-',
        l2: 'Mode/Terms of Payment', v2: s(invoice.paymentTerms) || '-'
      },
      {
        l1: 'Reference No. & Date', v1: refCombined || '-',
        l2: 'Other References', v2: s(invoice.otherReferences) || '-'
      },
      {
        l1: "Buyer's Order No.", v1: s(invoice.buyerOrderNumber) || '-',
        l2: 'Order Date', v2: buyerOrderDateFormatted || '-'
      },
      {
        l1: 'Dispatch Doc No.', v1: s(invoice.dispatchDocNumber) || '-',
        l2: 'Delivery Note Date', v2: deliveryNoteDateFormatted || '-'
      },
      {
        l1: 'Dispatched through', v1: s(invoice.dispatchedThrough) || '-',
        l2: 'Destination', v2: s(invoice.destination) || '-'
      },
      {
        l1: 'Terms of Delivery', v1: s(invoice.termsOfDelivery) || '-',
        l2: '', v2: ''
      }
    ];

    const invoiceFieldRows = rightGridRows.map((row) => `
      <tr>
        <td class="field-label">${row.l1}</td>
        <td class="field-value">${row.v1}</td>
        <td class="field-label">${row.l2}</td>
        <td class="field-value">${row.v2}</td>
      </tr>`).join('');

    // ── Consignee / Buyer addresses ──────────────────────────────────────────
    const shipAddr = [
      s(customer.shippingAddress),
      s(customer.shippingCity),
      s(customer.shippingState) + (customer.shippingStateCode ? ` - ${customer.shippingStateCode}` : ''),
    ].filter(Boolean).join(', ');

    const billAddr = [
      s(customer.billingAddress),
      s(customer.billingCity),
      s(customer.billingState) + (customer.billingStateCode ? ` - ${customer.billingStateCode}` : ''),
    ].filter(Boolean).join(', ');

    const sellerAddr = [
      s(business.address),
      s(business.city),
      s(business.state) + (business.stateCode ? ` - ${business.stateCode}` : ''),
    ].filter(Boolean).join(', ');

    // ── Bank details & Dynamic / Uploaded UPI QR ────────────────────────────
    const bank = bankAccount || {};
    const bankDetailsHtml = `
      <div class="bank-row"><span class="bank-label">A/c Holder:</span> ${s(bank.accountHolder || business.name)}</div>
      <div class="bank-row"><span class="bank-label">Bank Name:</span> ${s(bank.bankName || '-')}</div>
      <div class="bank-row"><span class="bank-label">A/c No.:</span> <span style="font-family: monospace; font-weight: bold;">${s(bank.accountNumber || '-')}</span></div>
      <div class="bank-row"><span class="bank-label">Branch &amp; IFS Code:</span> ${s(bank.branch || '-')}${bank.ifscCode ? ' / ' + bank.ifscCode : ''}</div>
      ${bank.upiId || business.upiId ? `<div class="bank-row"><span class="bank-label">UPI ID:</span> <span style="font-family: monospace;">${s(bank.upiId || business.upiId)}</span></div>` : ''}`;

    const upiId = bank.upiId || business.upiId || null;
    let upiQrHtml = '';
    const showUpiQr = business.settings?.showUpiQr ?? true;
    const qrMode = business.upiQrMode || (business.upiQrPath ? 'UPLOADED' : 'DYNAMIC');

    if (showUpiQr && qrMode !== 'DISABLED') {
      if (qrMode === 'UPLOADED' && business.upiQrPath) {
        // Uploaded static QR code mode (Supabase Storage / Data URL / URL)
        const qrDataUrl = await getQrDataUrl(business.upiQrPath);

        if (qrDataUrl) {
          upiQrHtml = `
            <div class="upi-qr-block" style="text-align: center; margin-left: 8px; flex-shrink: 0; border: 1px solid #000; padding: 4px; background: #fff;">
              <img src="${qrDataUrl}" alt="UPI QR" style="width: 76px; height: 76px; object-fit: contain; display: block; margin: 0 auto;" />
              <div style="font-size: 6.5pt; font-weight: bold; margin-top: 2px;">Scan &amp; Pay using any UPI app</div>
              <div style="font-size: 5pt; color: #555; max-width: 95px; line-height: 1.1; margin-top: 2px;">Seller QR • Enter payable amount in app • Scan does not confirm payment.</div>
            </div>`;
        }
      } else if (upiId && isValidUpiId(upiId)) {
        // Dynamic invoice-specific UPI QR mode
        const qrAmount = Number(
          invoice.outstandingAmount != null && Number(invoice.outstandingAmount) > 0
            ? invoice.outstandingAmount
            : grandTotal
        );

        try {
          const upiQrDataUrl = await generateUpiQrDataUrl({
            upiId,
            payeeName: business.name,
            amount: qrAmount,
            invoiceNumber: invoice.invoiceNumber,
            invoiceId: invoice.id,
          });
          if (upiQrDataUrl) {
            upiQrHtml = `
              <div class="upi-qr-block" style="text-align: center; margin-left: 8px; flex-shrink: 0; border: 1px solid #000; padding: 3px; background: #fff;">
                <img src="${upiQrDataUrl}" alt="UPI QR" style="width: 74px; height: 74px; display: block; margin: 0 auto;" />
                <div style="font-size: 6.5pt; font-weight: bold; margin-top: 2px;">Scan &amp; Pay using any UPI app</div>
                <div style="font-size: 6pt; font-family: monospace; color: #111;">${s(upiId)}</div>
                <div style="font-size: 5pt; color: #666; max-width: 95px; line-height: 1.1; margin-top: 1px;">Scan does not confirm payment; seller verification required.</div>
              </div>`;
          }
        } catch (qrErr) {
          console.warn('[PDF Service] QR generation skipped:', qrErr.message);
        }
      }
    }

    // ── Declaration ──────────────────────────────────────────────────────────
    const declaration = s(business.declaration) ||
      'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.';

    // ── Grand total words ────────────────────────────────────────────────────
    const grandTotalWords = `INR ${amountInWords(grandTotal)}`;

    // ── GST column header ────────────────────────────────────────────────────
    const gstColHeader = isGst ? '<th class="th center">GST Rate</th>' : '';

    // ── Full HTML ────────────────────────────────────────────────────────────
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Tax Invoice - ${s(invoice.invoiceNumber)}</title>
  <style>
    /* ── Reset & Base ─────────────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      color: #000;
      background: #fff;
      line-height: 1.3;
    }

    /* ── Invoice wrapper ──────────────────────────────────────────────── */
    .invoice-wrapper {
      width: 100%;
      max-width: 780px;
      margin: 0 auto;
      border: 1px solid #000;
    }

    /* ── Generic table reset ──────────────────────────────────────────── */
    table {
      border-collapse: collapse;
      width: 100%;
    }

    /* ── Invoice title ────────────────────────────────────────────────── */
    .invoice-title {
      text-align: center;
      font-size: 14pt;
      font-weight: bold;
      padding: 6px 4px;
      border-bottom: 1px solid #000;
      letter-spacing: 1px;
    }

    /* ── Top section: seller info (left) + invoice fields (right) ──────── */
    .top-section {
      display: grid;
      grid-template-columns: 50% 50%;
      border-bottom: 1px solid #000;
    }

    .seller-block {
      padding: 4px 6px;
      border-right: 1px solid #000;
      font-size: 8pt;
    }

    .seller-name {
      font-size: 10pt;
      font-weight: bold;
      margin-bottom: 2px;
    }

    .seller-detail {
      font-size: 7.5pt;
      margin-bottom: 1px;
    }

    /* ── Invoice fields table (right side 4-column grid) ─────────────────── */
    .invoice-fields-table {
      width: 100%;
      height: 100%;
      border-collapse: collapse;
    }

    .invoice-fields-table tr {
      border-bottom: 1px solid #000;
    }

    .invoice-fields-table tr:last-child {
      border-bottom: none;
    }

    .field-label {
      padding: 1.5px 3px;
      font-weight: bold;
      font-size: 7pt;
      color: #333;
      border-right: 1px solid #000;
      vertical-align: top;
      width: 22%;
      background: #fafafa;
    }

    .field-value {
      padding: 1.5px 3px;
      vertical-align: top;
      font-size: 7.5pt;
      font-weight: 500;
      border-right: 1px solid #000;
      width: 28%;
    }

    .field-value:last-child {
      border-right: none;
    }

    /* ── Consignee / Buyer section (side-by-side) ───────────────────── */
    .consignee-buyer-section {
      display: grid;
      grid-template-columns: 50% 50%;
      border-bottom: 1px solid #000;
    }

    .address-block {
      padding: 4px 6px;
      font-size: 7.5pt;
    }

    .address-block-left {
      border-right: 1px solid #000;
    }

    .address-label {
      font-size: 7pt;
      font-weight: bold;
      margin-bottom: 2px;
      text-transform: uppercase;
      text-decoration: underline;
      color: #222;
    }

    .address-name {
      font-size: 8.5pt;
      font-weight: bold;
      margin-bottom: 1px;
    }

    .address-detail {
      font-size: 7.5pt;
      margin-bottom: 1px;
    }

    .address-gstin {
      font-size: 7.5pt;
      margin-top: 1px;
    }

    /* ── Product table ───────────────────────────────────────────────── */
    .product-table {
      width: 100%;
      border-bottom: 1px solid #000;
    }

    .product-table th.th {
      border: 1px solid #000;
      padding: 3px 4px;
      font-size: 8pt;
      font-weight: bold;
      background: #f5f5f5;
      vertical-align: middle;
      text-align: center;
    }

    .product-table td.tc {
      border: 1px solid #000;
      padding: 2px 4px;
      font-size: 8pt;
      vertical-align: top;
    }

    /* ── Alignment helpers ───────────────────────────────────────────── */
    .center { text-align: center; }
    .right  { text-align: right; }
    .bold   { font-weight: bold; }

    /* ── Filler rows ─────────────────────────────────────────────────── */
    .filler-row td { height: 26px; }

    /* ── Totals row ──────────────────────────────────────────────────── */
    .totals-row td {
      font-weight: bold;
      background: #fafafa;
    }

    /* ── Amount in words row ─────────────────────────────────────────── */
    .amount-words-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 4px 6px;
      border-bottom: 1px solid #000;
      font-size: 8.5pt;
    }

    .amount-words-label {
      flex: 1;
    }

    .eoe-label {
      white-space: nowrap;
      font-weight: bold;
      font-style: italic;
      margin-left: 10px;
    }

    /* ── Tax summary table ───────────────────────────────────────────── */
    .tax-section {
      border-bottom: 1px solid #000;
      padding: 0;
    }

    .tax-table {
      width: 100%;
    }

    .tax-table th.ts,
    .tax-table td.ts {
      border: 1px solid #000;
      padding: 2px 5px;
      font-size: 8pt;
      vertical-align: middle;
    }

    .tax-table th.ts {
      background: #f5f5f5;
      font-weight: bold;
      text-align: center;
    }

    .tax-words-row {
      padding: 3px 6px;
      font-size: 8.5pt;
      border-top: 1px solid #000;
    }

    /* ── Bottom section: Bank details (left) | Signatory (right) ─────── */
    .bottom-section {
      display: grid;
      grid-template-columns: 60% 40%;
      min-height: 110px;
    }

    .bank-details-block {
      border-right: 1px solid #000;
      padding: 5px 6px;
    }

    .bank-section-title {
      font-weight: bold;
      font-size: 8.5pt;
      margin-bottom: 4px;
      text-decoration: underline;
    }

    .bank-row {
      font-size: 8pt;
      margin-bottom: 2px;
    }

    .bank-label {
      font-weight: bold;
    }

    .declaration-text {
      margin-top: 8px;
      font-size: 7.5pt;
      color: #333;
      font-style: italic;
      border-top: 1px dashed #999;
      padding-top: 4px;
    }

    .signatory-block {
      padding: 5px 6px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .pan-row {
      font-size: 8.5pt;
      margin-bottom: 4px;
    }

    .pan-label { font-weight: bold; }

    .signatory-company {
      font-weight: bold;
      font-size: 9pt;
      margin-bottom: 42px; /* ample space for physical signature or stamp */
    }

    .signatory-title {
      font-size: 8pt;
      text-align: right;
      border-top: 1px solid #000;
      padding-top: 2px;
      margin-top: 2px;
    }

    /* ── Footer ──────────────────────────────────────────────────────── */
    .invoice-footer {
      display: flex;
      justify-content: space-between;
      padding: 3px 6px;
      border-top: 1px solid #000;
      font-size: 7.5pt;
    }

    /* ── Print ───────────────────────────────────────────────────────── */
    @media print {
      @page {
        size: A4 portrait;
        margin: 6mm;
      }
      body { background: #fff; }

      .invoice-wrapper {
        border: 1px solid #000;
        box-shadow: none;
      }

      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }

      /* Avoid page breaks inside key blocks */
      .amount-words-section,
      .tax-section,
      .bottom-section,
      .invoice-footer { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">

    <!-- ── 1. TITLE ──────────────────────────────────────────────────── -->
    <div class="invoice-title">TAX INVOICE</div>

    <!-- ── 2. SELLER INFO + INVOICE FIELDS ──────────────────────────── -->
    <div class="top-section">
      <!-- Left: seller -->
      <div class="seller-block">
        <div class="seller-name">${s(business.name)}</div>
        <div class="seller-detail">${sellerAddr}</div>
        ${business.gstin    ? `<div class="seller-detail"><strong>GSTIN:</strong> ${business.gstin}</div>` : ''}
        ${business.state    ? `<div class="seller-detail"><strong>State:</strong> ${s(business.state)}${business.stateCode ? ` &nbsp;Code: ${business.stateCode}` : ''}</div>` : ''}
        ${business.phone    ? `<div class="seller-detail"><strong>Contact:</strong> ${s(business.phone)}</div>` : ''}
        ${business.email    ? `<div class="seller-detail"><strong>Email:</strong> ${s(business.email)}</div>` : ''}
      </div>

      <!-- Right: invoice fields -->
      <div>
        <table class="invoice-fields-table">
          <tbody>
            ${invoiceFieldRows}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── 3. CONSIGNEE + BUYER (SIDE-BY-SIDE) ─────────────────────── -->
    <div class="consignee-buyer-section">
      <!-- Consignee (Ship to) -->
      <div class="address-block address-block-left">
        <div class="address-label">Consignee (Ship to)</div>
        <div class="address-name">${s(customer.name) || 'Walk-in / Cash Customer'}</div>
        <div class="address-detail">${shipAddr || '-'}</div>
        ${customer.gstin ? `<div class="address-gstin"><strong>GSTIN/UIN:</strong> ${customer.gstin}</div>` : ''}
        ${customer.shippingState || customer.state ? `<div class="address-detail"><strong>State Name:</strong> ${s(customer.shippingState || customer.state)}${customer.shippingStateCode || customer.stateCode ? `, Code: ${customer.shippingStateCode || customer.stateCode}` : ''}</div>` : ''}
        ${customer.contactPerson ? `<div class="address-detail"><strong>Contact:</strong> ${s(customer.contactPerson)}</div>` : ''}
      </div>

      <!-- Buyer (Bill to) -->
      <div class="address-block address-block-right">
        <div class="address-label">Buyer (Bill to)</div>
        <div class="address-name">${s(customer.name) || 'Walk-in / Cash Customer'}</div>
        <div class="address-detail">${billAddr || '-'}</div>
        ${customer.gstin  ? `<div class="address-gstin"><strong>GSTIN/UIN:</strong> ${customer.gstin}</div>` : ''}
        ${customer.billingState || customer.state ? `<div class="address-detail"><strong>State Name:</strong> ${s(customer.billingState || customer.state)}${customer.billingStateCode || customer.stateCode ? `, Code: ${customer.billingStateCode || customer.stateCode}` : ''}</div>` : ''}
        ${customer.phone  ? `<div class="address-detail"><strong>Contact:</strong> ${s(customer.phone)}</div>` : ''}
      </div>
    </div>

    <!-- ── 4. PRODUCT TABLE ──────────────────────────────────────────── -->
    <table class="product-table">
      <thead>
        <tr>
          <th class="th" style="width:4%">Sl<br>No.</th>
          <th class="th" style="width:${isGst ? '25%' : '28%'}">Description of Goods</th>
          <th class="th" style="width:8%">HSN/<br>SAC</th>
          ${gstColHeader}
          <th class="th" style="width:8%">Quantity<br>Shipped</th>
          <th class="th" style="width:8%">Quantity<br>Billed</th>
          <th class="th" style="width:8%">Rate</th>
          <th class="th" style="width:4%">Per</th>
          <th class="th" style="width:5%">Disc%</th>
          <th class="th" style="width:10%">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${fillerRows}
        ${totalRow}
        ${roundOffRow}
      </tbody>
    </table>

    <!-- ── 5. AMOUNT IN WORDS ─────────────────────────────────────────── -->
    <div class="amount-words-section">
      <div class="amount-words-label">
        <strong>Amount Chargeable (in words):</strong><br>
        ${grandTotalWords}
      </div>
      <div class="eoe-label">E.&amp;O.E</div>
    </div>

    <!-- ── 6. TAX SUMMARY ─────────────────────────────────────────────── -->
    ${isGst ? `<div class="tax-section">${taxSummaryHtml}</div>` : ''}

    <!-- ── 7. BOTTOM: BANK DETAILS + SIGNATORY ───────────────────────── -->
    <div class="bottom-section">
      <!-- Bank Details + UPI QR + Declaration -->
      <div class="bank-details-block" style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="flex: 1;">
          <div class="bank-section-title">Company's Bank Details</div>
          ${bankDetailsHtml}
          <div class="declaration-text">${declaration}</div>
        </div>
        ${upiQrHtml}
      </div>

      <!-- PAN + Signatory -->
      <div class="signatory-block">
        ${business.pan ? `<div class="pan-row"><span class="pan-label">Company's PAN:</span> ${business.pan}</div>` : '<div></div>'}
        <div>
          <div class="signatory-company">for ${s(business.name)}</div>
          <div class="signatory-title">Authorised Signatory</div>
        </div>
      </div>
    </div>

    <!-- ── 8. FOOTER ─────────────────────────────────────────────────── -->
    <div class="invoice-footer">
      <span>SUBJECT TO ${s(business.jurisdiction || business.city || '').toUpperCase()} JURISDICTION</span>
      <span>This is a Computer Generated Invoice</span>
    </div>

  </div>
</body>
</html>`;
  }
}

const pdfService = new PdfService();
export default pdfService;
export { PdfService };
