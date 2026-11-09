import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import api from '../../services/api';

export default function PaymentModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}) {
  const outstanding = invoice ? Number(invoice.outstandingAmount || 0) : 0;

  const [amount, setAmount] = useState(outstanding > 0 ? String(outstanding) : '');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payAmt = parseFloat(amount);

    if (isNaN(payAmt) || payAmt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (payAmt > outstanding + 0.01) {
      toast.error(`Amount cannot exceed outstanding balance of ₹${outstanding.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/payments/invoices/${invoice.id}`, {
        amount: payAmt,
        paymentDate,
        paymentMethod,
        transactionRef,
        notes,
      });

      if (res.data.success) {
        toast.success('Payment recorded successfully');
        if (onSuccess) onSuccess(res.data.data);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Payment for ${invoice?.invoiceNumber || ''}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex justify-between">
          <div>
            <span className="text-blue-600 block">Total Invoice Value:</span>
            <span className="font-bold text-sm">
              ₹{Number(invoice?.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-blue-600 block">Outstanding Amount:</span>
            <span className="font-bold text-sm text-red-600">
              ₹{outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <Input
          label="Payment Amount (₹)"
          type="number"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />

        <Input
          label="Payment Date"
          type="date"
          required
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
        />

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Payment Method <span className="text-red-500">*</span>
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="UPI">UPI / QR Code</option>
            <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
            <option value="CASH">Cash</option>
            <option value="CHEQUE">Cheque</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <Input
          label="Transaction Reference / Cheque No."
          value={transactionRef}
          onChange={(e) => setTransactionRef(e.target.value)}
          placeholder="e.g. UPI Ref / UTR / Cheque Number"
        />

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Add any payment notes..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Save Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}

