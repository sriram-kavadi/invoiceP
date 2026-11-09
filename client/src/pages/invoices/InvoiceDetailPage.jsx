import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Download,
  Printer,
  Share2,
  CreditCard,
  XCircle,
  ArrowLeft,
  FileCheck,
  Clock,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import PaymentModal from '../../components/ui/PaymentModal';
import InvoicePreview from '../../components/invoice/InvoicePreview';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const { business } = useAuth();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/invoices/${id}`);
      if (res.data.success) {
        setInvoice(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load invoice');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleDownloadPdf = async () => {
    try {
      toast.loading('Preparing PDF...', { id: 'pdf' });
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoice.invoiceNumber.replace(/[\/\\:]/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF downloaded!', { id: 'pdf' });
    } catch (err) {
      toast.error('Failed to download PDF', { id: 'pdf' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    if (!invoice) return;
    const phone = invoice.customer?.phone || '';
    const shareUrl = invoice.shareToken
      ? `${window.location.origin}/api/invoices/share/${invoice.shareToken}`
      : `${window.location.origin}/invoices/${invoice.id}`;

    const text = encodeURIComponent(
      `Dear ${invoice.customer?.name || 'Customer'},\n\nHere is your Tax Invoice *${invoice.invoiceNumber}* from *${business?.name || 'us'}* for *₹${Number(invoice.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}*.\n\nYou can view and download your invoice here:\n${shareUrl}\n\nThank you for your business!`
    );

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const waUrl = cleanPhone
      ? `https://wa.me/91${cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;

    window.open(waUrl, '_blank');
  };

  const handleIssueInvoice = async () => {
    setIssuing(true);
    try {
      const res = await api.post(`/invoices/${id}/issue`);
      if (res.data.success) {
        toast.success('Invoice issued with official PDF generated!');
        fetchInvoice();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue invoice');
    } finally {
      setIssuing(false);
    }
  };

  const handleCancelInvoice = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;

    setCancelling(true);
    try {
      const res = await api.post(`/invoices/${id}/cancel`, { reason: cancelReason });
      if (res.data.success) {
        toast.success('Invoice cancelled');
        setShowCancelModal(false);
        fetchInvoice();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-xs text-gray-400">Loading invoice...</div>;
  }

  if (!invoice) return null;

  const invoiceData = {
    invoice,
    business: invoice.sellerSnapshot || business || {},
    customer: invoice.customerSnapshot || invoice.customer || {},
    bankAccount: business?.bankAccounts?.[0] || {},
  };

  return (
    <div className="space-y-6">
      {/* Action Header - Hidden on print */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <Link to="/invoices" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-gray-900 font-mono">
                {invoice.invoiceNumber}
              </h1>
              <Badge status={invoice.status} />
              <Badge status={invoice.paymentStatus} />
            </div>
            <p className="text-xs text-gray-500">
              Created on {new Date(invoice.createdAt).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === 'DRAFT' && (
            <Button
              size="sm"
              icon={FileCheck}
              loading={issuing}
              onClick={handleIssueInvoice}
            >
              Issue Invoice
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={handleDownloadPdf}
          >
            Download PDF
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={Printer}
            onClick={handlePrint}
          >
            Print
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={Share2}
            onClick={handleWhatsAppShare}
            className="text-green-700 bg-green-50 border-green-200 hover:bg-green-100"
          >
            WhatsApp
          </Button>

          {invoice.status === 'ISSUED' && invoice.paymentStatus !== 'PAID' && (
            <Button
              size="sm"
              icon={CreditCard}
              onClick={() => setShowPaymentModal(true)}
            >
              Record Payment
            </Button>
          )}

          {invoice.status === 'ISSUED' && invoice.paymentStatus !== 'PAID' && (
            <Button
              variant="danger"
              size="sm"
              icon={XCircle}
              onClick={() => setShowCancelModal(true)}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Document Preview */}
      <div className="bg-gray-200/50 p-4 sm:p-8 rounded-2xl print:bg-white print:p-0">
        <InvoicePreview invoiceData={invoiceData} />
      </div>

      {/* Payment History & Audit Logs - Hidden on print */}
      <div className="print:hidden grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payments list */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-sm font-bold text-gray-900">Payment History</h2>
            <span className="text-xs font-semibold text-gray-500">
              Total Paid: ₹{Number(invoice.totalPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="space-y-2">
            {invoice.payments && invoice.payments.length > 0 ? (
              invoice.payments.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs flex justify-between items-center"
                >
                  <div>
                    <span className="font-bold text-green-700 text-sm block">
                      ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-gray-500 text-[10px]">
                      {p.paymentMethod} {p.transactionRef ? `• Ref: ${p.transactionRef}` : ''}
                    </span>
                  </div>
                  <span className="text-gray-400 text-[11px]">
                    {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No payments recorded yet</p>
            )}
          </div>
        </div>

        {/* Audit Log */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-gray-900 border-b pb-2">Audit Trail</h2>
          <div className="space-y-2">
            {invoice.auditLogs && invoice.auditLogs.length > 0 ? (
              invoice.auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="text-xs p-2 rounded bg-gray-50 border border-gray-100 flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-gray-800">{log.action}</span>
                    <span className="text-gray-400 text-[10px] block">
                      by {log.performedBy || 'System'}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(log.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No audit records</p>
            )}
          </div>
        </div>
      </div>

      {/* Payment Recording Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoice={invoice}
        onSuccess={() => fetchInvoice()}
      />

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Issued Invoice"
      >
        <form onSubmit={handleCancelInvoice} className="space-y-4">
          <p className="text-xs text-red-600 font-medium">
            Are you sure you want to cancel invoice {invoice.invoiceNumber}? This action is irreversible.
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="State the cancellation reason..."
              className="w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowCancelModal(false)}
              disabled={cancelling}
            >
              Back
            </Button>
            <Button type="submit" variant="danger" loading={cancelling}>
              Confirm Cancellation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

