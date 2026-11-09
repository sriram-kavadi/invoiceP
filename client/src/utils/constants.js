// Indian States with GST state codes
export const INDIAN_STATES = [
  { name: 'Andaman and Nicobar Islands', code: '35' },
  { name: 'Andhra Pradesh', code: '37' },
  { name: 'Arunachal Pradesh', code: '12' },
  { name: 'Assam', code: '18' },
  { name: 'Bihar', code: '10' },
  { name: 'Chandigarh', code: '04' },
  { name: 'Chhattisgarh', code: '22' },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: '26' },
  { name: 'Delhi', code: '07' },
  { name: 'Goa', code: '30' },
  { name: 'Gujarat', code: '24' },
  { name: 'Haryana', code: '06' },
  { name: 'Himachal Pradesh', code: '02' },
  { name: 'Jammu and Kashmir', code: '01' },
  { name: 'Jharkhand', code: '20' },
  { name: 'Karnataka', code: '29' },
  { name: 'Kerala', code: '32' },
  { name: 'Ladakh', code: '38' },
  { name: 'Lakshadweep', code: '31' },
  { name: 'Madhya Pradesh', code: '23' },
  { name: 'Maharashtra', code: '27' },
  { name: 'Manipur', code: '14' },
  { name: 'Meghalaya', code: '17' },
  { name: 'Mizoram', code: '15' },
  { name: 'Nagaland', code: '13' },
  { name: 'Odisha', code: '21' },
  { name: 'Puducherry', code: '34' },
  { name: 'Punjab', code: '03' },
  { name: 'Rajasthan', code: '08' },
  { name: 'Sikkim', code: '11' },
  { name: 'Tamil Nadu', code: '33' },
  { name: 'Telangana', code: '36' },
  { name: 'Tripura', code: '16' },
  { name: 'Uttar Pradesh', code: '09' },
  { name: 'Uttarakhand', code: '05' },
  { name: 'West Bengal', code: '19' },
];

export const GST_RATES = [0, 5, 12, 18, 28];

export const UNITS = [
  'PCS',
  'KG',
  'BOX',
  'WAL',
  'LTR',
  'MTR',
  'NOS',
  'SET',
  'DZ',
  'PACK',
  'OTHER',
];

export const PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Cheque',
  'Other',
];

export const BUSINESS_TYPES = [
  'Retail Shop',
  'Wholesale',
  'Distributor',
  'Trader',
  'Manufacturer',
  'Freelancer',
  'Service Provider',
  'Other',
];

export const INVOICE_STATUSES = {
  DRAFT: { label: 'Draft', color: 'gray' },
  ISSUED: { label: 'Issued', color: 'blue' },
  PAID: { label: 'Paid', color: 'green' },
  PARTIALLY_PAID: { label: 'Partially Paid', color: 'yellow' },
  OVERDUE: { label: 'Overdue', color: 'red' },
  CANCELLED: { label: 'Cancelled', color: 'gray', strikethrough: true },
};

export const PAYMENT_TERMS_OPTIONS = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'net7', label: 'Net 7 Days' },
  { value: 'net15', label: 'Net 15 Days' },
  { value: 'net30', label: 'Net 30 Days' },
  { value: 'net45', label: 'Net 45 Days' },
  { value: 'net60', label: 'Net 60 Days' },
  { value: 'custom', label: 'Custom' },
];

export const DATE_PRESETS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_fy', label: 'This Financial Year' },
  { value: 'custom', label: 'Custom Range' },
];
