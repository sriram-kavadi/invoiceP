import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, CreditCard, Landmark, Banknote } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';

export default function PaymentsPage() {
  const { business } = useAuth();
  const [methodFilter, setMethodFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['payments', business?.id, page, methodFilter],
    queryFn: async () => {
      let url = `/payments?page=${page}&limit=15`;
      if (methodFilter) url += `&method=${methodFilter}`;
      const res = await api.get(url);
      if (res.data.success) return res.data.data;
      throw new Error(res.data.message || 'Failed to load payments');
    },
    enabled: !!business?.id,
    staleTime: 1000 * 60 * 2,
  });

  const payments = data?.payments || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  const handleExport = async () => {
    try {
      const res = await api.get('/reports/payments/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payments_report_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Payments exported to Excel');
    } catch (err) {
      toast.error('Failed to export payments');
    }
  };

  const methods = ['ALL', 'UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'OTHER'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Payments Received</h1>
          <p className="text-xs text-gray-500">
            Track customer settlements, wire transfers, cheques, and cash receipts
          </p>
        </div>

        <Button variant="secondary" size="sm" icon={Download} onClick={handleExport}>
          Export Excel
        </Button>
      </div>

      {/* Filter by Method */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 pb-1">
        {methods.map((m) => {
          const isActive = (m === 'ALL' && !methodFilter) || methodFilter === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMethodFilter(m === 'ALL' ? '' : m);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-primary-600 text-white font-bold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {m.replace('_', ' ')}
            </button>
          );
        })}
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase font-semibold">
                <th className="p-3.5">Payment Date</th>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5 text-right">Invoice Total</th>
                <th className="p-3.5 text-right">Amount Received</th>
                <th className="p-3.5 text-center">Payment Mode</th>
                <th className="p-3.5">Transaction Ref</th>
                <th className="p-3.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length > 0 ? (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3.5 text-gray-500">
                      {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-3.5 font-bold font-mono text-primary-600">
                      <Link to={`/invoices/${p.invoice?.id}`} className="hover:underline">
                        {p.invoice?.invoiceNumber}
                      </Link>
                    </td>
                    <td className="p-3.5 font-semibold text-gray-900">
                      {p.invoice?.customer?.name || 'Walk-in Customer'}
                    </td>
                    <td className="p-3.5 text-right font-mono text-gray-600">
                      ₹{Number(p.invoice?.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-green-600 text-sm">
                      ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700">
                        {p.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-gray-600">{p.transactionRef || '-'}</td>
                    <td className="p-3.5 text-gray-400 text-[11px] truncate max-w-xs">
                      {p.notes || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    No payment records found. Record payments directly from any issued invoice!
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
    </div>
  );
}

