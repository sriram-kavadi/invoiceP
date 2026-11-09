// Seed data for InvoiceHub development
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding InvoiceHub database...');

  // Clear existing data
  await prisma.$executeRaw`TRUNCATE TABLE "InvoiceAuditLog", "InvoiceFile", "Payment", "InvoiceItem", "Invoice", "InvoiceSequence", "Product", "Customer", "BusinessBankAccount", "BusinessSettings", "BusinessUser", "Business", "PasswordReset", "Session", "User" RESTART IDENTITY CASCADE`;

  // Create test user
  const passwordHash = await bcrypt.hash('password123', 12);
  
  const user = await prisma.user.create({
    data: {
      email: 'owner@infinityenterprises.com',
      passwordHash,
      name: 'Rithik Kumar',
      phone: '9660252624',
    }
  });
  console.log('✅ Created user:', user.email);

  // Create business
  const business = await prisma.business.create({
    data: {
      name: 'INFINITY ENTERPRISES',
      businessType: 'Wholesale',
      address: '8-3-191/27/5, SR NAGAR, VENGAL RAO NAGAR',
      city: 'HYDERABAD',
      state: 'Telangana',
      stateCode: '36',
      pincode: '500038',
      phone: '9660252624',
      email: 'owner@infinityenterprises.com',
      gstin: '36AKBPH4841D1ZK',
      pan: 'AKBPH4841D',
      isGstRegistered: true,
      authorizedSignatory: 'Rithik Kumar',
      jurisdiction: 'HYDERABAD',
      declaration: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
      onboardingCompleted: true,
    }
  });
  console.log('✅ Created business:', business.name);

  // Link user to business
  await prisma.businessUser.create({
    data: {
      userId: user.id,
      businessId: business.id,
      role: 'OWNER',
    }
  });

  // Business settings
  await prisma.businessSettings.create({
    data: {
      businessId: business.id,
      defaultPaymentTerms: 'Net 30',
      defaultGstType: 'INTRASTATE',
      invoicePrefix: 'INV',
      roundOffEnabled: true,
      defaultDueDays: 30,
      showBankDetails: true,
      showSignature: true,
      footerNote: 'This is a Computer Generated Invoice',
    }
  });

  // Bank account
  await prisma.businessBankAccount.create({
    data: {
      businessId: business.id,
      accountHolder: 'INFINITY ENTERPRISES',
      bankName: 'KOTAK MAHINDRA BANK LIMITED',
      accountNumber: '9985468056',
      ifscCode: 'KKBK0007469',
      branch: 'SANATHNAGAR',
      isDefault: true,
    }
  });
  console.log('✅ Created bank account');

  // Sample customers
  const customer1 = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: 'LALITHA ENTERPRICESES',
      customerType: 'BUSINESS',
      gstin: '36CBYPB9870Q1ZE',
      billingAddress: '5-95 SURENDER COLONY GHATKESAR MANDAL, NARAPALLY JANGAIAH',
      billingCity: 'HYDERABAD',
      billingState: 'Telangana',
      billingStateCode: '36',
      contactPerson: 'CHANDERSEKHAR',
      phone: '8341249579',
    }
  });

  const customer2 = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: 'KRISHNA TRADERS',
      customerType: 'BUSINESS',
      billingAddress: '12-4 MG ROAD, BEGUMPET',
      billingCity: 'HYDERABAD',
      billingState: 'Telangana',
      billingStateCode: '36',
      contactPerson: 'RAMESH',
      phone: '9876543210',
    }
  });

  const customer3 = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: 'VIJAYA MEDICAL STORES',
      customerType: 'BUSINESS',
      billingAddress: '45 HIMAYATNAGAR',
      billingCity: 'HYDERABAD',
      billingState: 'Telangana',
      billingStateCode: '36',
      phone: '9988776655',
    }
  });
  console.log('✅ Created 3 customers');

  // Sample products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        businessId: business.id,
        name: "MOODS DOTTED 3's",
        sku: 'MOODS-DOT-3',
        hsnSacCode: '40141010',
        unit: 'WAL',
        sellingPrice: 22.73,
        gstRate: 0,
        taxClassification: 'TAXABLE',
      }
    }),
    prisma.product.create({
      data: {
        businessId: business.id,
        name: "MOODS ULTRATHIN 3's",
        sku: 'MOODS-UT-3',
        hsnSacCode: '40141010',
        unit: 'WAL',
        sellingPrice: 22.73,
        gstRate: 0,
        taxClassification: 'TAXABLE',
      }
    }),
    prisma.product.create({
      data: {
        businessId: business.id,
        name: "MOODS ALLNIGHT 12's",
        sku: 'MOODS-AN-12',
        hsnSacCode: '40141010',
        unit: 'WAL',
        sellingPrice: 106.06,
        gstRate: 0,
        taxClassification: 'TAXABLE',
      }
    }),
    prisma.product.create({
      data: {
        businessId: business.id,
        name: 'General Product A',
        sku: 'GEN-A',
        hsnSacCode: '8471',
        unit: 'PCS',
        sellingPrice: 500.00,
        gstRate: 18,
        taxClassification: 'TAXABLE',
      }
    }),
    prisma.product.create({
      data: {
        businessId: business.id,
        name: 'Service - Consultation',
        sku: 'SVC-CONSULT',
        hsnSacCode: '998311',
        unit: 'NOS',
        sellingPrice: 2000.00,
        gstRate: 18,
        taxClassification: 'TAXABLE',
        isService: true,
      }
    }),
  ]);
  console.log('✅ Created', products.length, 'products');

  // Create a sample invoice sequence
  await prisma.invoiceSequence.create({
    data: {
      businessId: business.id,
      prefix: 'INV',
      financialYear: '2526',
      currentNumber: 1,
    }
  });

  console.log('\n🎉 Seed complete!');
  console.log('─────────────────────────────');
  console.log('Login credentials:');
  console.log('  Email:    owner@infinityenterprises.com');
  console.log('  Password: password123');
  console.log('─────────────────────────────');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

