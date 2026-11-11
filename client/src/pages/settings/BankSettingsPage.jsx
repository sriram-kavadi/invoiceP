import React, { useState, useEffect } from 'react';
import { Plus, Landmark, Trash2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';

export default function BankSettingsPage() {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);

  const [formData, setFormData] = useState({
    accountHolder: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: '',
    upiId: '',
    isDefault: true,
  });

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/business/bank-accounts');
      if (res.data.success) {
        setBankAccounts(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.accountNumber || !formData.ifscCode) {
      toast.error('Account number and IFSC code are required');
      return;
    }

    setAdding(true);
    try {
      const res = await api.post('/business/bank-accounts', {
        ...formData,
        ifscCode: formData.ifscCode.toUpperCase(),
      });
      if (res.data.success) {
        toast.success('Bank account added');
        setShowAddModal(false);
        setFormData({
          accountHolder: '',
          bankName: '',
          accountNumber: '',
          ifscCode: '',
          branch: '',
          upiId: '',
          isDefault: false,
        });
        fetchAccounts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add bank account');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bank account?')) return;
    try {
      const res = await api.delete(`/business/bank-accounts/${id}`);
      if (res.data.success) {
        toast.success('Account deleted');
        fetchAccounts();
      }
    } catch (err) {
      toast.error('Failed to delete account');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Bank Accounts</h1>
          <p className="text-xs text-gray-500">
            Accounts displayed on the invoice for customer wire transfers
          </p>
        </div>

        <Button icon={Plus} size="sm" onClick={() => setShowAddModal(true)}>
          Add Bank Account
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bankAccounts.length > 0 ? (
          bankAccounts.map((b) => (
            <div
              key={b.id}
              className={`p-5 rounded-xl border bg-white shadow-xs space-y-3 relative ${
                b.isDefault ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">{b.bankName}</h3>
                    <p className="text-[11px] text-gray-400 font-mono">{b.branch || 'Branch'}</p>
                  </div>
                </div>

                {b.isDefault && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200">
                    <CheckCircle2 className="w-3 h-3" /> Default
                  </span>
                )}
              </div>

              <div className="space-y-1 text-xs text-gray-600 border-t pt-2">
                <p><span className="text-gray-400">Holder:</span> <span className="font-semibold text-gray-900">{b.accountHolder}</span></p>
                <p><span className="text-gray-400">Account No:</span> <span className="font-mono font-bold text-gray-900">{b.accountNumber}</span></p>
                <p><span className="text-gray-400">IFSC Code:</span> <span className="font-mono font-bold text-gray-900">{b.ifscCode}</span></p>
                {b.upiId && (
                  <p><span className="text-gray-400">UPI ID:</span> <span className="font-mono font-semibold text-green-700">{b.upiId}</span></p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => handleDelete(b.id)}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-gray-100 text-xs text-gray-400">
            No bank accounts configured. Add one so your bank details print on invoices.
          </div>
        )}
      </div>

      {/* Add Bank Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Bank Account">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Account Holder Name"
            required
            value={formData.accountHolder}
            onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
            placeholder="e.g. INFINITY ENTERPRISES"
          />
          <Input
            label="Bank Name"
            required
            value={formData.bankName}
            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            placeholder="e.g. KOTAK MAHINDRA BANK"
          />
          <Input
            label="Account Number"
            required
            value={formData.accountNumber}
            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
            placeholder="Account number"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="IFSC Code"
              required
              value={formData.ifscCode}
              onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
              placeholder="e.g. KKBK0007469"
            />
            <Input
              label="Branch"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              placeholder="e.g. SANATHNAGAR"
            />
          </div>

          <Input
            label="Business UPI ID (for QR Code Payment)"
            value={formData.upiId}
            onChange={(e) => setFormData({ ...formData, upiId: e.target.value.toLowerCase().trim() })}
            placeholder="e.g. yourbusiness@okaxis or 9876543210@upi"
            helperText="Generates an invoice-specific UPI QR code on your PDF for seamless customer payments."
          />

          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
            />
            <span className="text-xs font-semibold text-gray-800">Set as default account</span>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={adding}>
              Cancel
            </Button>
            <Button type="submit" loading={adding}>
              Save Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

