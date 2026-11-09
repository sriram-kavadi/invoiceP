import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Eye,
  FileCheck,
  Save,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import InvoicePreview from '../../components/invoice/InvoicePreview';
import { calculateItemAmount, calculateTotals, numberToWords } from '../../utils/calculations';
import { UNITS, GST_RATES } from '../../utils/constants';

export default function CreateInvoicePage() {
  const { business } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCustomerId = searchParams.get('customerId') || '';

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);

  // New customer inline state
  const [newCustName, setNewCustName] = useState('');
  const [newCustGstin, setNewCustGstin] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustState, setNewCustState] = useState('Telangana');

  // Form State
  const [invoiceType, setInvoiceType] = useState('GST'); // GST | NON_GST
  const [gstType, setGstType] = useState('INTRASTATE'); // INTRASTATE | INTERSTATE
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [buyerOrderNumber, setBuyerOrderNumber] = useState('');
  const [dispatchDocNumber, setDispatchDocNumber] = useState('');
  const [dispatchedThrough, setDispatchedThrough] = useState('');
  const [destination, setDestination] = useState('');
  const [termsOfDelivery, setTermsOfDelivery] = useState('');
  const [notes, setNotes] = useState('');

  // Line Items
  const [items, setItems] = useState([
    {
      productId: '',
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

  // Load initial dropdown data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          api.get('/customers?limit=100'),
          api.get('/products?limit=100'),
        ]);

        if (cRes.data.success) {
          setCustomers(cRes.data.data.customers);
          if (initialCustomerId) {
            const found = cRes.data.data.customers.find((c) => c.id === initialCustomerId);
            if (found) {
              setSelectedCustomer(found);
              setSelectedCustomerId(found.id);
            }
          }
        }
        if (pRes.data.success) {
          setProducts(pRes.data.data.products);
        }
      } catch (err) {
        console.error('Initial data load error:', err);
      }
    };
    loadInitialData();
  }, [initialCustomerId]);

  // Customer Selection Handler
  const handleCustomerSelect = (custId) => {
    setSelectedCustomerId(custId);
    const found = customers.find((c) => c.id === custId);
    setSelectedCustomer(found || null);

    // Auto-detect interstate vs intrastate GST based on state
    if (found && business) {
      if (
        found.billingStateCode &&
        business.stateCode &&
        found.billingStateCode !== business.stateCode
      ) {
        setGstType('INTERSTATE');
      } else {
        setGstType('INTRASTATE');
      }
    }
  };

  // Add Row
  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: '',
        description: '',
        hsnSacCode: '',
        gstRate: invoiceType === 'NON_GST' ? 0 : 0,
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

  // Remove Row
  const handleRemoveRow = (index) => {
    if (items.length === 1) {
      toast.error('Invoice must have at least one line item');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Update Item Field
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };

      if (field === 'productId') {
        const p = products.find((prod) => prod.id === value);
        if (p) {
          current.description = p.name + (p.description ? ` - ${p.description}` : '');
          current.hsnSacCode = p.hsnSacCode || '';
          current.unit = p.unit || 'PCS';
          current.rate = Number(p.sellingPrice);
          current.gstRate = invoiceType === 'NON_GST' ? 0 : Number(p.gstRate || 0);
          current.taxClassification = p.taxClassification || 'TAXABLE';
          current.discountPercent = Number(p.defaultDiscount || 0);
        }
      }

      if (field === 'shippedQty' && (!current.billedQty || current.billedQty === updated[index].shippedQty)) {
        current.billedQty = value;
      }

      current.amount = calculateItemAmount(current);
      updated[index] = current;
      return updated;
    });
  };

  // Inline Customer Creation
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      toast.error('Customer name is required');
      return;
    }

    try {
      const res = await api.post('/customers', {
        name: newCustName,
        gstin: newCustGstin.toUpperCase() || undefined,
        phone: newCustPhone || undefined,
        billingAddress: newCustAddress || undefined,
        billingState: newCustState,
        sameAsShipping: true,
      });

      if (res.data.success) {
        toast.success('Customer added successfully!');
        const created = res.data.data;
        setCustomers((prev) => [created, ...prev]);
        setSelectedCustomerId(created.id);
        setSelectedCustomer(created);
        setShowNewCustomerModal(false);
        setNewCustName('');
        setNewCustGstin('');
        setNewCustPhone('');
        setNewCustAddress('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create customer');
    }
  };

  // Calculated Totals
  const effectiveGstType = invoiceType === 'NON_GST' ? 'NON_GST' : gstType;
  const totals = calculateTotals(items, effectiveGstType, true);

  // Payload Builder
  const buildPayload = () => {
    return {
      invoiceNumber: invoiceNumber.trim() || undefined,
      invoiceType,
      gstType,
      customerId: selectedCustomerId || undefined,
      invoiceDate,
      dueDate: dueDate || undefined,
      paymentTerms: paymentTerms || undefined,
      deliveryNote: deliveryNote || undefined,
      referenceNumber: referenceNumber || undefined,
      buyerOrderNumber: buyerOrderNumber || undefined,
      dispatchDocNumber: dispatchDocNumber || undefined,
      dispatchedThrough: dispatchedThrough || undefined,
      destination: destination || undefined,
      termsOfDelivery: termsOfDelivery || undefined,
      items: items.map((it) => ({
        productId: it.productId || undefined,
        description: it.description,
        hsnSacCode: it.hsnSacCode || undefined,
        gstRate: Number(it.gstRate || 0),
        taxClassification: it.taxClassification,
        shippedQty: Number(it.shippedQty),
        billedQty: Number(it.billedQty),
        unit: it.unit,
        rate: Number(it.rate),
        discountPercent: Number(it.discountPercent || 0),
      })),
      notes: notes || undefined,
    };
  };

  // Save as Draft
  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      const payload = buildPayload();
      const res = await api.post('/invoices', payload);
      if (res.data.success) {
        toast.success('Draft invoice saved!');
        navigate(`/invoices/${res.data.data.id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save draft invoice');
    } finally {
      setLoading(false);
    }
  };

  // Issue Invoice
  const handleIssueInvoice = async () => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer before issuing the invoice');
      return;
    }
    if (items.some((it) => !it.description.trim() || it.rate <= 0)) {
      toast.error('Please ensure all items have description and valid rate');
      return;
    }

    setLoading(true);
    try {
      const payload = buildPayload();
      // 1. Create draft
      const draftRes = await api.post('/invoices', payload);
      const invoiceId = draftRes.data.data.id;

      // 2. Issue invoice immediately
      const issueRes = await api.post(`/invoices/${invoiceId}/issue`);
      if (issueRes.data.success) {
        toast.success('Invoice issued successfully with official PDF generated!');
        navigate(`/invoices/${invoiceId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue invoice');
    } finally {
      setLoading(false);
    }
  };

  // Invoice Data for live preview
  const previewInvoiceData = {
    invoice: {
      invoiceNumber: invoiceNumber || 'DRAFT',
      invoiceDate,
      invoiceType,
      gstType,
      deliveryNote,
      paymentTerms,
      referenceNumber,
      buyerOrderNumber,
      dispatchDocNumber,
      dispatchedThrough,
      destination,
      termsOfDelivery,
      items,
      ...totals,
    },
    business: business || {},
    customer: selectedCustomer || {},
    bankAccount: business?.bankAccounts?.[0] || {},
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/invoices" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Create Invoice</h1>
            <p className="text-xs text-gray-500">
              Generates official Indian Tax Invoice matching the exact reference format
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Eye}
            onClick={() => setShowPreviewModal(true)}
          >
            Live Preview
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={Save}
            loading={loading}
            onClick={handleSaveDraft}
          >
            Save Draft
          </Button>
          <Button
            size="sm"
            icon={FileCheck}
            loading={loading}
            onClick={handleIssueInvoice}
          >
            Issue Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: 2 Cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Invoice Header & Type */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <h2 className="text-sm font-bold text-gray-900">1. Invoice Type & Tax Mode</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInvoiceType('GST')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                    invoiceType === 'GST'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  GST Tax Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceType('NON_GST')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                    invoiceType === 'NON_GST'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Non-GST Bill
                </button>
              </div>
            </div>

            {invoiceType === 'GST' && (
              <div className="flex items-center gap-4 text-xs font-semibold text-gray-700 pt-1">
                <span className="text-gray-400 font-bold uppercase text-[10px]">GST Treatment:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="gstType"
                    checked={gstType === 'INTRASTATE'}
                    onChange={() => setGstType('INTRASTATE')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  Intra-state (CGST + SGST)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="gstType"
                    checked={gstType === 'INTERSTATE'}
                    onChange={() => setGstType('INTERSTATE')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  Inter-state (IGST)
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <Input
                label="Invoice Number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Auto (e.g. INV/2526/0001)"
                helperText="Leave empty for auto-number"
              />
              <Input
                label="Invoice Date"
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
              <Input
                label="Due Date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Step 2: Customer Selection */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-sm font-bold text-gray-900">2. Customer / Buyer Details</h2>
              <button
                type="button"
                onClick={() => setShowNewCustomerModal(true)}
                className="text-xs font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Customer
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Select Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerSelect(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold"
              >
                <option value="">-- Choose Existing Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.gstin ? `(${c.gstin})` : ''} - {c.billingCity || c.billingState || ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomer && (
              <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="font-bold text-gray-900 block">{selectedCustomer.name}</span>
                  <span className="text-gray-500 block">{selectedCustomer.billingAddress || 'No street address'}</span>
                  <span className="text-gray-500 block">
                    {selectedCustomer.billingCity} {selectedCustomer.billingState} ({selectedCustomer.billingStateCode || '-'})
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">
                    GSTIN: <span className="font-mono font-bold text-gray-800">{selectedCustomer.gstin || 'Unregistered'}</span>
                  </span>
                  <span className="text-gray-500 block">Contact: {selectedCustomer.phone || '-'}</span>
                  <span className="text-gray-500 block">Person: {selectedCustomer.contactPerson || '-'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Product Line Items Table */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-sm font-bold text-gray-900">3. Products & Line Items</h2>
              <Button size="sm" variant="secondary" icon={Plus} onClick={handleAddRow}>
                Add Item Row
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3 relative"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                    <span>Item #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Pick saved product */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <select
                        value={item.productId || ''}
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                      >
                        <option value="">-- Quick pick from catalogue --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (₹{p.sellingPrice} / {p.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <Input
                      placeholder="HSN/SAC Code"
                      value={item.hsnSacCode}
                      onChange={(e) => handleItemChange(index, 'hsnSacCode', e.target.value)}
                      className="text-xs py-1.5"
                    />
                  </div>

                  {/* Description input */}
                  <Input
                    placeholder="Item description as printed on invoice..."
                    value={item.description}
                    required
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className="text-xs py-1.5 font-medium"
                  />

                  {/* Numeric fields row */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-bold">
                        Shipped Qty
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.shippedQty}
                        onChange={(e) =>
                          handleItemChange(index, 'shippedQty', parseFloat(e.target.value) || 0)
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1 text-right font-mono"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-bold">
                        Billed Qty
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.billedQty}
                        onChange={(e) =>
                          handleItemChange(index, 'billedQty', parseFloat(e.target.value) || 0)
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1 text-right font-mono font-bold"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-bold">
                        Unit
                      </span>
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        className="w-full border border-gray-300 rounded px-1.5 py-1 text-center font-bold"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-bold">
                        Rate (₹)
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.rate}
                        onChange={(e) =>
                          handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1 text-right font-mono font-bold"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-bold">
                        Disc %
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={item.discountPercent}
                        onChange={(e) =>
                          handleItemChange(index, 'discountPercent', parseFloat(e.target.value) || 0)
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1 text-right font-mono"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-bold">
                        Amount (₹)
                      </span>
                      <div className="w-full bg-gray-100 border border-gray-300 rounded px-2 py-1 text-right font-mono font-bold text-gray-900">
                        {item.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 4: Dispatch & Reference Details (Collapsible) */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-left text-sm font-bold text-gray-900"
            >
              <span>4. Dispatch & Order References (Optional)</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t">
                <Input
                  label="Payment Terms"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. Net 30 / Advance"
                />
                <Input
                  label="Delivery Note"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="e.g. DN-040"
                />
                <Input
                  label="Reference No. & Date"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. REF/89"
                />
                <Input
                  label="Buyer's Order No."
                  value={buyerOrderNumber}
                  onChange={(e) => setBuyerOrderNumber(e.target.value)}
                  placeholder="PO-2024"
                />
                <Input
                  label="Dispatch Doc No."
                  value={dispatchDocNumber}
                  onChange={(e) => setDispatchDocNumber(e.target.value)}
                  placeholder="LR / Docket #"
                />
                <Input
                  label="Dispatched Through"
                  value={dispatchedThrough}
                  onChange={(e) => setDispatchedThrough(e.target.value)}
                  placeholder="e.g. VRL Logistics"
                />
                <Input
                  label="Destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="HYDERABAD"
                />
                <Input
                  label="Terms of Delivery"
                  value={termsOfDelivery}
                  onChange={(e) => setTermsOfDelivery(e.target.value)}
                  placeholder="e.g. Door Delivery"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Summary Box */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm sticky top-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900 border-b pb-2">Invoice Summary</h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({totals.totalBilledQty} units):</span>
                <span className="font-mono font-semibold">₹{totals.subtotal.toFixed(2)}</span>
              </div>

              {totals.totalDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>Discount:</span>
                  <span className="font-mono">-₹{totals.totalDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-700 font-semibold pt-1 border-t">
                <span>Taxable Amount:</span>
                <span className="font-mono">₹{totals.taxableAmount.toFixed(2)}</span>
              </div>

              {invoiceType === 'GST' && (
                <>
                  {gstType === 'INTRASTATE' ? (
                    <>
                      <div className="flex justify-between text-gray-600 pl-2">
                        <span>CGST:</span>
                        <span className="font-mono">₹{totals.cgstAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 pl-2">
                        <span>SGST:</span>
                        <span className="font-mono">₹{totals.sgstAmount.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-gray-600 pl-2">
                      <span>IGST:</span>
                      <span className="font-mono">₹{totals.igstAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-700 font-semibold pl-2">
                    <span>Total Tax:</span>
                    <span className="font-mono">₹{totals.totalTax.toFixed(2)}</span>
                  </div>
                </>
              )}

              {totals.roundOff !== 0 && (
                <div className="flex justify-between text-gray-500 italic">
                  <span>Round Off:</span>
                  <span className="font-mono">
                    {totals.roundOff < 0 ? `(-)${Math.abs(totals.roundOff).toFixed(2)}` : `(+)${totals.roundOff.toFixed(2)}`}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-base font-black text-gray-900 pt-3 border-t-2 border-gray-900">
                <span>Grand Total:</span>
                <span className="font-mono text-primary-600">
                  ₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200 text-[11px] text-blue-900 mt-3">
                <span className="font-bold block uppercase text-[9px] text-blue-600">Amount in Words:</span>
                <span className="italic font-semibold capitalize">INR {numberToWords(totals.grandTotal)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Button
                size="lg"
                loading={loading}
                className="w-full"
                icon={FileCheck}
                onClick={handleIssueInvoice}
              >
                Issue Invoice (Official PDF)
              </Button>
              <Button
                variant="secondary"
                size="md"
                loading={loading}
                className="w-full"
                icon={Save}
                onClick={handleSaveDraft}
              >
                Save Draft
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Official Invoice Preview (A4 Printable Format)"
        size="full"
      >
        <div className="p-2 overflow-x-auto bg-gray-100 rounded-lg">
          <InvoicePreview invoiceData={previewInvoiceData} />
        </div>
      </Modal>

      {/* Add New Customer Modal */}
      <Modal
        isOpen={showNewCustomerModal}
        onClose={() => setShowNewCustomerModal(false)}
        title="Add New Customer"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <Input
            label="Customer Name"
            required
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
            placeholder="e.g. LALITHA ENTERPRICESES"
          />
          <Input
            label="GSTIN (Optional)"
            value={newCustGstin}
            onChange={(e) => setNewCustGstin(e.target.value.toUpperCase())}
            placeholder="15-digit GSTIN"
            maxLength={15}
          />
          <Input
            label="Phone Number"
            type="tel"
            value={newCustPhone}
            onChange={(e) => setNewCustPhone(e.target.value)}
            placeholder="Contact phone"
          />
          <Input
            label="Address"
            value={newCustAddress}
            onChange={(e) => setNewCustAddress(e.target.value)}
            placeholder="Complete address"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowNewCustomerModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

