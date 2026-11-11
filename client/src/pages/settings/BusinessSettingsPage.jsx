import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { QrCode, Upload, Trash2, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { INDIAN_STATES, BUSINESS_TYPES } from '../../utils/constants';

export default function BusinessSettingsPage() {
  const { business, updateBusiness } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [qrUploading, setQrUploading] = useState(false);
  const [qrRemoving, setQrRemoving] = useState(false);
  const qrFileInputRef = useRef(null);

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
    upiQrPath: '',
    upiQrMode: 'DYNAMIC',
    showUpiQr: true,
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
            upiQrPath: b.upiQrPath || '',
            upiQrMode: b.upiQrMode || (b.upiQrPath ? 'UPLOADED' : 'DYNAMIC'),
            showUpiQr: b.settings?.showUpiQr ?? true,
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
    if (formData.showUpiQr && formData.upiQrMode === 'DYNAMIC' && formData.upiId) {
      if (!/^[\w.-]+@[\w.-]+$/.test(formData.upiId)) {
        toast.error('Please enter a valid UPI ID (e.g. name@bank or 9876543210@upi)');
        return;
      }
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

  const handleQrFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validations
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid image type. Please select a PNG or JPG/JPEG image.');
      if (qrFileInputRef.current) qrFileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit. Please choose a smaller image.');
      if (qrFileInputRef.current) qrFileInputRef.current.value = '';
      return;
    }

    const data = new FormData();
    data.append('qrImage', file);

    setQrUploading(true);
    try {
      const res = await api.post('/business/upload-upi-qr', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        toast.success('UPI QR image uploaded successfully');
        setFormData((prev) => ({
          ...prev,
          upiQrPath: res.data.data.upiQrPath,
          upiQrMode: 'UPLOADED',
        }));
        if (business) {
          updateBusiness({
            ...business,
            upiQrPath: res.data.data.upiQrPath,
            upiQrMode: 'UPLOADED',
          });
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload QR code image');
    } finally {
      setQrUploading(false);
      if (qrFileInputRef.current) qrFileInputRef.current.value = '';
    }
  };

  const handleRemoveQr = async () => {
    if (!window.confirm('Are you sure you want to remove the uploaded QR code image?')) return;
    setQrRemoving(true);
    try {
      const res = await api.delete('/business/upi-qr');
      if (res.data.success) {
        toast.success('UPI QR image removed');
        const nextMode = formData.upiId ? 'DYNAMIC' : 'DISABLED';
        setFormData((prev) => ({
          ...prev,
          upiQrPath: '',
          upiQrMode: nextMode,
        }));
        if (business) {
          updateBusiness({
            ...business,
            upiQrPath: null,
            upiQrMode: nextMode,
          });
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove QR code');
    } finally {
      setQrRemoving(false);
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

        {/* UPI Payment Settings */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary-600" />
              <div>
                <h2 className="text-sm font-bold text-gray-900">UPI Payment Settings</h2>
                <p className="text-xs text-gray-500">Configure customer payment QR codes displayed on your invoice PDFs</p>
              </div>
            </div>
          </div>

          {/* Master Enable/Disable Switch */}
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition">
            <input
              type="checkbox"
              checked={formData.showUpiQr}
              onChange={(e) => handleChange('showUpiQr', e.target.checked)}
              className="mt-0.5 rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
            />
            <div>
              <span className="text-sm font-bold text-gray-900 block">
                Enable UPI QR Code on Invoices
              </span>
              <span className="text-xs text-gray-500 block">
                When enabled, a scannable payment QR code is printed in the lower invoice section beside bank details
              </span>
            </div>
          </label>

          {formData.showUpiQr && (
            <div className="space-y-4 pl-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Select QR Code Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Dynamic UPI Option */}
                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      formData.upiQrMode === 'DYNAMIC'
                        ? 'border-primary-600 bg-primary-50/30 ring-1 ring-primary-500'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="upiQrMode"
                        value="DYNAMIC"
                        checked={formData.upiQrMode === 'DYNAMIC'}
                        onChange={() => handleChange('upiQrMode', 'DYNAMIC')}
                        className="mt-1 text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">Dynamic UPI QR Code</span>
                        <span className="text-[11px] text-gray-500 block mt-0.5">
                          Automatically generates a QR code with the invoice number and exact outstanding balance.
                        </span>
                      </div>
                    </div>
                  </label>

                  {/* Uploaded Static QR Option */}
                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      formData.upiQrMode === 'UPLOADED'
                        ? 'border-primary-600 bg-primary-50/30 ring-1 ring-primary-500'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="upiQrMode"
                        value="UPLOADED"
                        checked={formData.upiQrMode === 'UPLOADED'}
                        onChange={() => handleChange('upiQrMode', 'UPLOADED')}
                        className="mt-1 text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">Custom Uploaded QR Code</span>
                        <span className="text-[11px] text-gray-500 block mt-0.5">
                          Upload your official merchant standee image (PhonePe, Google Pay, Paytm, etc.).
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Dynamic QR Configuration */}
              {formData.upiQrMode === 'DYNAMIC' && (
                <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
                  <Input
                    label="Business UPI ID / VPA"
                    value={formData.upiId}
                    onChange={(e) => handleChange('upiId', e.target.value.toLowerCase().trim())}
                    placeholder="e.g. company@okhdfcbank or 9876543210@upi"
                    helperText="Customers scanning this QR code in any UPI app will see your company name and the exact invoice balance pre-filled."
                  />
                  <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
                    <span>Dynamic QR codes automatically adjust when partial payments are received on an invoice.</span>
                  </div>
                </div>
              )}

              {/* Uploaded Static QR Configuration */}
              {formData.upiQrMode === 'UPLOADED' && (
                <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">Merchant Standee / Static QR Image</span>
                      <span className="text-[11px] text-gray-500 block">Supported formats: PNG, JPG, JPEG (Max 5MB)</span>
                    </div>
                  </div>

                  {formData.upiQrPath ? (
                    <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="p-2 bg-white rounded-lg border border-gray-300 shadow-xs shrink-0">
                        <img
                          src={
                            formData.upiQrPath.startsWith('http') || formData.upiQrPath.startsWith('data:')
                              ? formData.upiQrPath
                              : formData.upiQrPath.startsWith('qr-codes/')
                              ? `https://bekbdyvoodydenjhnord.supabase.co/storage/v1/object/public/business-assets/${formData.upiQrPath}`
                              : `/${formData.upiQrPath}`
                          }
                          alt="Uploaded UPI QR"
                          className="w-28 h-28 object-contain rounded"
                        />
                      </div>
                      <div className="space-y-2 text-center sm:text-left flex-1">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active on Printable Invoices</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          This static QR code will be printed at full sharpness in the lower section of your invoice PDFs.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                          <input
                            type="file"
                            ref={qrFileInputRef}
                            onChange={handleQrFileSelected}
                            accept="image/png,image/jpeg,image/jpg"
                            className="hidden"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            icon={Upload}
                            loading={qrUploading}
                            onClick={() => qrFileInputRef.current?.click()}
                          >
                            Replace QR Code
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            icon={Trash2}
                            loading={qrRemoving}
                            onClick={handleRemoveQr}
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            Remove QR
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 transition bg-gray-50/50">
                      <input
                        type="file"
                        ref={qrFileInputRef}
                        onChange={handleQrFileSelected}
                        accept="image/png,image/jpeg,image/jpg"
                        className="hidden"
                      />
                      <QrCode className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-gray-800">No UPI QR code uploaded yet</p>
                      <p className="text-[11px] text-gray-400 mb-3">Upload your merchant QR code image to print it directly on invoices</p>
                      <Button
                        type="button"
                        size="sm"
                        icon={Upload}
                        loading={qrUploading}
                        onClick={() => qrFileInputRef.current?.click()}
                      >
                        Upload QR Image
                      </Button>
                    </div>
                  )}

                  <div className="text-[11px] text-gray-500 bg-amber-50 p-2.5 rounded-lg border border-amber-200/60 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>Static QR codes display your exact uploaded image without modifying payment data. Customers will type the payable amount into their UPI app.</span>
                  </div>
                </div>
              )}

              {/* Safety notice */}
              <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                <strong>Payment Safety Notice:</strong> Scanning a QR code does not mark an invoice as paid. Always verify that funds have been credited to your bank account before updating payment status.
              </div>
            </div>
          )}
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

