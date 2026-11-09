import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { UNITS, GST_RATES } from '../../utils/constants';

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    hsnSacCode: '',
    unit: 'PCS',
    sellingPrice: '',
    gstRate: 18,
    taxClassification: 'TAXABLE',
    defaultDiscount: 0,
    isService: false,
  });

  useEffect(() => {
    if (isEdit) {
      const loadProduct = async () => {
        try {
          const res = await api.get(`/products/${id}`);
          if (res.data.success) {
            setFormData(res.data.data);
          }
        } catch (err) {
          toast.error('Failed to load product details');
          navigate('/products');
        } finally {
          setFetching(false);
        }
      };
      loadProduct();
    }
  }, [id, isEdit]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    const price = parseFloat(formData.sellingPrice);
    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        sellingPrice: price,
        gstRate: Number(formData.gstRate),
        defaultDiscount: Number(formData.defaultDiscount || 0),
      };

      if (isEdit) {
        await api.put(`/products/${id}`, payload);
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', payload);
        toast.success('Product created successfully');
      }
      navigate('/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="text-center py-12 text-xs text-gray-500">Loading product...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {isEdit ? 'Edit Product / Service' : 'Add Product or Service'}
          </h1>
          <p className="text-xs text-gray-500">
            {isEdit ? 'Update product information and pricing' : 'Save items to reuse in future invoices'}
          </p>
        </div>
        <Link to="/products">
          <Button variant="secondary" size="sm">
            Cancel
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center gap-4 mb-2 pb-3 border-b">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
              <input
                type="radio"
                name="itemType"
                checked={!formData.isService}
                onChange={() => handleChange('isService', false)}
                className="text-primary-600 focus:ring-primary-500"
              />
              Goods / Physical Product
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
              <input
                type="radio"
                name="itemType"
                checked={formData.isService}
                onChange={() => handleChange('isService', true)}
                className="text-primary-600 focus:ring-primary-500"
              />
              Service (SAC Code)
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Product / Item Name"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. MOODS DOTTED 3's (MRP Rs.30)"
            />
            <Input
              label="SKU / Item Code"
              value={formData.sku || ''}
              onChange={(e) => handleChange('sku', e.target.value)}
              placeholder="e.g. MOODS-DOT-3"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Detailed item description as printed on invoice..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={formData.isService ? 'SAC Code' : 'HSN Code'}
              value={formData.hsnSacCode || ''}
              onChange={(e) => handleChange('hsnSacCode', e.target.value)}
              placeholder={formData.isService ? 'e.g. 998311' : 'e.g. 40141010'}
            />

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Unit of Measurement
              </label>
              <select
                value={formData.unit || 'PCS'}
                onChange={(e) => handleChange('unit', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Selling Price (₹)"
              type="number"
              step="0.01"
              required
              value={formData.sellingPrice}
              onChange={(e) => handleChange('sellingPrice', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                GST Rate (%)
              </label>
              <select
                value={formData.gstRate}
                onChange={(e) => handleChange('gstRate', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold"
              >
                {GST_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}% GST
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Tax Classification
              </label>
              <select
                value={formData.taxClassification || 'TAXABLE'}
                onChange={(e) => handleChange('taxClassification', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="TAXABLE">Taxable</option>
                <option value="EXEMPT">Exempt</option>
                <option value="NIL_RATED">Nil Rated</option>
                <option value="NON_GST">Non-GST Goods</option>
              </select>
            </div>

            <Input
              label="Default Discount (%)"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.defaultDiscount}
              onChange={(e) => handleChange('defaultDiscount', e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Link to="/products">
            <Button variant="secondary" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Save Product'}
          </Button>
        </div>
      </form>
    </div>
  );
}

