import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Calendar, BarChart3, TrendingUp, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';

export default function ReportsPage() {
  const { business } = useAuth();
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [activeStartDate, setActiveStartDate] = useState('');
  const [activeEndDate, setActiveEndDate] = useState('');
  const [page, setPage] = useState(1);

  const { data: reportData, isLoading: loading } = useQuery({
    queryKey: ['salesReport', business?.id, page, activeStartDate, activeEndDate],
    queryFn: async () => {
      let url = `/reports/sales?page=${page}&limit=15`;
      if (activeStartDate) url += `&startDate=${activeStartDate}`;
      if (activeEndDate) url += `&endDate=${activeEndDate}`;
      const res = await api.get(url);
      if (res.data.success) return res.data.data;
      throw new Error(res.data.message || 'Failed to load reports');
    },
    enabled: !!business?.id,
    staleTime: 1000 * 60 * 3,
  });

  const data = reportData || { invoices: [], totals: {} };
  const pagination = reportData?.pagination || { total: 0, totalPages: 1 };

  const handleApplyFilter = (e) => {
    e.preventDefault();
    setPage(1);
    setActiveStartDate(startDateInput);
    setActiveEndDate(endDateInput);
  };

  const handleExportSales = async () => {
    try {
      let url = '/reports/sales/export?';
      if (activeStartDate) url += `startDate=${activeStartDate}&`;
      if (activeEndDate) url += `endDate=${activeEndDate}&`;

      const res = await api.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `sales_report_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Sales report downloaded in Excel format');
    } catch (err) {
      toast.error('Failed to export sales report');
    }
  };

  const totals = data.totals || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Sales & Tax Reports</h1>
          <p className="text-xs text-gray-500">
            Generate and export monthly/quarterly tax audit and sales reports
          </p>
        </div>

        <Button variant="secondary" size="sm" icon={Download} onClick={handleExportSales}>
          Export Sales to Excel
        </Button>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
        <form onSubmit={handleApplyFilter} className="flex flex-wrap items-end gap-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDateInput}
              onChange={(e) => setEndDateInput(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <Button type="submit" size="sm">
            Apply Filter
          </Button>
          {(activeStartDate || activeEndDate || startDateInput || endDateInput) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDateInput('');
                setEndDateInput('');
                setActiveStartDate('');
                setActiveEndDate('');
                setPage(1);
              }}
            >
              Reset
            </Button>
          )}
        </form>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
            Total Sales (Grand Total)
          </span>
          <div className="text-xl font-black text-gray-900 font-mono">
            ₹{Number(totals.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
            Taxable Value
          </span>
          <div className="text-xl font-black text-gray-900 font-mono">
            ₹{Number(totals.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
            Total Tax (CGST+SGST+IGST)
          </span>
          <div className="text-xl font-black text-blue-600 font-mono">
            ₹{Number(totals.totalTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
            Total Outstanding
          </span>
          <div className="text-xl font-black text-red-600 font-mono">
            ₹{Number(totals.outstandingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 font-bold text-sm text-gray-800">
          Sales Records
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase font-semibold">
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5 text-right">Taxable</th>
                <th className="p-3.5 text-right">CGST</th>
                <th className="p-3.5 text-right">SGST</th>
                <th className="p-3.5 text-right">IGST</th>
                <th className="p-3.5 text-right">Grand Total</th>
                <th className="p-3.5 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    Loading report...
                  </td>
                </tr>
              ) : data.invoices && data.invoices.length > 0 ? (
                data.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50">
                    <td className="p-3.5 font-bold font-mono text-primary-600">
                      {inv.invoiceNumber}
                    </td>
                    <td className="p-3.5 text-gray-500">
                      {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-3.5 font-semibold text-gray-900">
                      {inv.customer?.name || 'Walk-in'}
                    </td>
                    <td className="p-3.5 text-right font-mono">
                      ₹{Number(inv.taxableAmount).toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-gray-500">
                      ₹{Number(inv.cgstAmount).toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-gray-500">
                      ₹{Number(inv.sgstAmount).toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-gray-500">
                      ₹{Number(inv.igstAmount).toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-gray-900">
                      ₹{Number(inv.grandTotal).toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-red-600 font-semibold">
                      ₹{Number(inv.outstandingAmount).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    No sales data found for the selected period
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

