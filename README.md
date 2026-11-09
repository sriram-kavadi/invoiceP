# InvoiceHub – Multi-Business Invoice Generation Platform

A full-stack, multi-tenant invoice generation platform tailored for Indian businesses (GST & Non-GST) featuring the exact standard Indian Tax Invoice format, automated GST calculation (CGST/SGST/IGST), customer and product catalogs, payment tracking, live dashboard analytics, and printable/downloadable PDF generation.

---

## 🚀 Supabase + Vercel Cloud Deployment Guide

InvoiceHub is pre-configured for a zero-server setup:
- **Database:** [Supabase](https://supabase.com) (Managed Cloud PostgreSQL with Connection Pooling)
- **Frontend & Serverless API:** [Vercel](https://vercel.com) (Vite React + Express Serverless Monorepo)

---

### Step 1: Create a Free Database on Supabase

1. Go to [Supabase](https://supabase.com) and create or log in to your account.
2. Click **New project**, choose your organization, name your project (e.g. `invoicehub`), and set a secure database password (remember this password!).
3. Select the region closest to your users (e.g., `South Asia (Mumbai)` or `AWS Singapore / US East`).
4. Once the project is provisioned, go to **Project Settings** (gear icon) → **Database**.
5. Scroll down to the **Connection String** section and select the **URI** tab.

You will need **TWO** connection strings from Supabase:

#### A. Pooled Connection String (`DATABASE_URL`)
- Under **Mode**, select **Transaction** (Port `6543`).
- Copy the URI string:
  ```
  postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
  ```
- *Note:* Make sure `?pgbouncer=true` is appended to the end.

#### B. Direct Connection String (`DIRECT_URL`)
- Under **Mode**, select **Session** (Port `5432`).
- Copy the URI string:
  ```
  postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
  ```

---

### Step 2: Initialize Database on Supabase

You can initialize your database using either the **Supabase Web SQL Editor** (recommended) or the **Prisma CLI**:

#### Option A: Supabase Web SQL Editor (Recommended – Zero CLI Setup)
1. Open the file [`supabase.sql`](file:///d:/invoiceP/supabase.sql) located at the root of this repository and copy all its contents.
2. In your [Supabase Dashboard](https://supabase.com/dashboard), click on **SQL Editor** in the left navigation sidebar.
3. Click **New query**, paste the SQL script into the query editor, and click **Run** (or press `Ctrl+Enter`).
4. That's it! All 14 tables, UUID defaults, performance indexes, foreign key cascades, and demo seed data are instantly created. You can verify everything in the **Table Editor**!

#### Option B: Via Terminal using Prisma CLI
1. Update `server/.env` with your Supabase connection strings:
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
   ```
2. Run the push and seed commands:
   ```bash
   # Push schema to Supabase (creates all 14 tables with indexes and constraints)
   npm run db:push

   # (Optional) Seed initial demo business, user, customer, products, and invoices
   npm run db:seed
   ```

---

### Step 3: Push Your Code to Git

Push your repository to GitHub, GitLab, or Bitbucket:

```bash
git init
git add .
git commit -m "feat: InvoiceHub ready for Supabase and Vercel"
git branch -M main
git remote add origin https://github.com/<your-username>/invoicehub.git
git push -u origin main
```

---

### Step 4: Deploy on Vercel

1. Log in to [Vercel](https://vercel.com) and click **Add New...** → **Project**.
2. Import your `invoicehub` Git repository.
3. Keep the **Root Directory** as `./` (the root of the project).
4. Vercel automatically detects `vercel.json` and configures the build:
   - **Framework Preset:** Vite / Other
   - **Build Command:** `npm run vercel-build`
   - **Output Directory:** `client/dist`
5. Expand **Environment Variables** and add the following keys:

| Variable Name | Value | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true` | Supabase Transaction Pooler (port 6543) |
| `DIRECT_URL` | `postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres` | Supabase Direct Session (port 5432) |
| `JWT_SECRET` | A random 32+ character string (e.g., `w9X!kL7$pQ2#mZ5@vR8*bT1^yU4&jN3~`) | Secret for signing JWT authentication tokens |
| `JWT_EXPIRES_IN` | `7d` | Token expiry duration |
| `NODE_ENV` | `production` | Enables production optimizations |
| `CLIENT_URL` | `https://<your-project-name>.vercel.app` | Your Vercel production deployment URL |

6. Click **Deploy**.
7. Vercel will install dependencies, run `prisma generate`, build the React frontend, and deploy both the UI and Serverless API (`/api/*`).

---

## 💻 Local Development Quickstart

If you want to run the project locally against either a local PostgreSQL or your Supabase instance:

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` in `server/`:
```bash
cp server/.env.example server/.env
```
Set your `DATABASE_URL` and `DIRECT_URL` (either local or Supabase).

### 3. Generate Prisma Client & Migrate
```bash
npm run db:push
npm run db:seed
```

### 4. Start Development Servers
Run both backend and frontend concurrently:
```bash
# Terminal 1: Backend API (port 3001)
npm run dev:server

# Terminal 2: React Frontend (port 5173)
npm run dev:client
```

- Open frontend: [http://localhost:5173](http://localhost:5173)
- API endpoint: [http://localhost:3001/api](http://localhost:3001/api)

### 5. Seed Demo Credentials
- **Email:** `owner@infinityenterprises.com`
- **Password:** `password123`

---

## 🛠 Features & Capabilities

- **Strict Multi-Tenant Isolation:** Every business has separate customers, products, invoices, bank accounts, and reports. Business access is strictly validated server-side from JWT session claims.
- **Official Indian Tax Invoice Layout:** Exact 1:1 match to the reference standard invoice (`TAX INVOICE`, 2-column Seller/Invoice layout, Consignee "Ship to" & Buyer "Bill to", 10-column product table, HSN/SAC codes, CGST/SGST/IGST breakdown, Amount in Indian words with Lakhs/Crores, Bank Details, and Authorized Signatory).
- **Client & Server Calculations:** Round-off adjustment, line item discounts, inclusive/exclusive GST calculations, and decimal precision.
- **PDF Generation on Vercel:** Powered by `@sparticuz/chromium` on AWS Lambda / Vercel Serverless, with fallback to local Chrome/Edge.
- **Customer & Product Catalogues:** Reusable catalog items with one-click selection and auto-filling during invoice creation.
- **Payment & Invoice Workflow:** Draft → Issue → Mark Paid / Partially Paid → Cancel.
- **Reporting & Export:** Sales reports and customer ledger exportable to Excel (`.xlsx`).

---

## 📁 Repository Structure

```
invoicehub/
├── api/                    # Vercel Serverless entrypoint (index.js)
├── client/                 # React 18 + Vite + Tailwind CSS frontend
│   ├── src/
│   │   ├── components/     # UI components (InvoicePreview, Modal, Button...)
│   │   ├── pages/          # Auth, Invoices, Customers, Products, Reports...
│   │   ├── context/        # AuthContext
│   │   └── services/       # Axios API client
│   └── dist/               # Built static production bundle
├── server/                 # Express backend API
│   ├── prisma/             # schema.prisma & seed.js
│   └── src/
│       ├── modules/        # auth, business, customers, products, invoices, payments...
│       ├── services/       # pdfService (Puppeteer + Sparticuz)
│       └── middleware/     # authMiddleware, tenantMiddleware, errorHandler
├── vercel.json             # Vercel Serverless routing & build configuration
└── package.json            # Unified monorepo scripts
```
"# invoiceP" 
