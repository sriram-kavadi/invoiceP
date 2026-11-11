import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  Printer,
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Users,
  Package,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Layers,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';

export default function ReportsPage() {
  const { business } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'sales'

  // ─── Business Analytics State ──────────────────────────────────────────────
  const [analyticsPeriod, setAnalyticsPeriod] = useState('THIS_MONTH');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [appliedCustomStart, setAppliedCustomStart] = useState('');
  const [appliedCustomEnd, setAppliedCustomEnd] = useState('');

  // ─── Sales Tax Records State ───────────────────────────────────────────────
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [activeStartDate, setActiveStartDate] = useState('');
  const [activeEndDate, setActiveEndDate] = useState('');
  const [salesPage, setSalesPage] = useState(1);

  // ─── Analytics Query ───────────────────────────────────────────────────────
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: [
      'businessAnalytics',
      business?.id,
      analyticsPeriod,
      appliedCustomStart,
      appliedCustomEnd,
    ],
    queryFn: async () => {
      let url = `/reports/analytics?period=${analyticsPeriod}`;
      if (analyticsPeriod === 'CUSTOM') {
        if (appliedCustomStart) url += `&startDate=${appliedCustomStart}`;
        if (appliedCustomEnd) url += `&endDate=${appliedCustomEnd}`;
      }
      const res = await api.get(url);
      if (res.data.success) return res.data.data;
      throw new Error(res.data.message || 'Failed to load analytics');
    },
    enabled: !!business?.id && activeTab === 'analytics',
    staleTime: 1000 * 60 * 2,
  });

  // ─── Sales Records Query ───────────────────────────────────────────────────
  const { data: salesReportData, isLoading: salesLoading } = useQuery({
    queryKey: ['salesReport', business?.id, salesPage, activeStartDate, activeEndDate],
    queryFn: async () => {
      let url = `/reports/sales?page=${salesPage}&limit=15`;
      if (activeStartDate) url += `&startDate=${activeStartDate}`;
      if (activeEndDate) url += `&endDate=${activeEndDate}`;
      const res = await api.get(url);
      if (res.data.success) return res.data.data;
      throw new Error(res.data.message || 'Failed to load reports');
    },
    enabled: !!business?.id && activeTab === 'sales',
    staleTime: 1000 * 60 * 3,
  });

  // ─── Export Analytics Excel ────────────────────────────────────────────────
  const handleExportAnalytics = async () => {
    try {
      let url = `/reports/analytics/export?period=${analyticsPeriod}`;
      if (analyticsPeriod === 'CUSTOM') {
        if (appliedCustomStart) url += `&startDate=${appliedCustomStart}`;
        if (appliedCustomEnd) url += `&endDate=${appliedCustomEnd}`;
      }
      const res = await api.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `business_analytics_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Analytics report downloaded in Excel format');
    } catch (err) {
      toast.error('Failed to export analytics report');
    }
  };

  // ─── Export Sales Invoices Excel ───────────────────────────────────────────
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

  const handleApplySalesFilter = (e) => {
    e.preventDefault();
    setSalesPage(1);
    setActiveStartDate(startDateInput);
    setActiveEndDate(endDateInput);
  };

  const handleApplyCustomAnalytics = (e) => {
    e.preventDefault();
    if (!customStart || !customEnd) {
      toast.error('Please select both start and end date');
      return;
    }
    setAppliedCustomStart(customStart);
    setAppliedCustomEnd(customEnd);
  };

  const summary = analyticsData?.summary || {};
  const comparison = summary.comparison || {};
  const salesTrend = analyticsData?.salesTrend || [];
  const customerPerf = analyticsData?.customerPerformance || [];
  const productPerf = analyticsData?.productPerformance || [];
  const paymentMethods = analyticsData?.paymentMethods || [];
  const aging = analyticsData?.aging?.buckets || {};
  const totalAgingOutstanding = analyticsData?.aging?.totalOutstanding || 0;

  const salesData = salesReportData || { invoices: [], totals: {} };
  const salesPagination = salesReportData?.pagination || { total: 0, totalPages: 1 };
  const salesTotals = salesData.totals || {};

  const periodTabs = [
    { label: 'Today', value: 'TODAY' },
    { label: 'This Week', value: 'THIS_WEEK' },
    { label: 'This Month', value: 'THIS_MONTH' },
    { label: 'This Year', value: 'THIS_YEAR' },
    { label: 'Custom', value: 'CUSTOM' },
  ];

  const formatRupee = (val) =>
    `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Business Intelligence</h1>
          <p className="text-xs text-gray-500">
            Real-time sales analytics, receivable aging, performance tracking & tax reports
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Business Analytics
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-colors ${
                activeTab === 'sales'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Sales & Tax Audit
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════ TAB 1: BUSINESS ANALYTICS ══════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Controls Bar: Period selector + Export + Print */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1">
                Period:
              </span>
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                {periodTabs.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setAnalyticsPeriod(p.value)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      analyticsPeriod === p.value
                        ? 'bg-white text-gray-900 font-bold shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Picker */}
              {analyticsPeriod === 'CUSTOM' && (
                <form
                  onSubmit={handleApplyCustomAnalytics}
                  className="flex items-center gap-2 ml-2"
                >
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <span className="text-gray-400 text-xs">to</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <Button type="submit" size="sm">
                    Apply
                  </Button>
                </form>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={Printer}
                onClick={() => window.print()}
                title="Print Report"
              >
                Print
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={Download}
                onClick={handleExportAnalytics}
              >
                Export Excel
              </Button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Revenue */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Total Sales Revenue
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 font-mono">
                {formatRupee(summary.totalSales)}
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-gray-400">
                  {summary.invoiceCount || 0} invoices issued
                </span>
                {comparison.salesGrowth !== undefined && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded ${
                      comparison.salesGrowth >= 0
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {comparison.salesGrowth >= 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(comparison.salesGrowth)}% vs prior
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: Payment Collections */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Payment Collections
                </span>
                <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-green-600 font-mono">
                {formatRupee(summary.totalCollections)}
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-gray-400">Received in period</span>
                {comparison.collectionsGrowth !== undefined && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded ${
                      comparison.collectionsGrowth >= 0
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {comparison.collectionsGrowth >= 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(comparison.collectionsGrowth)}% vs prior
                  </span>
                )}
              </div>
            </div>

            {/* Card 3: Outstanding Receivables */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Total Outstanding
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600 font-mono">
                {formatRupee(summary.totalOutstanding)}
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-gray-400">Receivables pending</span>
                <span className="text-[11px] font-bold text-amber-700">
                  {summary.totalSales > 0
                    ? `${Math.round(((summary.totalOutstanding || 0) / summary.totalSales) * 100)}% of sales`
                    : '0%'}
                </span>
              </div>
            </div>

            {/* Card 4: Tax Collection */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  GST Tax Collected
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-purple-600 font-mono">
                {formatRupee(summary.totalTax)}
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-gray-400">
                  Taxable: {formatRupee(summary.totalTaxable)}
                </span>
                <span className="text-[11px] font-mono text-gray-500 font-semibold">
                  Avg Inv: {formatRupee(summary.avgInvoiceValue)}
                </span>
              </div>
            </div>
          </div>

          {/* Row 2: Sales Trend Graph + Payment Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Trend Visualizer */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Sales Trend Analysis</h2>
                  <p className="text-xs text-gray-400">
                    Gross invoiced volume over the selected period
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-primary-600 inline-block" />
                    Billed Sales
                  </span>
                </div>
              </div>

              {/* Responsive Bar Visualization */}
              <div className="h-56 flex items-end justify-between gap-2 pt-6 border-b border-gray-100 pb-2">
                {analyticsLoading ? (
                  <div className="w-full text-center py-16 text-gray-400 text-xs">
                    Calculating sales trend...
                  </div>
                ) : salesTrend.length > 0 ? (
                  (() => {
                    const maxVal = Math.max(...salesTrend.map((t) => t.totalSales), 1);
                    return salesTrend.map((t, idx) => {
                      const heightPercent = Math.max(6, Math.round((t.totalSales / maxVal) * 100));
                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center gap-2 group h-full justify-end min-w-[24px]"
                        >
                          <div className="text-[9px] text-gray-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-gray-900 text-white px-1.5 py-0.5 rounded shadow">
                            ₹{(t.totalSales / 1000).toFixed(1)}k ({t.invoiceCount})
                          </div>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full max-w-[42px] bg-primary-600 hover:bg-primary-700 rounded-t-md transition-all relative"
                          />
                          <span className="text-[10px] font-semibold text-gray-500 truncate max-w-[45px]">
                            {t.label}
                          </span>
                        </div>
                      );
                    });
                  })()
                ) : (
                  <div className="w-full text-center py-16 text-gray-400 text-xs">
                    No sales recorded for this period
                  </div>
                )}
              </div>
            </div>

            {/* Payment Collections by Method */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs flex flex-col">
              <h2 className="text-base font-bold text-gray-900 mb-1">Collections by Method</h2>
              <p className="text-xs text-gray-400 mb-4">Breakdown of payment channels used</p>

              <div className="space-y-4 flex-1">
                {paymentMethods.length > 0 ? (
                  paymentMethods.map((pm) => (
                    <div key={pm.method} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-700">
                          {pm.method.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-semibold text-gray-900">
                            {formatRupee(pm.amount)}
                          </span>
                          <span className="text-[10px] text-gray-400">({pm.share}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(100, pm.share)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {pm.count} transaction{pm.count > 1 ? 's' : ''}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400 text-xs">
                    No payment collections recorded in this period
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Receivables Aging Breakdown */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Accounts Receivable Aging Schedule
                </h2>
                <p className="text-xs text-gray-400">
                  Outstanding credit categorized by overdue age
                </p>
              </div>
              <div className="text-xs font-semibold text-gray-600 font-mono">
                Total Overdue: <span className="text-red-600 font-black">{formatRupee(totalAgingOutstanding)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* 0-30 Days */}
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/70">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  0-30 Days (Current)
                </div>
                <div className="text-lg font-black text-gray-900 font-mono mt-1">
                  {formatRupee(aging['0_30']?.amount || 0)}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {aging['0_30']?.count || 0} invoice{aging['0_30']?.count !== 1 ? 's' : ''}
                </div>
              </div>

              {/* 31-60 Days */}
              <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  31-60 Days Overdue
                </div>
                <div className="text-lg font-black text-amber-800 font-mono mt-1">
                  {formatRupee(aging['31_60']?.amount || 0)}
                </div>
                <div className="text-[11px] text-amber-600 mt-0.5">
                  {aging['31_60']?.count || 0} invoice{aging['31_60']?.count !== 1 ? 's' : ''}
                </div>
              </div>

              {/* 61-90 Days */}
              <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
                  61-90 Days Overdue
                </div>
                <div className="text-lg font-black text-orange-800 font-mono mt-1">
                  {formatRupee(aging['61_90']?.amount || 0)}
                </div>
                <div className="text-[11px] text-orange-600 mt-0.5">
                  {aging['61_90']?.count || 0} invoice{aging['61_90']?.count !== 1 ? 's' : ''}
                </div>
              </div>

              {/* 90+ Days */}
              <div className="p-4 rounded-xl border border-red-100 bg-red-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                  90+ Days Critical
                </div>
                <div className="text-lg font-black text-red-800 font-mono mt-1">
                  {formatRupee(aging['90_PLUS']?.amount || 0)}
                </div>
                <div className="text-[11px] text-red-600 mt-0.5">
                  {aging['90_PLUS']?.count || 0} invoice{aging['90_PLUS']?.count !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Product Performance & Customer Performance Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-gray-900">Product-Wise Performance</h3>
                  <p className="text-[11px] text-gray-400">Sales volume and generated revenue</p>
                </div>
                <Package className="w-4 h-4 text-gray-400" />
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase font-semibold">
                      <th className="p-3">Product</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Taxable</th>
                      <th className="p-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {productPerf.length > 0 ? (
                      productPerf.map((p, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="p-3">
                            <div className="font-bold text-gray-900">{p.productName}</div>
                            {p.hsnCode && (
                              <div className="text-[10px] text-gray-400 font-mono">
                                HSN: {p.hsnCode}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono font-medium text-gray-700">
                            {p.quantitySold} {p.unit || 'PCS'}
                          </td>
                          <td className="p-3 text-right font-mono text-gray-600">
                            {formatRupee(p.totalTaxable)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-gray-900">
                            {formatRupee(p.totalRevenue)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-gray-400 text-xs">
                          No product sales records in this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customer Performance Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-gray-900">Customer Performance</h3>
                  <p className="text-[11px] text-gray-400">Top revenue generating clients</p>
                </div>
                <Users className="w-4 h-4 text-gray-400" />
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase font-semibold">
                      <th className="p-3">Customer</th>
                      <th className="p-3 text-center">Inv</th>
                      <th className="p-3 text-right">Billed</th>
                      <th className="p-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customerPerf.length > 0 ? (
                      customerPerf.map((c, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="p-3">
                            <div className="font-bold text-gray-900">{c.name}</div>
                            <div className="text-[10px] text-gray-400">
                              {c.city ? `${c.city} • ` : ''}
                              {c.phone || c.gstin || 'Retail Customer'}
                            </div>
                          </td>
                          <td className="p-3 text-center font-mono font-semibold text-gray-600">
                            {c.invoicesCount}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-gray-900">
                            {formatRupee(c.totalRevenue)}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-red-600">
                            {formatRupee(c.outstandingAmount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-gray-400 text-xs">
                          No customer transaction data in this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ TAB 2: SALES & TAX AUDIT ══════════════════════ */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Header row with export */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Sales Invoices & Tax Audit</h2>
              <p className="text-xs text-gray-500">
                Detailed transaction register with CGST, SGST, IGST tax breakdown
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleExportSales}
            >
              Export Sales Register to Excel
            </Button>
          </div>

          {/* Date Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
            <form onSubmit={handleApplySalesFilter} className="flex flex-wrap items-end gap-3 text-xs">
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
                    setSalesPage(1);
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
                {formatRupee(salesTotals.grandTotal)}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                Taxable Value
              </span>
              <div className="text-xl font-black text-gray-900 font-mono">
                {formatRupee(salesTotals.taxableAmount)}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                Total Tax (CGST+SGST+IGST)
              </span>
              <div className="text-xl font-black text-blue-600 font-mono">
                {formatRupee(salesTotals.totalTax)}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                Total Outstanding
              </span>
              <div className="text-xl font-black text-red-600 font-mono">
                {formatRupee(salesTotals.outstandingAmount)}
              </div>
            </div>
          </div>

          {/* Sales Invoices Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 font-bold text-sm text-gray-800">
              Tax Invoice Records
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
                  {salesLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-gray-400">
                        Loading tax report...
                      </td>
                    </tr>
                  ) : salesData.invoices && salesData.invoices.length > 0 ? (
                    salesData.invoices.map((inv) => (
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
                          {formatRupee(inv.taxableAmount)}
                        </td>
                        <td className="p-3.5 text-right font-mono text-gray-500">
                          {formatRupee(inv.cgstAmount)}
                        </td>
                        <td className="p-3.5 text-right font-mono text-gray-500">
                          {formatRupee(inv.sgstAmount)}
                        </td>
                        <td className="p-3.5 text-right font-mono text-gray-500">
                          {formatRupee(inv.igstAmount)}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-gray-900">
                          {formatRupee(inv.grandTotal)}
                        </td>
                        <td className="p-3.5 text-right font-mono text-red-600 font-semibold">
                          {formatRupee(inv.outstandingAmount)}
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
              currentPage={salesPage}
              totalPages={salesPagination.totalPages}
              totalRecords={salesPagination.total}
              onPageChange={(p) => setSalesPage(p)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
