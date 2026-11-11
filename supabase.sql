-- ==============================================================================
-- InvoiceHub - Complete Supabase Setup Script (DDL + Constraints + Seed Data)
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project -> Go to "SQL Editor" in the left sidebar
-- 3. Click "New Query", paste this entire script, and click "Run" (or Ctrl+Enter)
-- 4. All 14 tables, indexes, relationships, and demo data will be created!
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Enums
DO $$ BEGIN
    CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tables

-- User Table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Session Table
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- PasswordReset Table
CREATE TABLE IF NOT EXISTS "PasswordReset" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- Business Table
CREATE TABLE IF NOT EXISTS "Business" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "businessType" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "stateCode" TEXT,
    "pincode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "isGstRegistered" BOOLEAN NOT NULL DEFAULT false,
    "logoPath" TEXT,
    "upiId" TEXT,
    "authorizedSignatory" TEXT,
    "jurisdiction" TEXT,
    "declaration" TEXT DEFAULT 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Business" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- BusinessUser Table (Multi-tenant junction)
CREATE TABLE IF NOT EXISTS "BusinessUser" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessUser_pkey" PRIMARY KEY ("id")
);

-- BusinessSettings Table
CREATE TABLE IF NOT EXISTS "BusinessSettings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "businessId" TEXT NOT NULL,
    "defaultPaymentTerms" TEXT,
    "defaultGstType" TEXT NOT NULL DEFAULT 'INTRASTATE',
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "invoiceNumberFormat" TEXT NOT NULL DEFAULT 'PREFIX/FY/NUM',
    "roundOffEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultDueDays" INTEGER NOT NULL DEFAULT 30,
    "showBankDetails" BOOLEAN NOT NULL DEFAULT true,
    "showUpiQr" BOOLEAN NOT NULL DEFAULT true,
    "showSignature" BOOLEAN NOT NULL DEFAULT true,
    "showFooterNote" BOOLEAN NOT NULL DEFAULT true,
    "footerNote" TEXT DEFAULT 'This is a Computer Generated Invoice',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "BusinessSettings" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- BusinessBankAccount Table
CREATE TABLE IF NOT EXISTS "BusinessBankAccount" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "businessId" TEXT NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ifscCode" TEXT NOT NULL,
    "branch" TEXT,
    "upiId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessBankAccount_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "BusinessBankAccount" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Safe migrations for UPI QR Code support (Idempotent)
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "upiId" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "upiQrPath" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "upiQrMode" TEXT DEFAULT 'DYNAMIC';
ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "showUpiQr" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "upiQrMode" TEXT DEFAULT 'DYNAMIC';
ALTER TABLE "BusinessBankAccount" ADD COLUMN IF NOT EXISTS "upiId" TEXT;

-- Customer Table
CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerType" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "billingAddress" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingStateCode" TEXT,
    "billingPincode" TEXT,
    "shippingAddress" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingStateCode" TEXT,
    "shippingPincode" TEXT,
    "sameAsShipping" BOOLEAN NOT NULL DEFAULT true,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Customer" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Product Table
CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "hsnSacCode" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "sellingPrice" DECIMAL(15,4) NOT NULL,
    "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxClassification" TEXT NOT NULL DEFAULT 'TAXABLE',
    "defaultDiscount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isService" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Product" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- InvoiceSequence Table
CREATE TABLE IF NOT EXISTS "InvoiceSequence" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "businessId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT 'INV',
    "financialYear" TEXT NOT NULL,
    "currentNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "InvoiceSequence" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Invoice Table
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceType" TEXT NOT NULL DEFAULT 'GST',
    "gstType" TEXT NOT NULL DEFAULT 'INTRASTATE',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "deliveryNoteDate" TIMESTAMP(3),
    "deliveryNote" TEXT,
    "paymentTerms" TEXT,
    "referenceNumber" TEXT,
    "referenceDate" TIMESTAMP(3),
    "otherReferences" TEXT,
    "buyerOrderNumber" TEXT,
    "buyerOrderDate" TIMESTAMP(3),
    "dispatchDocNumber" TEXT,
    "dispatchedThrough" TEXT,
    "destination" TEXT,
    "termsOfDelivery" TEXT,
    "sellerSnapshot" JSONB,
    "customerSnapshot" JSONB,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalDiscount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxableAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "cgstAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sgstAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "igstAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalTax" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "roundOff" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalPaid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "outstandingAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalShippedQty" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "totalBilledQty" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "cancelReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "pdfPath" TEXT,
    "shareToken" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Invoice" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- InvoiceItem Table
