import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { INDIAN_STATES, BUSINESS_TYPES } from '../utils/constants';

export default function OnboardingPage() {
  const { updateBusiness } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    businessType: 'Wholesale',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: 'Telangana',
    stateCode: '36',
    pincode: '',
    isGstRegistered: true,
    gstin: '',
    pan: '',
    authorizedSignatory: '',
    // Bank details
    bankAccountHolder: '',
    bankName: '',
    bankAccountNumber: '',
    bankIfscCode: '',
    bankBranch: '',
  });

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'state') {
        const found = INDIAN_STATES.find((s) => s.name === value);
        if (found) updated.stateCode = found.code;
      }
      if (field === 'gstin' && value.length >= 12) {
        // Indian GSTIN characters 3 to 12 are the PAN!
        const panPart = value.substring(2, 12).toUpperCase();
        if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panPart)) {
          updated.pan = panPart;
        }
      }
      return updated;
    });
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.name.trim()) {
        toast.error('Please enter your business name');
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        businessType: formData.businessType,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        stateCode: formData.stateCode || undefined,
        pincode: formData.pincode || undefined,
        isGstRegistered: formData.isGstRegistered,
        gstin: formData.gstin ? formData.gstin.toUpperCase() : undefined,
        pan: formData.pan ? formData.pan.toUpperCase() : undefined,
        authorizedSignatory: formData.authorizedSignatory || undefined,
        bankAccount: formData.bankAccountNumber
          ? {
              accountHolder: formData.bankAccountHolder || formData.name,
              bankName: formData.bankName,
              accountNumber: formData.bankAccountNumber,
              ifscCode: formData.bankIfscCode.toUpperCase(),
              branch: formData.bankBranch || undefined,
              isDefault: true,
            }
          : undefined,
      };

      const res = await api.post('/business/onboard', payload);
      if (res.data.success) {
        toast.success('Business workspace configured successfully!');
        updateBusiness(res.data.data);
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Onboarding failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary-500/30 mx-auto">
            IH
          </div>
          <h2 className="mt-3 text-2xl font-black text-gray-900 tracking-tight">
            Set Up Your Business Workspace
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Step {step} of 3 — You can update these details anytime from settings.
          </p>

          {/* Stepper dots */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  s === step
                    ? 'w-8 bg-primary-600'
                    : s < step
                    ? 'w-2 bg-primary-300'
                    : 'w-2 bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Step 1: Business Basics */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b pb-2">
                  1. Business Information
                </h3>

                <Input
                  label="Business / Trade Name"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. INFINITY ENTERPRISES"
                />

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Business Type
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => handleChange('businessType', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {BUSINESS_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Business Phone Number"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="e.g. 9660252624"
                  />
                  <Input
                    label="Business Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="contact@business.com"
                  />
                </div>

                <Input
                  label="Authorized Signatory Name"
                  value={formData.authorizedSignatory}
                  onChange={(e) => handleChange('authorizedSignatory', e.target.value)}
                  placeholder="Name appearing in invoice signature"
                  helperText="Usually the owner or proprietor's name"
                />
              </div>
            )}

            {/* Step 2: Address & Tax Registration */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b pb-2">
                  2. Address & GST Registration
                </h3>

                <Input
                  label="Business Address / Street"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="e.g. 8-3-191/27/5, SR NAGAR, VENGAL RAO NAGAR"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="City"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="HYDERABAD"
                  />

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      State
                    </label>
                    <select
                      value={formData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
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
                    value={formData.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value)}
                    placeholder="500038"
                  />
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={formData.isGstRegistered}
                      onChange={(e) => handleChange('isGstRegistered', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                    />
                    <span className="text-sm font-semibold text-gray-800">
                      My business is registered under GST
                    </span>
                  </label>

                  {formData.isGstRegistered && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="GSTIN (15 Digits)"
                        value={formData.gstin}
                        onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                        placeholder="e.g. 36AKBPH4841D1ZK"
                        maxLength={15}
                      />
                      <Input
                        label="Company PAN"
                        value={formData.pan}
                        onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                        placeholder="e.g. AKBPH4841D"
                        maxLength={10}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Bank Account */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b pb-2">
                  3. Bank Account for Invoice Payment (Optional)
                </h3>
                <p className="text-xs text-gray-500">
                  These bank details will be printed on the invoice for customer wire transfers.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Account Holder Name"
                    value={formData.bankAccountHolder}
                    onChange={(e) => handleChange('bankAccountHolder', e.target.value)}
                    placeholder={formData.name || 'Account Holder'}
                  />
                  <Input
                    label="Bank Name"
                    value={formData.bankName}
                    onChange={(e) => handleChange('bankName', e.target.value)}
                    placeholder="e.g. KOTAK MAHINDRA BANK"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Account Number"
                    value={formData.bankAccountNumber}
                    onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
                    placeholder="e.g. 9985468056"
                  />
                  <Input
                    label="IFSC Code"
                    value={formData.bankIfscCode}
                    onChange={(e) => handleChange('bankIfscCode', e.target.value.toUpperCase())}
                    placeholder="e.g. KKBK0007469"
                  />
                  <Input
                    label="Branch Name"
                    value={formData.bankBranch}
                    onChange={(e) => handleChange('bankBranch', e.target.value)}
                    placeholder="e.g. SANATHNAGAR"
                  />
                </div>
              </div>
            )}

            {/* Footer Navigation Buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-6 border-t border-gray-100">
              {step > 1 ? (
                <Button variant="secondary" onClick={handleBack} disabled={loading} className="w-full sm:w-auto">
                  Back
                </Button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <Button onClick={handleNext} className="w-full sm:w-auto">
                  Next Step →
                </Button>
              ) : (
                <Button type="submit" loading={loading} className="w-full sm:w-auto">
                  Complete Setup & Open Dashboard
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

