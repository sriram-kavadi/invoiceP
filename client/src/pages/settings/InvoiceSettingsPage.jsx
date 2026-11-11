import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function InvoiceSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    invoicePrefix: 'INV',
    defaultPaymentTerms: 'Net 30',
    defaultDueDays: 30,
    roundOffEnabled: true,
    showBankDetails: true,
    showSignature: true,
    footerNote: 'This is a Computer Generated Invoice',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/business/settings');
        if (res.data.success && res.data.data) {
          setFormData(res.data.data);
        }
      } catch (err) {
        toast.error('Failed to load invoice settings');
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/business/settings', formData);
      if (res.data.success) {
        toast.success('Invoice preferences updated successfully');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Invoice Preferences</h1>
        <p className="text-xs text-gray-500">
          Configure default numbering, terms, round-off, and display options
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b pb-2">Numbering Series</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Invoice Number Prefix"
              required
              value={formData.invoicePrefix}
              onChange={(e) => handleChange('invoicePrefix', e.target.value.toUpperCase())}
              placeholder="e.g. INV, BILL, GST"
              helperText="Format will be: PREFIX/FY/0001 (e.g. INV/2526/0001)"
            />
            <Input
              label="Default Due Days"
              type="number"
              value={formData.defaultDueDays}
              onChange={(e) => handleChange('defaultDueDays', parseInt(e.target.value, 10) || 30)}
              placeholder="30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Default Payment Terms
            </label>
            <select
              value={formData.defaultPaymentTerms || 'Net 30'}
              onChange={(e) => handleChange('defaultPaymentTerms', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="Due on Receipt">Due on Receipt</option>
              <option value="Net 15">Net 15 Days</option>
              <option value="Net 30">Net 30 Days</option>
              <option value="Net 45">Net 45 Days</option>
              <option value="Advance">100% Advance Payment</option>
            </select>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b pb-2">Display & Calculation Options</h2>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.roundOffEnabled}
                onChange={(e) => handleChange('roundOffEnabled', e.target.checked)}
                className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
              />
              <div>
                <span className="text-sm font-semibold text-gray-800 block">
                  Enable Automatic Round-off
                </span>
                <span className="text-xs text-gray-400">
                  Rounds final invoice grand total to the nearest whole rupee
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showBankDetails}
                onChange={(e) => handleChange('showBankDetails', e.target.checked)}
                className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
              />
              <div>
                <span className="text-sm font-semibold text-gray-800 block">
                  Print Bank Details on Invoices
                </span>
                <span className="text-xs text-gray-400">
                  Includes bank account number, IFSC, and branch on printable invoices
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showSignature}
                onChange={(e) => handleChange('showSignature', e.target.checked)}
                className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
              />
              <div>
                <span className="text-sm font-semibold text-gray-800 block">
                  Show Authorized Signatory Section
                </span>
                <span className="text-xs text-gray-400">
                  Displays company seal & signature block at the bottom-right
                </span>
              </div>
            </label>
          </div>

          <div className="pt-3 border-t">
            <Input
              label="Footer Note"
              value={formData.footerNote || ''}
              onChange={(e) => handleChange('footerNote', e.target.value)}
              placeholder="This is a Computer Generated Invoice"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" loading={loading} size="lg" className="w-full sm:w-auto">
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}