CREATE TABLE IF NOT EXISTS "InvoiceItem" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "slNo" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "hsnSacCode" TEXT,
    "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxClassification" TEXT NOT NULL DEFAULT 'TAXABLE',
    "shippedQty" DECIMAL(15,3) NOT NULL,
    "billedQty" DECIMAL(15,3) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "rate" DECIMAL(15,4) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxableAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "cgstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "cgstAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sgstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "sgstAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "igstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "igstAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- Payment Table
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transactionRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- InvoiceAuditLog Table
CREATE TABLE IF NOT EXISTS "InvoiceAuditLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "invoiceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceAuditLog_pkey" PRIMARY KEY ("id")
);

-- InvoiceFile Table
CREATE TABLE IF NOT EXISTS "InvoiceFile" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "invoiceId" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceFile_pkey" PRIMARY KEY ("id")
);

-- 4. Indexes & Unique Constraints
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
CREATE INDEX IF NOT EXISTS "Session_token_idx" ON "Session"("token");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordReset_token_key" ON "PasswordReset"("token");
CREATE INDEX IF NOT EXISTS "PasswordReset_token_idx" ON "PasswordReset"("token");
CREATE INDEX IF NOT EXISTS "BusinessUser_userId_idx" ON "BusinessUser"("userId");
CREATE INDEX IF NOT EXISTS "BusinessUser_businessId_idx" ON "BusinessUser"("businessId");
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessUser_userId_businessId_key" ON "BusinessUser"("userId", "businessId");
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessSettings_businessId_key" ON "BusinessSettings"("businessId");
CREATE INDEX IF NOT EXISTS "BusinessBankAccount_businessId_idx" ON "BusinessBankAccount"("businessId");
CREATE INDEX IF NOT EXISTS "Customer_businessId_idx" ON "Customer"("businessId");
CREATE INDEX IF NOT EXISTS "Customer_businessId_name_idx" ON "Customer"("businessId", "name");
CREATE INDEX IF NOT EXISTS "Product_businessId_idx" ON "Product"("businessId");
CREATE INDEX IF NOT EXISTS "Product_businessId_name_idx" ON "Product"("businessId", "name");
CREATE INDEX IF NOT EXISTS "InvoiceSequence_businessId_idx" ON "InvoiceSequence"("businessId");
CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceSequence_businessId_prefix_financialYear_key" ON "InvoiceSequence"("businessId", "prefix", "financialYear");
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_shareToken_key" ON "Invoice"("shareToken");
CREATE INDEX IF NOT EXISTS "Invoice_businessId_idx" ON "Invoice"("businessId");
CREATE INDEX IF NOT EXISTS "Invoice_businessId_invoiceDate_idx" ON "Invoice"("businessId", "invoiceDate" DESC);
CREATE INDEX IF NOT EXISTS "Invoice_businessId_status_idx" ON "Invoice"("businessId", "status");
CREATE INDEX IF NOT EXISTS "Invoice_businessId_status_invoiceDate_idx" ON "Invoice"("businessId", "status", "invoiceDate" DESC);
CREATE INDEX IF NOT EXISTS "Invoice_businessId_paymentStatus_idx" ON "Invoice"("businessId", "paymentStatus");
CREATE INDEX IF NOT EXISTS "Invoice_businessId_customerId_idx" ON "Invoice"("businessId", "customerId");
CREATE INDEX IF NOT EXISTS "Invoice_customerId_idx" ON "Invoice"("customerId");
CREATE INDEX IF NOT EXISTS "Invoice_shareToken_idx" ON "Invoice"("shareToken");
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_businessId_invoiceNumber_key" ON "Invoice"("businessId", "invoiceNumber");
CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");
CREATE INDEX IF NOT EXISTS "Payment_invoiceId_idx" ON "Payment"("invoiceId");
CREATE INDEX IF NOT EXISTS "Payment_paymentDate_idx" ON "Payment"("paymentDate" DESC);
CREATE INDEX IF NOT EXISTS "InvoiceAuditLog_invoiceId_idx" ON "InvoiceAuditLog"("invoiceId");
CREATE INDEX IF NOT EXISTS "InvoiceFile_invoiceId_idx" ON "InvoiceFile"("invoiceId");

