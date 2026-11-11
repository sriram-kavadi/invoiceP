import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, Download, CreditCard, XCircle, Copy, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import PaymentModal from '../../components/ui/PaymentModal';
import Modal from '../../components/ui/Modal';

export default function InvoicesPage() {
  const { business } = useAuth();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal states
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [cancelModalInvoice, setCancelModalInvoice] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['invoices', business?.id, page, statusFilter, paymentStatusFilter, submittedSearch],
    queryFn: async () => {
      let url = `/invoices?page=${page}&limit=15&search=${encodeURIComponent(submittedSearch)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (paymentStatusFilter) url += `&paymentStatus=${paymentStatusFilter}`;

      const res = await api.get(url);
      if (res.data.success) return res.data.data;
      throw new Error(res.data.message || 'Failed to load invoices');
    },
    enabled: !!business?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const invoices = data?.invoices || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSubmittedSearch(searchInput);
  };

  const handleDownloadPdf = async (id, invoiceNumber) => {
    try {
      toast.loading('Generating PDF...', { id: 'pdf-dl' });
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });

      const contentType = res.headers['content-type'] || res.data.type || '';
      if (contentType.includes('text/html') || res.headers['x-fallback-print']) {
        const htmlText = await res.data.text();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlText);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => { printWindow.print(); }, 400);
          toast.success('Invoice opened for printing/saving as PDF', { id: 'pdf-dl' });
          return;
        }
      }

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoiceNumber.replace(/[\/\\:]/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF downloaded!', { id: 'pdf-dl' });
    } catch (err) {
      console.error('Failed to download PDF:', err);
      // Fallback: open print preview
      window.open(`/api/invoices/share/${id}`, '_blank');
      toast.error('Could not download directly; opened invoice preview.', { id: 'pdf-dl' });
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await api.post(`/invoices/${id}/duplicate`);
      if (res.data.success) {
        toast.success('Invoice duplicated as new draft');
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    } catch (err) {
      toast.error('Failed to duplicate invoice');
    }
  };

  const handleCancelInvoice = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    setCancelling(true);
    try {
      const res = await api.post(`/invoices/${cancelModalInvoice.id}/cancel`, {
        reason: cancelReason,
      });
      if (res.data.success) {
        toast.success('Invoice cancelled');
        setCancelModalInvoice(null);
        setCancelReason('');
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel invoice');
    } finally {
      setCancelling(false);
    }
  };

  const tabs = [
    { label: 'All Invoices', status: '', payStatus: '' },
    { label: 'Drafts', status: 'DRAFT', payStatus: '' },
    { label: 'Issued', status: 'ISSUED', payStatus: '' },
    { label: 'Unpaid', status: 'ISSUED', payStatus: 'UNPAID' },
    { label: 'Partially Paid', status: 'ISSUED', payStatus: 'PARTIALLY_PAID' },
    { label: 'Paid', status: 'ISSUED', payStatus: 'PAID' },
    { label: 'Cancelled', status: 'CANCELLED', payStatus: '' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Invoices</h1>
          <p className="text-xs text-gray-500">
            Create, manage, track, and download your business invoices
          </p>
        </div>

        <Link to="/invoices/create">
          <Button icon={Plus} size="sm">
            Create Invoice
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 pb-1">
        {tabs.map((tab, idx) => {
          const isActive =
            statusFilter === tab.status && paymentStatusFilter === tab.payStatus;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setStatusFilter(tab.status);
                setPaymentStatusFilter(tab.payStatus);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-primary-600 text-white font-bold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by invoice number or customer name..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase font-semibold">
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 text-right">Grand Total</th>
                <th className="p-3.5 text-right">Paid</th>
                <th className="p-3.5 text-right">Balance</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Payment</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3.5 font-bold font-mono text-primary-600">
                      <Link to={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-gray-900">
                        {inv.customer?.name || 'Walk-in Customer'}
                      </div>
                      {inv.customer?.gstin && (
                        <div className="text-[10px] text-gray-400 font-mono">
                          {inv.customer.gstin}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-gray-500">
                      {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-3.5 text-right font-bold text-gray-900 font-mono">
                      ₹{Number(inv.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono text-green-600">
                      ₹{Number(inv.totalPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono text-red-600 font-semibold">
                      ₹{Number(inv.outstandingAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge status={inv.status} />
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge status={inv.paymentStatus} />
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/invoices/${inv.id}`}
                          title="View Invoice"
                          className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(inv.id, inv.invoiceNumber)}
                          title="Download PDF"
                          className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {inv.status === 'ISSUED' && inv.paymentStatus !== 'PAID' && (
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForPayment(inv)}
                            title="Record Payment"
                            className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-400 hover:text-green-600 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDuplicate(inv.id)}
                          title="Duplicate Invoice"
                          className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-400 hover:text-purple-600 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {inv.status === 'ISSUED' && inv.paymentStatus !== 'PAID' && (
                          <button
                            type="button"
                            onClick={() => setCancelModalInvoice(inv)}
                            title="Cancel Invoice"
                            className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    No invoices found matching current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={pagination.totalPages}
          totalRecords={pagination.total}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Record Payment Modal */}
      {selectedInvoiceForPayment && (
        <PaymentModal
          isOpen={!!selectedInvoiceForPayment}
          onClose={() => setSelectedInvoiceForPayment(null)}
          invoice={selectedInvoiceForPayment}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          }}
        />
      )}

      {/* Cancel Invoice Modal */}
      {cancelModalInvoice && (
        <Modal
          isOpen={!!cancelModalInvoice}
          onClose={() => setCancelModalInvoice(null)}
          title={`Cancel Invoice ${cancelModalInvoice.invoiceNumber}`}
        >
          <form onSubmit={handleCancelInvoice} className="space-y-4">
            <p className="text-xs text-red-600 font-medium">
              Warning: Cancelling an issued financial document is recorded in the audit trail.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Reason for Cancellation <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="State the reason (e.g. Order cancelled by buyer / Wrong billing details)..."
                className="w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => setCancelModalInvoice(null)}
                disabled={cancelling}
                className="w-full sm:w-auto"
              >
                Go Back
              </Button>
              <Button type="submit" variant="danger" loading={cancelling} className="w-full sm:w-auto">
                Confirm Cancellation
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

