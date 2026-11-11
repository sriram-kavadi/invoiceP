import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Edit2, FileText, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cRes, iRes] = await Promise.all([
          api.get(`/customers/${id}`),
          api.get(`/customers/${id}/invoices?page=${page}&limit=10`),
        ]);

        if (cRes.data.success) setCustomer(cRes.data.data);
        if (iRes.data.success) {
          setInvoices(iRes.data.data.invoices);
          setPagination(iRes.data.data.pagination);
        }
      } catch (err) {
        toast.error('Failed to load customer details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, page]);

  if (loading) {
    return <div className="text-center py-12 text-xs text-gray-500">Loading customer profile...</div>;
  }

  if (!customer) {
    return <div className="text-center py-12 text-xs text-red-500">Customer not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/customers" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 min-h-[40px] min-w-[40px] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{customer.name}</h1>
            <p className="text-xs text-gray-500">
              GSTIN: {customer.gstin || 'Unregistered'} | PAN: {customer.pan || '-'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link to={`/customers/${id}/edit`}>
            <Button variant="secondary" size="sm" icon={Edit2}>
              Edit Details
            </Button>
          </Link>
          <Link to={`/invoices/create?customerId=${id}`}>
            <Button size="sm" icon={Plus}>
              Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Billing Information
          </h2>
          <div className="text-xs space-y-1.5 text-gray-700">
            <p className="font-semibold text-gray-900">{customer.name}</p>
            <p>{customer.billingAddress || '-'}</p>
            <p>
              {customer.billingCity ? `${customer.billingCity}, ` : ''}
              {customer.billingState} {customer.billingPincode ? `- ${customer.billingPincode}` : ''}
            </p>
            <p>State Code: {customer.billingStateCode || '-'}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Contact & Shipping
          </h2>
          <div className="text-xs space-y-1.5 text-gray-700">
            <p><span className="text-gray-400">Contact Person:</span> {customer.contactPerson || '-'}</p>
            <p><span className="text-gray-400">Phone:</span> {customer.phone || '-'}</p>
            <p><span className="text-gray-400">Email:</span> {customer.email || '-'}</p>
            <p className="pt-2 font-medium text-gray-500 border-t border-gray-100">
              Ship to: {customer.shippingAddress || customer.billingAddress || 'Same as billing'}
            </p>
          </div>
        </div>
      </div>

      {/* Customer Invoices */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Invoice History</h2>
          <p className="text-xs text-gray-400">All invoices generated for this customer</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase font-semibold">
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 text-right">Grand Total</th>
                <th className="p-3.5 text-right">Paid</th>
                <th className="p-3.5 text-right">Balance</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Payment</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50">
                    <td className="p-3.5 font-bold text-primary-600 font-mono">
                      <Link to={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoiceNumber}
                      </Link>
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
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="text-primary-600 hover:underline font-semibold"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    No invoices recorded for this customer yet.
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

