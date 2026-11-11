import React, { useState, useEffect } from 'react';
import { numberToWords, formatIndianCurrency, formatDate } from '../../utils/helpers';
import { generateUpiQrDataUrl, isValidUpiId } from '../../utils/upi';

export default function InvoicePreview({ invoiceData }) {
  if (!invoiceData) {
    return (
      <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 rounded-lg">
        Invoice details will appear here
      </div>
    );
  }

  const { invoice = {}, business = {}, customer = {}, bankAccount = {} } = invoiceData;
  const items = invoice.items || [];
  const isGst = invoice.invoiceType !== 'NON_GST';
  const isInterstate = invoice.gstType === 'INTERSTATE';

  // Amount in words
  const words = numberToWords(invoice.grandTotal || 0);

  // UPI QR Code
  const upiId = bankAccount.upiId || business.upiId || null;
  const [upiQrUrl, setUpiQrUrl] = useState(null);

  // Dynamic payable amount: use remaining outstanding balance if partially paid
  const qrAmount = Number(
    invoice.outstandingAmount != null && Number(invoice.outstandingAmount) > 0
      ? invoice.outstandingAmount
      : invoice.grandTotal || 0
  );

  useEffect(() => {
    let isMounted = true;
    if (upiId && isValidUpiId(upiId)) {
      generateUpiQrDataUrl({
        upiId,
        payeeName: business.name,
        amount: qrAmount,
        invoiceNumber: invoice.invoiceNumber,
        invoiceId: invoice.id,
      }).then((url) => {
        if (isMounted) setUpiQrUrl(url);
      });
    } else {
      setUpiQrUrl(null);
    }
    return () => {
      isMounted = false;
    };
  }, [upiId, business.name, qrAmount, invoice.invoiceNumber, invoice.id]);

  return (
    <div className="bg-white text-black text-[11px] leading-tight font-sans p-6 max-w-4xl mx-auto shadow-md border border-gray-300 print:shadow-none print:border-none print:p-0 print:m-0 print:text-[10px]">
      {/* ── 1. HEADER ──────────────────────────────────────────────── */}
      <div className="text-center font-bold text-base tracking-wider py-1 border-b border-black uppercase">
        TAX INVOICE
      </div>

      {/* ── 2. SELLER & INVOICE DETAILS (2-COLUMN) ───────────────────── */}
      <div className="grid grid-cols-2 border-b border-black">
        {/* Left Column: Seller Details */}
        <div className="p-2 border-r border-black space-y-1">
          <div className="font-bold text-sm tracking-tight">{business.name || 'COMPANY NAME'}</div>
          <div>{business.address}</div>
          <div>
            {business.city ? `${business.city}, ` : ''}
            {business.state} {business.pincode ? `- ${business.pincode}` : ''}
          </div>
          {business.gstin && (
            <div className="font-semibold">
              GSTIN/UIN: <span className="font-mono">{business.gstin}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>State Name: {business.state || '-'}, Code: {business.stateCode || '-'}</span>
            <span>Contact: {business.phone || '-'}</span>
          </div>
        </div>

        {/* Right Column: Invoice Details Grid */}
        <div className="grid grid-cols-2 text-[10px]">
          <div className="p-1.5 border-r border-b border-black">
            <span className="text-gray-500 block text-[9px]">Invoice No.</span>
            <span className="font-bold font-mono text-xs">{invoice.invoiceNumber || 'DRAFT'}</span>
          </div>
          <div className="p-1.5 border-b border-black">
            <span className="text-gray-500 block text-[9px]">Dated</span>
            <span className="font-semibold">{formatDate(invoice.invoiceDate || new Date())}</span>
          </div>

          <div className="p-1.5 border-r border-b border-black">
            <span className="text-gray-500 block text-[9px]">Delivery Note</span>
            <span>{invoice.deliveryNote || '-'}</span>
          </div>
          <div className="p-1.5 border-b border-black">
            <span className="text-gray-500 block text-[9px]">Mode/Terms of Payment</span>
            <span>{invoice.paymentTerms || '-'}</span>
          </div>

          <div className="p-1.5 border-r border-b border-black">
            <span className="text-gray-500 block text-[9px]">Reference No. & Date</span>
            <span>{invoice.referenceNumber || '-'}</span>
          </div>
          <div className="p-1.5 border-b border-black">
            <span className="text-gray-500 block text-[9px]">Other References</span>
            <span>{invoice.otherReferences || '-'}</span>
          </div>

          <div className="p-1.5 border-r border-b border-black">
            <span className="text-gray-500 block text-[9px]">Buyer's Order No.</span>
            <span>{invoice.buyerOrderNumber || '-'}</span>
          </div>
          <div className="p-1.5 border-b border-black">
            <span className="text-gray-500 block text-[9px]">Order Date</span>
            <span>{invoice.buyerOrderDate ? formatDate(invoice.buyerOrderDate) : '-'}</span>
          </div>

          <div className="p-1.5 border-r border-b border-black">
            <span className="text-gray-500 block text-[9px]">Dispatch Doc No.</span>
            <span>{invoice.dispatchDocNumber || '-'}</span>
          </div>
          <div className="p-1.5 border-b border-black">
            <span className="text-gray-500 block text-[9px]">Delivery Note Date</span>
            <span>{invoice.deliveryNoteDate ? formatDate(invoice.deliveryNoteDate) : '-'}</span>
          </div>

          <div className="p-1.5 border-r border-b border-black">
            <span className="text-gray-500 block text-[9px]">Dispatched through</span>
            <span>{invoice.dispatchedThrough || '-'}</span>
          </div>
          <div className="p-1.5 border-b border-black">
            <span className="text-gray-500 block text-[9px]">Destination</span>
            <span>{invoice.destination || '-'}</span>
          </div>

          <div className="p-1.5 col-span-2">
            <span className="text-gray-500 block text-[9px]">Terms of Delivery</span>
            <span>{invoice.termsOfDelivery || '-'}</span>
          </div>
        </div>
      </div>

      {/* ── 3. CONSIGNEE & BUYER DETAILS ────────────────────────────── */}
      <div className="grid grid-cols-2 border-b border-black">
        {/* Consignee (Ship to) */}
        <div className="p-2 border-r border-black space-y-1">
          <div className="font-bold underline text-[10px] uppercase text-gray-700">Consignee (Ship to)</div>
          <div className="font-bold">{customer.name || 'Walk-in / Cash Customer'}</div>
          <div>{customer.shippingAddress || customer.billingAddress || '-'}</div>
          <div>GSTIN/UIN: <span className="font-mono">{customer.gstin || '-'}</span></div>
          <div>State Name: {customer.shippingState || customer.billingState || '-'}, Code: {customer.shippingStateCode || customer.billingStateCode || '-'}</div>
          <div>Contact person: {customer.contactPerson || '-'}</div>
          <div>Contact: {customer.phone || '-'}</div>
        </div>

        {/* Buyer (Bill to) */}
        <div className="p-2 space-y-1">
          <div className="font-bold underline text-[10px] uppercase text-gray-700">Buyer (Bill to)</div>
          <div className="font-bold">{customer.name || 'Walk-in / Cash Customer'}</div>
          <div>{customer.billingAddress || '-'}</div>
          <div>GSTIN/UIN: <span className="font-mono">{customer.gstin || '-'}</span></div>
          <div>State Name: {customer.billingState || '-'}, Code: {customer.billingStateCode || '-'}</div>
          <div>Contact person: {customer.contactPerson || '-'}</div>
          <div>Contact: {customer.phone || '-'}</div>
        </div>
      </div>

      {/* ── 4. PRODUCT TABLE (10 COLUMNS) ────────────────────────────── */}
      <div className="border-b border-black overflow-x-auto">
        <table className="w-full text-left border-collapse text-[10px]">
          <thead>
            <tr className="border-b border-black bg-gray-50 text-center font-bold">
              <th className="p-1 border-r border-black w-8">Sl No.</th>
              <th className="p-1 border-r border-black text-left">Description of Goods</th>
              <th className="p-1 border-r border-black w-16">HSN/SAC</th>
              <th className="p-1 border-r border-black w-12">GST Rate</th>
              <th className="p-1 border-r border-black w-16">Quantity Shipped</th>
              <th className="p-1 border-r border-black w-16">Quantity Billed</th>
              <th className="p-1 border-r border-black w-16 text-right">Rate</th>
              <th className="p-1 border-r border-black w-10">per</th>
              <th className="p-1 border-r border-black w-10 text-right">Disc. %</th>
              <th className="p-1 w-20 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((it, idx) => (
              <tr key={idx} className="align-top">
                <td className="p-1 border-r border-black text-center font-bold">{idx + 1}</td>
                <td className="p-1 border-r border-black font-medium">{it.description}</td>
                <td className="p-1 border-r border-black text-center font-mono">{it.hsnSacCode || '-'}</td>
                <td className="p-1 border-r border-black text-center font-mono">{it.gstRate || 0} %</td>
                <td className="p-1 border-r border-black text-center font-mono">
                  {Number(it.shippedQty || 0).toFixed(2)} {it.unit || 'PCS'}
                </td>
                <td className="p-1 border-r border-black text-center font-mono font-semibold">
                  {Number(it.billedQty || 0).toFixed(2)} {it.unit || 'PCS'}
                </td>
                <td className="p-1 border-r border-black text-right font-mono font-semibold">
                  {Number(it.rate || 0).toFixed(2)}
                </td>
                <td className="p-1 border-r border-black text-center uppercase">{it.unit || 'PCS'}</td>
                <td className="p-1 border-r border-black text-right font-mono">
                  {it.discountPercent ? `${Number(it.discountPercent).toFixed(1)}%` : ''}
                </td>
                <td className="p-1 text-right font-mono font-bold">
                  {formatIndianCurrency(it.amount || 0)}
                </td>
              </tr>
            ))}

            {/* Less Round Off Row */}
            {Number(invoice.roundOff || 0) !== 0 && (
              <tr className="border-t border-black text-[10px]">
                <td className="p-1 border-r border-black"></td>
                <td className="p-1 border-r border-black italic text-right font-semibold" colSpan={8}>
                  Less : ROUND OFF
                </td>
                <td className="p-1 text-right font-mono font-semibold">
                  {Number(invoice.roundOff) < 0
                    ? `(-)${Math.abs(Number(invoice.roundOff)).toFixed(2)}`
                    : `(+) ${Number(invoice.roundOff).toFixed(2)}`}
                </td>
              </tr>
            )}

            {/* Totals Row */}
            <tr className="border-t-2 border-black font-bold bg-gray-50 text-[10px]">
              <td className="p-1 border-r border-black"></td>
              <td className="p-1 border-r border-black text-right pr-2">Total</td>
              <td className="p-1 border-r border-black"></td>
              <td className="p-1 border-r border-black"></td>
              <td className="p-1 border-r border-black text-center font-mono">
                {Number(invoice.totalShippedQty || 0).toFixed(0)}
              </td>
              <td className="p-1 border-r border-black text-center font-mono">
                {Number(invoice.totalBilledQty || 0).toFixed(0)}
              </td>
              <td className="p-1 border-r border-black"></td>
              <td className="p-1 border-r border-black"></td>
              <td className="p-1 border-r border-black"></td>
              <td className="p-1 text-right font-mono text-xs">
                ₹{formatIndianCurrency(invoice.grandTotal || 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── 5. AMOUNT CHARGEABLE IN WORDS ──────────────────────────── */}
      <div className="p-2 border-b border-black flex justify-between items-baseline">
        <div>
          <span className="font-bold">Amount Chargeable (in words): </span>
          <span className="font-semibold italic capitalize">INR {words}</span>
        </div>
        <span className="text-[9px] font-bold text-gray-500">E. & O.E</span>
      </div>

      {/* ── 6. TAX SUMMARY TABLE ────────────────────────────────────── */}
      {isGst && (
        <div className="border-b border-black">
          <table className="w-full text-center border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-black bg-gray-50 font-bold">
                <th className="p-1 border-r border-black">Taxable Value</th>
                {!isInterstate ? (
                  <>
                    <th className="p-1 border-r border-black">Central Tax (CGST)</th>
                    <th className="p-1 border-r border-black">State Tax (SGST)</th>
                  </>
                ) : (
                  <th className="p-1 border-r border-black">Integrated Tax (IGST)</th>
                )}
                <th className="p-1">Total Tax Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-1 border-r border-black font-mono font-semibold">
                  ₹{formatIndianCurrency(invoice.taxableAmount || 0)}
                </td>
                {!isInterstate ? (
                  <>
                    <td className="p-1 border-r border-black font-mono">
                      ₹{formatIndianCurrency(invoice.cgstAmount || 0)}
                    </td>
                    <td className="p-1 border-r border-black font-mono">
                      ₹{formatIndianCurrency(invoice.sgstAmount || 0)}
                    </td>
                  </>
                ) : (
                  <td className="p-1 border-r border-black font-mono">
                    ₹{formatIndianCurrency(invoice.igstAmount || 0)}
                  </td>
                )}
                <td className="p-1 font-mono font-bold">
                  ₹{formatIndianCurrency(invoice.totalTax || 0)}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="p-1.5 border-t border-black text-[10px] bg-gray-50">
            <span className="font-bold">Tax Amount (in words): </span>
            <span className="italic font-semibold">
              {Number(invoice.totalTax || 0) > 0 ? `INR ${numberToWords(invoice.totalTax)}` : 'NIL'}
            </span>
          </div>
        </div>
      )}

      {/* ── 7. BANK DETAILS & SIGNATURE (2-COLUMN) ───────────────────── */}
      <div className="grid grid-cols-2 border-b border-black">
        {/* Left: Bank Details, UPI QR & Declaration */}
        <div className="p-2 border-r border-black flex flex-col justify-between">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-0.5 flex-1">
              <div className="font-bold underline text-[10px]">Company's Bank Details</div>
              <div><span className="text-gray-500">A/c Holder:</span> <span className="font-semibold">{bankAccount.accountHolder || business.name || '-'}</span></div>
              <div><span className="text-gray-500">Bank Name:</span> <span className="font-semibold">{bankAccount.bankName || '-'}</span></div>
              <div><span className="text-gray-500">A/c No.:</span> <span className="font-bold font-mono">{bankAccount.accountNumber || '-'}</span></div>
              <div><span className="text-gray-500">Branch & IFS:</span> <span className="font-semibold">{bankAccount.branch || '-'} & <span className="font-mono">{bankAccount.ifscCode || '-'}</span></span></div>
              {upiId && (
                <div><span className="text-gray-500">UPI ID:</span> <span className="font-mono font-semibold">{upiId}</span></div>
              )}
            </div>

            {/* UPI QR Code Block */}
            {upiQrUrl && (
              <div className="text-center p-1 border border-black rounded bg-white flex-shrink-0">
                <img src={upiQrUrl} alt="UPI QR" className="w-16 h-16 mx-auto block" />
                <div className="text-[7.5px] font-bold mt-0.5 tracking-tight">Scan &amp; Pay using any UPI app</div>
                <div className="text-[6.5px] font-mono text-gray-700 truncate max-w-[85px]">{upiId}</div>
                <div className="text-[5.5px] text-gray-500 leading-tight">Seller confirmation req.</div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-300 mt-2">
            <div className="font-bold underline text-[10px]">Declaration</div>
            <p className="text-[9px] text-gray-700 italic">
              {business.declaration ||
                'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.'}
            </p>
          </div>
        </div>

        {/* Right: PAN & Signatory */}
        <div className="p-2 flex flex-col justify-between">
          <div>
            {business.pan && (
              <div className="font-bold text-xs">
                Company's PAN: <span className="font-mono">{business.pan}</span>
              </div>
            )}
          </div>

          <div className="text-right pt-8">
            <div className="text-xs font-bold">for {business.name || 'COMPANY NAME'}</div>
            <div className="h-10"></div>
            <div className="text-[10px] font-semibold border-t border-gray-400 inline-block pt-0.5 px-4">
              Authorised Signatory
            </div>
          </div>
        </div>
      </div>

      {/* ── 8. FOOTER ────────────────────────────────────────────────── */}
      <div className="py-1.5 px-2 flex justify-between text-[9px] font-semibold text-gray-600">
        <span>SUBJECT TO {(business.jurisdiction || business.city || 'LOCAL').toUpperCase()} JURISDICTION</span>
        <span>This is a Computer Generated Invoice</span>
      </div>
    </div>
  );
}

