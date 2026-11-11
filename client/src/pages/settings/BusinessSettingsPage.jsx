import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { INDIAN_STATES, BUSINESS_TYPES } from '../../utils/constants';

export default function BusinessSettingsPage() {
  const { business, updateBusiness } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    businessType: 'Wholesale',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: 'Telangana',
    stateCode: '36',
    pincode: '',
    isGstRegistered: false,
    gstin: '',
    pan: '',
    upiId: '',
    authorizedSignatory: '',
    jurisdiction: 'HYDERABAD',
    declaration: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/business/profile');
        if (res.data.success) {
          const b = res.data.data;
          setFormData({
            name: b.name || '',
            businessType: b.businessType || 'Wholesale',
            phone: b.phone || '',
            email: b.email || '',
            website: b.website || '',
            address: b.address || '',
            city: b.city || '',
            state: b.state || 'Telangana',
            stateCode: b.stateCode || '36',
            pincode: b.pincode || '',
            isGstRegistered: Boolean(b.isGstRegistered),
            gstin: b.gstin || '',
            pan: b.pan || '',
            upiId: b.upiId || '',
            authorizedSignatory: b.authorizedSignatory || '',
            jurisdiction: b.jurisdiction || 'HYDERABAD',
            declaration: b.declaration || '',
          });
        }
      } catch (err) {
        toast.error('Failed to load profile');
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'state') {
        const found = INDIAN_STATES.find((s) => s.name === value);
        if (found) updated.stateCode = found.code;
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.upiId && !/^[\w.-]+@[\w.-]+$/.test(formData.upiId)) {
      toast.error('Please enter a valid UPI ID (e.g. name@bank or 9876543210@upi)');
      return;
    }
    setLoading(true);
    try {
      const res = await api.put('/business/profile', formData);
      if (res.data.success) {
        toast.success('Business profile updated');
        updateBusiness(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('logo', file);

    setLogoUploading(true);
    try {
      const res = await api.post('/business/upload-logo', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        toast.success('Logo uploaded successfully');
        updateBusiness(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Business Profile</h1>
        <p className="text-xs text-gray-500">
          Your company branding, GSTIN, PAN, and invoice declaration terms
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info & Logo */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Company Identity</h2>
              <p className="text-xs text-gray-400">Basic business details printed on top-left of invoices</p>
            </div>

            {/* Logo Upload */}
            <div className="flex items-center gap-3">
              {business?.logoPath ? (
                <img
                  src={`/${business.logoPath}`}
                  alt="Business Logo"
                  className="w-12 h-12 rounded object-contain border p-1"
                />
              ) : (
                <div className="w-12 h-12 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-400">
                  Logo
                </div>
              )}
              <label className="cursor-pointer text-xs font-semibold text-primary-600 hover:text-primary-800 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200">
                {logoUploading ? 'Uploading...' : 'Change Logo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Business / Trade Name"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Business Type
              </label>
              <select
                value={formData.businessType}
                onChange={(e) => handleChange('businessType', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
            <Input
              label="Website"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </div>

        {/* Address */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b pb-2">Business Address</h2>
          <Input
            label="Street Address / Premises"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
            />
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                State
              </label>
              <select
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
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
              value={formData.pincode}
              onChange={(e) => handleChange('pincode', e.target.value)}
            />
          </div>
        </div>

        {/* Tax Information */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b pb-2">Tax Registration</h2>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isGstRegistered}
              onChange={(e) => handleChange('isGstRegistered', e.target.checked)}
              className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
            />
            <span className="text-sm font-semibold text-gray-800">
              Registered under GST
            </span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="GSTIN"
              value={formData.gstin}
              onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
              placeholder="36AKBPH4841D1ZK"
              maxLength={15}
            />
            <Input
              label="Company PAN"
              value={formData.pan}
              onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
              placeholder="AKBPH4841D"
              maxLength={10}
            />
          </div>
        </div>

        {/* Signatory & Legal Terms */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b pb-2">Signatory & Declaration</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Authorized Signatory Name"
              value={formData.authorizedSignatory}
              onChange={(e) => handleChange('authorizedSignatory', e.target.value)}
              placeholder="e.g. Rithik Kumar"
            />
            <Input
              label="City Jurisdiction"
              value={formData.jurisdiction}
              onChange={(e) => handleChange('jurisdiction', e.target.value)}
              placeholder="HYDERABAD"
              helperText="Printed as: SUBJECT TO [CITY] JURISDICTION"
            />
          </div>

          <Input
            label="Default Business UPI ID (for QR Code Payment)"
            value={formData.upiId}
            onChange={(e) => handleChange('upiId', e.target.value.toLowerCase().trim())}
            placeholder="e.g. mybusiness@okaxis or 9876543210@upi"
            helperText="Generates an invoice-specific UPI QR code on your PDF for seamless customer payments."
          />

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Invoice Declaration Text
            </label>
            <textarea
              rows={2}
              value={formData.declaration}
              onChange={(e) => handleChange('declaration', e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" loading={loading} size="lg">
            Save Business Profile
          </Button>
        </div>
      </form>
    </div>
  );
}

