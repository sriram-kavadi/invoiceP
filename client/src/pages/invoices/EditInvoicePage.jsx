import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, FileCheck, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { calculateItemAmount, calculateTotals } from '../../utils/calculations';
import { UNITS } from '../../utils/constants';

export default function EditInvoicePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [invoiceType, setInvoiceType] = useState('GST');
  const [gstType, setGstType] = useState('INTRASTATE');
  const [customerId, setCustomerId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryNoteDate, setDeliveryNoteDate] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [referenceDate, setReferenceDate] = useState('');
  const [otherReferences, setOtherReferences] = useState('');
  const [buyerOrderNumber, setBuyerOrderNumber] = useState('');
  const [buyerOrderDate, setBuyerOrderDate] = useState('');
  const [dispatchDocNumber, setDispatchDocNumber] = useState('');
  const [dispatchedThrough, setDispatchedThrough] = useState('');
  const [destination, setDestination] = useState('');
  const [termsOfDelivery, setTermsOfDelivery] = useState('');
  const [items, setItems] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [invRes, cRes, pRes] = await Promise.all([
          api.get(`/invoices/${id}`),
          api.get('/customers?limit=100'),
          api.get('/products?limit=100'),
        ]);

        if (invRes.data.success) {
          const inv = invRes.data.data;
          if (inv.status !== 'DRAFT') {
            toast.error('Only DRAFT invoices can be edited');
            navigate(`/invoices/${id}`);
            return;
          }
          setInvoice(inv);
          setInvoiceType(inv.invoiceType);
          setGstType(inv.gstType);
          setCustomerId(inv.customerId || '');
          setInvoiceNumber(inv.invoiceNumber);
          setInvoiceDate(inv.invoiceDate ? inv.invoiceDate.split('T')[0] : '');
          setDueDate(inv.dueDate ? inv.dueDate.split('T')[0] : '');
          setPaymentTerms(inv.paymentTerms || '');
          setDeliveryNote(inv.deliveryNote || '');
          setDeliveryNoteDate(inv.deliveryNoteDate ? inv.deliveryNoteDate.split('T')[0] : '');
          setReferenceNumber(inv.referenceNumber || '');
          setReferenceDate(inv.referenceDate ? inv.referenceDate.split('T')[0] : '');
          setOtherReferences(inv.otherReferences || '');
          setBuyerOrderNumber(inv.buyerOrderNumber || '');
          setBuyerOrderDate(inv.buyerOrderDate ? inv.buyerOrderDate.split('T')[0] : '');
          setDispatchDocNumber(inv.dispatchDocNumber || '');
          setDispatchedThrough(inv.dispatchedThrough || '');
          setDestination(inv.destination || '');
          setTermsOfDelivery(inv.termsOfDelivery || '');
          setItems(
            inv.items.map((it) => ({
              ...it,
              rate: Number(it.rate),
              shippedQty: Number(it.shippedQty),
              billedQty: Number(it.billedQty),
              discountPercent: Number(it.discountPercent || 0),
              gstRate: Number(it.gstRate || 0),
              amount: Number(it.amount),
            }))
          );
        }

        if (cRes.data.success) setCustomers(cRes.data.data.customers);
        if (pRes.data.success) setProducts(pRes.data.data.products);
      } catch (err) {
        toast.error('Failed to load invoice');
        navigate('/invoices');
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [id]);

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };
      current.amount = calculateItemAmount(current);
      updated[index] = current;
      return updated;
    });
  };

  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      {
        description: '',
        hsnSacCode: '',
        gstRate: 0,
        taxClassification: 'TAXABLE',
        shippedQty: 1,
        billedQty: 1,
        unit: 'PCS',
        rate: 0,
        discountPercent: 0,
        amount: 0,
      },
    ]);
  };

  const handleRemoveRow = (index) => {
    if (items.length === 1) {
      toast.error('At least one item required');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        invoiceType,
        gstType,
        customerId: customerId || undefined,
        invoiceDate,
        dueDate: dueDate || undefined,
        paymentTerms: paymentTerms || undefined,
        deliveryNote: deliveryNote || undefined,
        deliveryNoteDate: deliveryNoteDate || undefined,
        referenceNumber: referenceNumber || undefined,
        referenceDate: referenceDate || undefined,
        otherReferences: otherReferences || undefined,
        buyerOrderNumber: buyerOrderNumber || undefined,
        buyerOrderDate: buyerOrderDate || undefined,
        dispatchDocNumber: dispatchDocNumber || undefined,
        dispatchedThrough: dispatchedThrough || undefined,
        destination: destination || undefined,
        termsOfDelivery: termsOfDelivery || undefined,
        items,
      };

      const res = await api.put(`/invoices/${id}`, payload);
      if (res.data.success) {
        toast.success('Invoice updated successfully');
        navigate(`/invoices/${id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update invoice');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="text-center py-12 text-xs text-gray-500">Loading invoice...</div>;
  }

  const effectiveGstType = invoiceType === 'NON_GST' ? 'NON_GST' : gstType;
  const totals = useMemo(() => calculateTotals(items, effectiveGstType, true), [items, effectiveGstType]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/invoices/${id}`} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Edit Draft {invoiceNumber}</h1>
            <p className="text-xs text-gray-500">Modify line items, quantities, and pricing</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/invoices/${id}`}>
            <Button variant="secondary" size="sm">Cancel</Button>
          </Link>
          <Button size="sm" icon={Save} loading={loading} onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Customer
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">-- Select Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Input label="Invoice Date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          <Input label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        {/* Product items */}
        <div className="pt-4 border-t space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Line Items</h3>
            <Button size="sm" variant="secondary" icon={Plus} onClick={handleAddRow}>Add Row</Button>
          </div>

          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-1 sm:grid-cols-6 gap-2 text-xs">
                <div className="sm:col-span-2">
                  <span className="text-[10px] text-gray-400 font-bold">Description</span>
                  <input
                    type="text"
                    value={it.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    className="w-full border rounded px-2 py-1 font-semibold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold">Billed Qty</span>
                  <input
                    type="number"
                    value={it.billedQty}
                    onChange={(e) => handleItemChange(idx, 'billedQty', parseFloat(e.target.value) || 0)}
                    className="w-full border rounded px-2 py-1 text-right font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold">Rate (₹)</span>
                  <input
                    type="number"
                    value={it.rate}
                    onChange={(e) => handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                    className="w-full border rounded px-2 py-1 text-right font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold">Amount (₹)</span>
                  <div className="border bg-white rounded px-2 py-1 text-right font-mono font-bold">
                    {it.amount.toFixed(2)}
                  </div>
                </div>
                <div className="flex items-end justify-center pb-1">
                  <button type="button" onClick={() => handleRemoveRow(idx)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step: Additional Invoice Details (Collapsible) */}
        <div className="pt-4 border-t space-y-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-gray-700"
          >
            <span>Additional Invoice Details (Optional)</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Reference No."
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. REF/89"
                />
                <Input
                  label="Reference Date"
                  type="date"
                  value={referenceDate}
                  onChange={(e) => setReferenceDate(e.target.value)}
                />
                <Input
                  label="Other References"
                  value={otherReferences}
                  onChange={(e) => setOtherReferences(e.target.value)}
                  placeholder="e.g. Tender/Project Ref"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Buyer's Order No."
                  value={buyerOrderNumber}
                  onChange={(e) => setBuyerOrderNumber(e.target.value)}
                  placeholder="e.g. PO-2024-001"
                />
                <Input
                  label="Buyer's Order Date"
                  type="date"
                  value={buyerOrderDate}
                  onChange={(e) => setBuyerOrderDate(e.target.value)}
                />
                <Input
                  label="Mode / Terms of Payment"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. Net 30 / Advance"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Delivery Note"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="e.g. DN-040"
                />
                <Input
                  label="Delivery Note Date"
                  type="date"
                  value={deliveryNoteDate}
                  onChange={(e) => setDeliveryNoteDate(e.target.value)}
                />
                <Input
                  label="Dispatch Doc No."
                  value={dispatchDocNumber}
                  onChange={(e) => setDispatchDocNumber(e.target.value)}
                  placeholder="LR / Docket #"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Dispatched Through"
                  value={dispatchedThrough}
                  onChange={(e) => setDispatchedThrough(e.target.value)}
                  placeholder="e.g. VRL Logistics / By Road"
                />
                <Input
                  label="Destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. HYDERABAD"
                />
                <Input
                  label="Terms of Delivery"
                  value={termsOfDelivery}
                  onChange={(e) => setTermsOfDelivery(e.target.value)}
                  placeholder="e.g. Door Delivery / Ex-Works"
                />
              </div>
            </div>
          )}
        </div>

        {/* Grand Total */}
        <div className="pt-4 border-t flex justify-end">
          <div className="text-right">
            <span className="text-xs text-gray-500 uppercase font-bold block">Grand Total</span>
            <span className="text-2xl font-black text-primary-600 font-mono">
              ₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

