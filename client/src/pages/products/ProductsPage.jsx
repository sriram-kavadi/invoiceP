import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, Download, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';

export default function ProductsPage() {
  const { business } = useAuth();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['products', business?.id, page, submittedSearch],
    queryFn: async () => {
      const res = await api.get(`/products?page=${page}&limit=15&search=${encodeURIComponent(submittedSearch)}`);
      if (res.data.success) return res.data.data;
      throw new Error(res.data.message || 'Failed to load products');
    },
    enabled: !!business?.id,
    staleTime: 1000 * 60 * 3, // 3 minutes
  });

  const products = data?.products || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSubmittedSearch(searchInput);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete product "${name}"?`)) {
      return;
    }

    try {
      const res = await api.delete(`/products/${id}`);
      if (res.data.success) {
        toast.success('Product deleted');
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/products/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Products exported to Excel');
    } catch (err) {
      toast.error('Failed to export products');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Products & Services</h1>
          <p className="text-xs text-gray-500">
            Maintain your item catalogue with prices, units, and HSN/SAC codes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button variant="secondary" size="sm" icon={Download} onClick={handleExport}>
            Export Excel
          </Button>
          <Link to="/products/new">
            <Button icon={Plus} size="sm">
              Add Item
            </Button>
          </Link>
        </div>
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
              placeholder="Search by product name, SKU, or HSN/SAC code..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase font-semibold">
                <th className="p-3.5">Product / Service</th>
                <th className="p-3.5">SKU</th>
                <th className="p-3.5">HSN/SAC</th>
                <th className="p-3.5 text-center">Unit</th>
                <th className="p-3.5 text-right">Selling Price</th>
                <th className="p-3.5 text-center">GST Rate</th>
                <th className="p-3.5 text-center">Type</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    Loading products...
                  </td>
                </tr>
              ) : products.length > 0 ? (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-gray-900">{p.name}</div>
                      {p.description && (
                        <div className="text-[11px] text-gray-400 truncate max-w-xs">
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-gray-600">{p.sku || '-'}</td>
                    <td className="p-3.5 font-mono text-gray-900 font-semibold">{p.hsnSacCode || '-'}</td>
                    <td className="p-3.5 text-center font-bold text-gray-700">{p.unit}</td>
                    <td className="p-3.5 text-right font-bold text-gray-900 font-mono">
                      ₹{Number(p.sellingPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-center font-mono font-semibold text-gray-800">
                      {p.gstRate}%
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.isService ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                        {p.isService ? 'SERVICE' : 'GOODS'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/products/${p.id}/edit`}
                          title="Edit Product"
                          className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.name)}
                          title="Delete Product"
                          className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    No products found. Click "Add Item" to add your first product or service.
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

