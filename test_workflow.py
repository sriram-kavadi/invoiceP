import urllib.request
import json

# 1. Login
login_data = json.dumps({'email': 'owner@infinityenterprises.com', 'password': 'password123'}).encode()
req = urllib.request.Request('http://localhost:3001/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
res = urllib.request.urlopen(req)
login_res = json.loads(res.read().decode())
token = login_res['data']['token']
biz_id = login_res['data']['business']['id']
print('=== 1. AUTHENTICATION ===')
print('Login SUCCESS!')
print('User:', login_res['data']['user']['name'])
print('Business:', login_res['data']['business']['name'], 'ID:', biz_id)

headers = {'Authorization': f'Bearer {token}', 'X-Business-Id': biz_id, 'Content-Type': 'application/json'}

# 2. Get Customers
print('\n=== 2. CUSTOMER MODULE ===')
req = urllib.request.Request('http://localhost:3001/api/customers', headers=headers)
res = urllib.request.urlopen(req)
cust_res = json.loads(res.read().decode())
print('Customers total:', cust_res['data']['pagination']['total'])
for c in cust_res['data']['customers']:
    print(f'  - {c["name"]} (GSTIN: {c.get("gstin")})')
customer_id = cust_res['data']['customers'][0]['id']

# 3. Get Products
print('\n=== 3. PRODUCT MODULE ===')
req = urllib.request.Request('http://localhost:3001/api/products', headers=headers)
res = urllib.request.urlopen(req)
prod_res = json.loads(res.read().decode())
print('Products total:', prod_res['data']['pagination']['total'])
for p in prod_res['data']['products']:
    print(f'  - {p["name"]} @ Rs.{p["sellingPrice"]} ({p["unit"]})')

# 4. Create an invoice exactly like invoicecopy.pdf!
print('\n=== 4. INVOICE CREATION ===')
inv_payload = {
    'invoiceType': 'GST',
    'gstType': 'INTRASTATE',
    'customerId': customer_id,
    'paymentTerms': 'Net 30',
    'deliveryNote': 'DN-040',
    'referenceNumber': 'REF/2526/040',
    'buyerOrderNumber': 'PO-889',
    'dispatchDocNumber': 'LR-5544',
    'dispatchedThrough': 'VRL Logistics',
    'destination': 'HYDERABAD',
    'termsOfDelivery': 'Door Delivery',
    'items': [
        {
            'description': "MOODS DOTTED 3's (MRP Rs.30)",
            'hsnSacCode': '40141010',
            'gstRate': 0,
            'taxClassification': 'TAXABLE',
            'shippedQty': 300,
            'billedQty': 300,
            'unit': 'WAL',
            'rate': 22.73,
            'discountPercent': 0
        },
        {
            'description': "MOODS ULTRATHIN 3's (MRP Rs.30)",
            'hsnSacCode': '40141010',
            'gstRate': 0,
            'taxClassification': 'TAXABLE',
            'shippedQty': 300,
            'billedQty': 300,
            'unit': 'WAL',
            'rate': 22.73,
            'discountPercent': 0
        },
        {
            'description': "MOODS ALL NIGHT 12's (MRP 140)",
            'hsnSacCode': '40141010',
            'gstRate': 0,
            'taxClassification': 'TAXABLE',
            'shippedQty': 300,
            'billedQty': 300,
            'unit': 'WAL',
            'rate': 106.06,
            'discountPercent': 0
        }
    ]
}

req = urllib.request.Request('http://localhost:3001/api/invoices', data=json.dumps(inv_payload).encode(), headers=headers)
res = urllib.request.urlopen(req)
created_inv = json.loads(res.read().decode())['data']
print('Created Draft Invoice:')
print('  Invoice No:', created_inv['invoiceNumber'])
print('  Grand Total: Rs.', created_inv['grandTotal'])
print('  Status:', created_inv['status'])
inv_id = created_inv['id']

# 5. Issue Invoice (triggers PDF generation!)
print('\n=== 5. INVOICE ISSUANCE & PDF GENERATION ===')
req = urllib.request.Request(f'http://localhost:3001/api/invoices/{inv_id}/issue', data=b'{}', headers=headers)
res = urllib.request.urlopen(req)
issued_inv = json.loads(res.read().decode())['data']
print('Issued Invoice:')
print('  Invoice No:', issued_inv['invoiceNumber'])
print('  Status:', issued_inv['status'])
print('  PDF Path:', issued_inv['pdfPath'])

# 6. Record Payment
print('\n=== 6. PAYMENT RECORDING ===')
pay_payload = {
    'amount': 25000,
    'paymentMethod': 'UPI',
    'transactionRef': 'UPI/241289/01',
    'notes': 'Partial payment via Google Pay'
}
req = urllib.request.Request(f'http://localhost:3001/api/payments/invoices/{inv_id}', data=json.dumps(pay_payload).encode(), headers=headers)
res = urllib.request.urlopen(req)
pay_res = json.loads(res.read().decode())['data']
print('Recorded Payment:')
print('  Paid Amount: Rs.', pay_res['payment']['amount'])
print('  Invoice Paid Status:', pay_res['invoice']['paymentStatus'])
print('  Total Paid: Rs.', pay_res['invoice']['totalPaid'])
print('  Remaining Balance: Rs.', pay_res['invoice']['outstandingAmount'])

# 7. Dashboard Summary
print('\n=== 7. DASHBOARD METRICS ===')
req = urllib.request.Request('http://localhost:3001/api/dashboard/summary', headers=headers)
res = urllib.request.urlopen(req)
dash = json.loads(res.read().decode())['data']
print('Dashboard Live Metrics:')
print('  Total Sales: Rs.', dash['totalSales'])
print('  Total Invoices:', dash['totalInvoices'])
print('  Total Collected: Rs.', dash['paidAmount'])
print('  Pending Receivables: Rs.', dash['pendingAmount'])
print('  Recent Invoices in Feed:', len(dash['recentInvoices']))
print('\n*** ALL TESTS PASSED SUCCESSFULLY! ***')