-- 5. Foreign Keys (Safe idempotent creation)
DO $$ BEGIN
    ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "BusinessUser" ADD CONSTRAINT "BusinessUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "BusinessUser" ADD CONSTRAINT "BusinessUser_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "BusinessSettings" ADD CONSTRAINT "BusinessSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "BusinessBankAccount" ADD CONSTRAINT "BusinessBankAccount_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Customer" ADD CONSTRAINT "Customer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Product" ADD CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "InvoiceSequence" ADD CONSTRAINT "InvoiceSequence_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "InvoiceAuditLog" ADD CONSTRAINT "InvoiceAuditLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "InvoiceFile" ADD CONSTRAINT "InvoiceFile_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 6. Initial Seed Data (Demo Account & Reference Business)
-- User: owner@infinityenterprises.com / password123
INSERT INTO "User" ("id", "email", "passwordHash", "name", "phone", "isEmailVerified", "updatedAt")
VALUES (
    'u1000000-0000-0000-0000-000000000001',
    'owner@infinityenterprises.com',
    '$2a$12$G3PhqqZoZH.AFUGHkjg/guzumP.cg73LeF9/nD5nm0Y0WUDFr5UXC',
    'Rithik Kumar',
    '9660252624',
    true,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO UPDATE SET "updatedAt" = CURRENT_TIMESTAMP;

-- Business: INFINITY ENTERPRISES
INSERT INTO "Business" (
    "id", "name", "businessType", "address", "city", "state", "stateCode", "pincode",
    "phone", "email", "gstin", "pan", "isGstRegistered", "authorizedSignatory",
    "jurisdiction", "declaration", "onboardingCompleted", "updatedAt"
)
VALUES (
    'b1000000-0000-0000-0000-000000000001',
    'INFINITY ENTERPRISES',
    'Wholesale',
    '8-3-191/27/5, SR NAGAR, VENGAL RAO NAGAR',
    'HYDERABAD',
    'Telangana',
    '36',
    '500038',
    '9660252624',
    'owner@infinityenterprises.com',
    '36AKBPH4841D1ZK',
    'AKBPH4841D',
    true,
    'Rithik Kumar',
    'HYDERABAD',
    'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
    true,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET "updatedAt" = CURRENT_TIMESTAMP;

-- Link User to Business (queries actual User and Business IDs safely)
INSERT INTO "BusinessUser" ("id", "userId", "businessId", "role")
SELECT
    'bu100000-0000-0000-0000-000000000001',
    u."id",
    b."id",
    'OWNER'
FROM (SELECT "id" FROM "User" WHERE "email" = 'owner@infinityenterprises.com' LIMIT 1) u,
     (SELECT "id" FROM "Business" WHERE "name" = 'INFINITY ENTERPRISES' LIMIT 1) b
ON CONFLICT ("userId", "businessId") DO NOTHING;

-- Business Settings
INSERT INTO "BusinessSettings" (
    "id", "businessId", "defaultPaymentTerms", "defaultGstType", "invoicePrefix",
    "roundOffEnabled", "defaultDueDays", "showBankDetails", "showSignature", "footerNote", "updatedAt"
)
SELECT
    'bs100000-0000-0000-0000-000000000001',
    b."id",
    'Net 30',
    'INTRASTATE',
    'INV',
    true,
    30,
    true,
    true,
    'This is a Computer Generated Invoice',
    CURRENT_TIMESTAMP
FROM (SELECT "id" FROM "Business" WHERE "name" = 'INFINITY ENTERPRISES' LIMIT 1) b
ON CONFLICT ("businessId") DO NOTHING;

-- Bank Account (Kotak Mahindra Bank from reference invoice)
INSERT INTO "BusinessBankAccount" (
    "id", "businessId", "accountHolder", "bankName", "accountNumber", "ifscCode", "branch", "isDefault", "updatedAt"
)
SELECT
    'ba100000-0000-0000-0000-000000000001',
    b."id",
    'INFINITY ENTERPRISES',
    'KOTAK MAHINDRA BANK LIMITED',
    '9985468056',
    'KKBK0007469',
    'SANATHNAGAR',
    true,
    CURRENT_TIMESTAMP
FROM (SELECT "id" FROM "Business" WHERE "name" = 'INFINITY ENTERPRISES' LIMIT 1) b
ON CONFLICT ("id") DO NOTHING;

-- Customers (LALITHA ENTERPRICESES from reference invoice)
INSERT INTO "Customer" (
    "id", "businessId", "name", "customerType", "gstin", "billingAddress",
    "billingCity", "billingState", "billingStateCode", "contactPerson", "phone", "updatedAt"
)
SELECT
    'c1000000-0000-0000-0000-000000000001',
    b."id",
    'LALITHA ENTERPRICESES',
    'BUSINESS',
    '36CBYPB9870Q1ZE',
    '5-95 SURENDER COLONY GHATKESAR MANDAL, NARAPALLY JANGAIAH',
    'HYDERABAD',
    'Telangana',
    '36',
    'CHANDERSEKHAR',
    '8341249579',
    CURRENT_TIMESTAMP
FROM (SELECT "id" FROM "Business" WHERE "name" = 'INFINITY ENTERPRISES' LIMIT 1) b
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Customer" (
    "id", "businessId", "name", "customerType", "gstin", "billingAddress",
    "billingCity", "billingState", "billingStateCode", "contactPerson", "phone", "updatedAt"
)
SELECT
    'c1000000-0000-0000-0000-000000000002',
    b."id",
    'KRISHNA TRADERS',
    'BUSINESS',
    NULL,
    '12-4 MG ROAD, BEGUMPET',
    'HYDERABAD',
    'Telangana',
    '36',
    'RAMESH',
    '9876543210',
    CURRENT_TIMESTAMP
FROM (SELECT "id" FROM "Business" WHERE "name" = 'INFINITY ENTERPRISES' LIMIT 1) b
ON CONFLICT ("id") DO NOTHING;

-- Products (Products from reference invoice)
INSERT INTO "Product" (
    "id", "businessId", "name", "sku", "hsnSacCode", "unit",
    "sellingPrice", "gstRate", "taxClassification", "updatedAt"
)
SELECT
    'p1000000-0000-0000-0000-000000000001',
    b."id",
    'MOODS DOTTED 3''s',
    'MOODS-DOT-3',
    '40141010',
    'WAL',
    22.7300,
    0.00,
    'TAXABLE',
    CURRENT_TIMESTAMP
FROM (SELECT "id" FROM "Business" WHERE "name" = 'INFINITY ENTERPRISES' LIMIT 1) b
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Product" (
    "id", "businessId", "name", "sku", "hsnSacCode", "unit",
    "sellingPrice", "gstRate", "taxClassification", "updatedAt"
)
SELECT
    'p1000000-0000-0000-0000-000000000002',
    b."id",
    'MOODS ULTRATHIN 3''s',
    'MOODS-UT-3',
    '40141010',
    'WAL',
    22.7300,
    0.00,
    'TAXABLE',
    CURRENT_TIMESTAMP
