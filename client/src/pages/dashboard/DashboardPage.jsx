import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  FileText,
  CreditCard,
  Clock,
  Users,
  Package,
  ArrowUpRight,
  Plus,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import PaymentModal from '../../components/ui/PaymentModal';

export default function DashboardPage() {
  const [period, setPeriod] = useState('THIS_MONTH');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);

  const fetchSummary = async (p = period) => {
    setLoading(true);
    try {
      const res = await api.get(`/dashboard/summary?period=${p}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load dashboard summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(period);
  }, [period]);

  const periods = [
    { label: 'Today', value: 'TODAY' },
    { label: 'This Week', value: 'THIS_WEEK' },
    { label: 'This Month', value: 'THIS_MONTH' },
    { label: 'This Year', value: 'THIS_YEAR' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-xs text-gray-500">
            Overview of your sales, invoices, and receivables
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector tabs */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            {periods.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  period === p.value
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Link to="/invoices/create">
            <Button icon={Plus} size="sm">
              Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Total Sales
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            ₹
            {Number(data?.totalSales || 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            {data?.totalInvoices || 0} invoices issued
          </div>
        </div>

        {/* Paid Amount */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Received
            </span>
            <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-green-600">
            ₹
            {Number(data?.paidAmount || 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="text-[11px] text-green-700 mt-1">Payments collected</div>
        </div>

        {/* Pending Amount */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Outstanding
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">
            ₹
            {Number(data?.pendingAmount || 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="text-[11px] text-amber-700 mt-1">Pending receivables</div>
        </div>

        {/* Counts */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Catalogue
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">
              {data?.totalCustomers || 0}
            </span>
            <span className="text-xs text-gray-500 font-medium">Customers</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            {data?.totalProducts || 0} active products
          </div>
        </div>
      </div>

      {/* Visual Chart & Top Customers Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Sales Chart (CSS Bar Chart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-gray-900">Monthly Sales Trend</h2>
              <p className="text-xs text-gray-400">Past 6 months revenue performance</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-primary-600 inline-block" />
                Revenue (₹)
              </span>
            </div>
          </div>

          {/* Bar visualization */}
          <div className="h-48 flex items-end justify-between gap-2 sm:gap-4 pt-6 border-b border-gray-100 pb-2">
            {data?.monthlySales && data.monthlySales.length > 0 ? (
              (() => {
                const maxVal = Math.max(
                  ...data.monthlySales.map((m) => m.totalSales),
                  1
                );
                return data.monthlySales.map((m) => {
                  const heightPercent = Math.max(8, Math.round((m.totalSales / maxVal) * 100));
                  return (
                    <div
                      key={m.month}
                      className="flex-1 flex flex-col items-center gap-2 group h-full justify-end"
                    >
                      <div className="text-[10px] text-gray-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        ₹{(m.totalSales / 1000).toFixed(1)}k
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[48px] bg-primary-600 hover:bg-primary-700 rounded-t-md transition-all relative"
                      />
                      <span className="text-[11px] font-bold text-gray-500 truncate">
                        {m.month}
                      </span>
                    </div>
                  );
                });
              })()
            ) : (
              <div className="w-full text-center text-xs text-gray-400 py-12">
                No monthly data available yet
              </div>
            )}
          </div>
        </div>

        {/* Top Customers Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Top Customers</h2>
            <Link
              to="/customers"
              className="text-xs text-primary-600 hover:underline font-semibold"
            >
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {data?.topCustomers && data.topCustomers.length > 0 ? (
              data.topCustomers.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {c.name}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {c.invoiceCount} {c.invoiceCount === 1 ? 'invoice' : 'invoices'}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-gray-900 flex-shrink-0">
                    ₹{c.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-gray-400">
                No customer transactions yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Recent Invoices</h2>
            <p className="text-xs text-gray-400">Latest invoices created in your workspace</p>
          </div>
          <Link to="/invoices">
            <Button variant="secondary" size="sm">
              All Invoices →
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase font-semibold">
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 text-right">Amount</th>
                <th className="p-3.5 text-right">Balance</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Payment</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.recentInvoices && data.recentInvoices.length > 0 ? (
                data.recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3.5 font-bold text-primary-600 font-mono">
                      <Link to={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="p-3.5 font-medium text-gray-900">
                      {inv.customer?.name || 'Walk-in Customer'}
                    </td>
                    <td className="p-3.5 text-gray-500">
                      {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-3.5 text-right font-bold text-gray-900 font-mono">
                      ₹
                      {Number(inv.grandTotal).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-3.5 text-right font-mono text-red-600 font-semibold">
                      ₹
                      {Number(inv.outstandingAmount).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge status={inv.status} />
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge status={inv.paymentStatus} />
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="text-xs text-primary-600 hover:text-primary-800 font-semibold px-2 py-1 rounded hover:bg-primary-50"
                        >
                          View
                        </Link>
                        {inv.status === 'ISSUED' && inv.paymentStatus !== 'PAID' && (
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForPayment(inv)}
                            className="text-xs text-green-600 hover:text-green-800 font-semibold px-2 py-1 rounded hover:bg-green-50"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    No invoices generated yet. Click "Create Invoice" to start!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Recording Modal */}
      {selectedInvoiceForPayment && (
        <PaymentModal
          isOpen={!!selectedInvoiceForPayment}
          onClose={() => setSelectedInvoiceForPayment(null)}
          invoice={selectedInvoiceForPayment}
          onSuccess={() => fetchSummary()}
        />
      )}
    </div>
  );
}

