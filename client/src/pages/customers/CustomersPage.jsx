import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, Eye, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';

export default function CustomersPage() {
  const { business } = useAuth();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['customers', business?.id, page, submittedSearch],
    queryFn: async () => {
      const res = await api.get(`/customers?page=${page}&limit=15&search=${encodeURIComponent(submittedSearch)}`);
      if (res.data.success) return res.data.data;
      throw new Error(res.data.message || 'Failed to load customers');
    },
    enabled: !!business?.id,
    staleTime: 1000 * 60 * 3, // 3 minutes
  });

  const customers = data?.customers || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSubmittedSearch(searchInput);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete customer "${name}"?`)) {
      return;
    }

    try {
      const res = await api.delete(`/customers/${id}`);
      if (res.data.success) {
        toast.success('Customer deleted');
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete customer');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Customers</h1>
          <p className="text-xs text-gray-500">
            Manage your buyers, consignees, and billing contacts
          </p>
        </div>

        <Link to="/customers/new">
          <Button icon={Plus} size="sm">
            Add Customer
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by customer name, GSTIN, contact person, or phone..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase font-semibold">
                <th className="p-3.5">Customer / Company</th>
                <th className="p-3.5">GSTIN</th>
                <th className="p-3.5">Contact Person</th>
                <th className="p-3.5">Phone</th>
                <th className="p-3.5">State</th>
                <th className="p-3.5 text-center">Invoices</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length > 0 ? (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-gray-900">{c.name}</div>
                      <div className="text-[11px] text-gray-400 truncate max-w-xs">
                        {c.billingAddress || c.billingCity || 'No address specified'}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-gray-700">
                      {c.gstin || <span className="text-gray-400">Unregistered</span>}
                    </td>
                    <td className="p-3.5 text-gray-700">{c.contactPerson || '-'}</td>
                    <td className="p-3.5 text-gray-700 font-mono">{c.phone || '-'}</td>
                    <td className="p-3.5 text-gray-700">
                      {c.billingState ? `${c.billingState} (${c.billingStateCode || ''})` : '-'}
                    </td>
                    <td className="p-3.5 text-center font-bold text-gray-900">
                      {c._count?.invoices || 0}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/customers/${c.id}`}
                          title="View Details"
                          className="p-1.5 text-gray-400 hover:text-primary-600 rounded hover:bg-gray-100"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/customers/${c.id}/edit`}
                          title="Edit Customer"
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-gray-100"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id, c.name)}
                          title="Delete Customer"
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No customers found. Click "Add Customer" to add your first client.
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