FROM (SELECT "id" FROM "Business" WHERE "name" = 'INFINITY ENTERPRISES' LIMIT 1) b
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Product" (
    "id", "businessId", "name", "sku", "hsnSacCode", "unit",
    "sellingPrice", "gstRate", "taxClassification", "updatedAt"
)
SELECT
    'p1000000-0000-0000-0000-000000000003',
    b."id",
    'MOODS ALLNIGHT 12''s',
    'MOODS-AN-12',
    '40141010',
    'WAL',
    106.0600,
    0.00,
    'TAXABLE',
    CURRENT_TIMESTAMP
FROM (SELECT "id" FROM "Business" WHERE "name" = 'INFINITY ENTERPRISES' LIMIT 1) b
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Product" (
    "id", "businessId", "name", "sku", "hsnSacCode", "unit",
    "sellingPrice", "gstRate", "taxClassification", "updatedAt"
)
SELECT
    'p1000000-0000-0000-0000-000000000004',
    b."id",
    'General Product A',
    'GEN-A',
    '8471',
    'PCS',
    500.0000,
    18.00,
    'TAXABLE',
    CURRENT_TIMESTAMP
FROM (SELECT "id" FROM "Business" WHERE "name" = 'INFINITY ENTERPRISES' LIMIT 1) b
ON CONFLICT ("id") DO NOTHING;

-- Invoice Sequence
INSERT INTO "InvoiceSequence" ("id", "businessId", "prefix", "financialYear", "currentNumber", "updatedAt")
SELECT
    'seq10000-0000-0000-0000-000000000001',
    b."id",
    'INV',
    '2627',
    0,
    CURRENT_TIMESTAMP
FROM (SELECT "id" FROM "Business" WHERE "name" = 'INFINITY ENTERPRISES' LIMIT 1) b
ON CONFLICT ("businessId", "prefix", "financialYear") DO NOTHING;

-- ==============================================================================
-- DONE! Supabase database schema and demo seed are ready for InvoiceHub!
-- ==============================================================================
