import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { INDIAN_STATES } from '../../utils/constants';

export default function CustomerFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  const [formData, setFormData] = useState({
    name: '',
    customerType: 'BUSINESS',
    gstin: '',
    pan: '',
    contactPerson: '',
    phone: '',
    email: '',
    // Billing
    billingAddress: '',
    billingCity: '',
    billingState: 'Telangana',
    billingStateCode: '36',
    billingPincode: '',
    // Shipping
    sameAsShipping: true,
    shippingAddress: '',
    shippingCity: '',
    shippingState: 'Telangana',
    shippingStateCode: '36',
    shippingPincode: '',
    notes: '',
  });

  useEffect(() => {
    if (isEdit) {
      const loadCustomer = async () => {
        try {
          const res = await api.get(`/customers/${id}`);
          if (res.data.success) {
            setFormData(res.data.data);
          }
        } catch (err) {
          toast.error('Failed to load customer');
          navigate('/customers');
        } finally {
          setFetching(false);
        }
      };
      loadCustomer();
    }
  }, [id, isEdit]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'billingState') {
        const found = INDIAN_STATES.find((s) => s.name === value);
        if (found) updated.billingStateCode = found.code;
      }
      if (field === 'shippingState') {
        const found = INDIAN_STATES.find((s) => s.name === value);
        if (found) updated.shippingStateCode = found.code;
      }
      if (field === 'gstin' && value.length >= 12) {
        const panPart = value.substring(2, 12).toUpperCase();
        if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panPart)) {
          updated.pan = panPart;
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/customers/${id}`, formData);
        toast.success('Customer updated successfully');
      } else {
        await api.post('/customers', formData);
        toast.success('Customer created successfully');
      }
      navigate('/customers');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="text-center py-12 text-xs text-gray-500">Loading customer details...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {isEdit ? 'Edit Customer' : 'Add New Customer'}
          </h1>
          <p className="text-xs text-gray-500">
            {isEdit ? 'Update details for this customer' : 'Save client info for quick invoice generation'}
          </p>
        </div>
        <Link to="/customers">
          <Button variant="secondary" size="sm">
            Cancel
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b pb-2">Basic Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Customer / Business Name"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. LALITHA ENTERPRICESES"
            />
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Customer Type
              </label>
              <select
                value={formData.customerType || 'BUSINESS'}
                onChange={(e) => handleChange('customerType', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="BUSINESS">Business (B2B)</option>
                <option value="INDIVIDUAL">Individual / Retail (B2C)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="GSTIN (15 characters)"
              value={formData.gstin || ''}
              onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
              placeholder="e.g. 36CBYPB9870Q1ZE"
              maxLength={15}
            />
            <Input
              label="PAN"
              value={formData.pan || ''}
              onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
              placeholder="e.g. CBYPB9870Q"
              maxLength={10}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Contact Person"
              value={formData.contactPerson || ''}
              onChange={(e) => handleChange('contactPerson', e.target.value)}
              placeholder="e.g. CHANDERSEKHAR"
            />
            <Input
              label="Phone Number"
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="e.g. 8341249579"
            />
            <Input
              label="Email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="billing@customer.com"
            />
          </div>
        </div>

        {/* Billing Address */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b pb-2">Billing Address (Bill to)</h2>

          <Input
            label="Street Address / Building"
            value={formData.billingAddress || ''}
            onChange={(e) => handleChange('billingAddress', e.target.value)}
            placeholder="e.g. 5-95 SURENDER COLONY GHATKESAR MANDAL, NARAPALLY JANGAIAH"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.billingCity || ''}
              onChange={(e) => handleChange('billingCity', e.target.value)}
              placeholder="HYDERABAD"
            />
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                State
              </label>
              <select
                value={formData.billingState || 'Telangana'}
                onChange={(e) => handleChange('billingState', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Pincode"
              value={formData.billingPincode || ''}
              onChange={(e) => handleChange('billingPincode', e.target.value)}
              placeholder="500088"
            />
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-sm font-bold text-gray-900">Shipping Address (Consignee / Ship to)</h2>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 font-semibold">
              <input
                type="checkbox"
                checked={formData.sameAsShipping}
                onChange={(e) => handleChange('sameAsShipping', e.target.checked)}
                className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
              />
              Same as billing address
            </label>
          </div>

          {!formData.sameAsShipping && (
            <div className="space-y-4 pt-2">
              <Input
                label="Street Address / Building"
                value={formData.shippingAddress || ''}
                onChange={(e) => handleChange('shippingAddress', e.target.value)}
                placeholder="Separate shipping destination address"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="City"
                  value={formData.shippingCity || ''}
                  onChange={(e) => handleChange('shippingCity', e.target.value)}
                  placeholder="City"
                />
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    State
                  </label>
                  <select
                    value={formData.shippingState || 'Telangana'}
                    onChange={(e) => handleChange('shippingState', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.name}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Pincode"
                  value={formData.shippingPincode || ''}
                  onChange={(e) => handleChange('shippingPincode', e.target.value)}
                  placeholder="Pincode"
                />
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-2">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Notes / Internal Reference
          </label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Add internal notes about this customer..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Link to="/customers">
            <Button variant="secondary" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </div>
  );
}

