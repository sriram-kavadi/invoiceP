import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import prisma from '../../config/database.js';
import { success, error } from '../../utils/response.js';
import { calculateInvoiceTotals, calculateInvoiceItem } from '../../utils/calculations.js';
import { generateInvoiceNumber } from '../../utils/invoiceNumber.js';
import pdfService from '../../services/pdfService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../../uploads/invoices');

export const listInvoices = async (req, res, next) => {
  try {
    const {
      search,
      status,
      paymentStatus,
      customerId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * take;

    const where = {
      businessId: req.businessId,
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(customerId ? { customerId } : {}),
      ...(startDate || endDate
        ? {
            invoiceDate: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { invoiceNumber: { contains: search, mode: 'insensitive' } },
              { customer: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { invoiceDate: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, phone: true, gstin: true },
          },
          _count: {
            select: { items: true, payments: true },
          },
        },
      }),
    ]);

    return success(res, {
      invoices,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId: req.businessId },
      include: {
        customer: true,
        items: {
          orderBy: { slNo: 'asc' },
          include: { product: true },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      return error(res, 'Invoice not found', 404);
    }

    return success(res, invoice);
  } catch (err) {
    next(err);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const {
      invoiceNumber: customInvoiceNumber,
      invoiceType = 'GST',
      gstType = 'INTRASTATE',
      customerId,
      invoiceDate,
      dueDate,
      deliveryNoteDate,
      deliveryNote,
      paymentTerms,
      referenceNumber,
      referenceDate,
      otherReferences,
      buyerOrderNumber,
      buyerOrderDate,
      dispatchDocNumber,
      dispatchedThrough,
      destination,
      termsOfDelivery,
      items = [],
      notes,
    } = req.body;

    const businessSettings = await prisma.businessSettings.findUnique({
      where: { businessId: req.businessId },
    });

    const prefix = businessSettings?.invoicePrefix || 'INV';
    const roundOffEnabled = businessSettings?.roundOffEnabled ?? true;

    // Determine final invoice number
    let invoiceNumber = customInvoiceNumber;
    if (!invoiceNumber) {
      invoiceNumber = await generateInvoiceNumber(req.businessId, prefix, prisma);
    }

    // Process line items with calculations
    const effectiveGstType = invoiceType === 'NON_GST' ? 'NON_GST' : gstType;
    const calculatedItems = items.map((item, index) => {
      const calc = calculateInvoiceItem(item, effectiveGstType);
      return {
        slNo: index + 1,
        productId: item.productId || null,
        description: item.description,
        hsnSacCode: item.hsnSacCode || null,
        gstRate: item.gstRate || 0,
        taxClassification: item.taxClassification || 'TAXABLE',
        shippedQty: item.shippedQty,
        billedQty: item.billedQty,
        unit: item.unit || 'PCS',
        rate: item.rate,
        discountPercent: item.discountPercent || 0,
        discountAmount: calc.discountAmount,
        taxableAmount: calc.taxableAmount,
        cgstRate: calc.cgstRate,
        cgstAmount: calc.cgstAmount,
        sgstRate: calc.sgstRate,
        sgstAmount: calc.sgstAmount,
        igstRate: calc.igstRate,
        igstAmount: calc.igstAmount,
        amount: calc.amount,
      };
    });

    const totals = calculateInvoiceTotals(calculatedItems, effectiveGstType, roundOffEnabled);

    // Save in transaction
    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          businessId: req.businessId,
          customerId: customerId || null,
          invoiceNumber,
          invoiceType,
          gstType,
          status: 'DRAFT',
          paymentStatus: 'UNPAID',
          invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          deliveryNoteDate: deliveryNoteDate ? new Date(deliveryNoteDate) : null,
          deliveryNote,
          paymentTerms,
          referenceNumber,
          referenceDate: referenceDate ? new Date(referenceDate) : null,
          otherReferences,
          buyerOrderNumber,
          buyerOrderDate: buyerOrderDate ? new Date(buyerOrderDate) : null,
          dispatchDocNumber,
          dispatchedThrough,
          destination,
          termsOfDelivery,
          subtotal: totals.subtotal,
          totalDiscount: totals.totalDiscount,
          taxableAmount: totals.taxableAmount,
          cgstAmount: totals.cgstAmount,
          sgstAmount: totals.sgstAmount,
          igstAmount: totals.igstAmount,
          totalTax: totals.totalTax,
          roundOff: totals.roundOff,
          grandTotal: totals.grandTotal,
          totalPaid: 0,
          outstandingAmount: totals.grandTotal,
          totalShippedQty: totals.totalShippedQty,
          totalBilledQty: totals.totalBilledQty,
          notes,
          items: {
            create: calculatedItems,
          },
        },
        include: {
          items: true,
          customer: true,
        },
      });

      await tx.invoiceAuditLog.create({
        data: {
          invoiceId: created.id,
          action: 'CREATED',
          details: { invoiceNumber, grandTotal: totals.grandTotal },
          performedBy: req.user?.name || req.user?.email,
        },
      });

      return created;
    });

    return success(res, invoice, 'Invoice created successfully as draft', 201);
  } catch (err) {
    next(err);
  }
};

export const updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.invoice.findFirst({
      where: { id, businessId: req.businessId },
    });

    if (!existing) {
      return error(res, 'Invoice not found', 404);
    }

    if (existing.status !== 'DRAFT') {
      return error(res, 'Cannot edit an issued or cancelled invoice. Only drafts can be modified.', 400);
    }

    const {
      invoiceNumber,
      invoiceType = existing.invoiceType,
      gstType = existing.gstType,
      customerId,
      invoiceDate,
      dueDate,
      deliveryNoteDate,
      deliveryNote,
      paymentTerms,
      referenceNumber,
      referenceDate,
      otherReferences,
      buyerOrderNumber,
      buyerOrderDate,
      dispatchDocNumber,
      dispatchedThrough,
      destination,
      termsOfDelivery,
      items,
      notes,
    } = req.body;

    const businessSettings = await prisma.businessSettings.findUnique({
      where: { businessId: req.businessId },
    });
    const roundOffEnabled = businessSettings?.roundOffEnabled ?? true;

    const effectiveGstType = invoiceType === 'NON_GST' ? 'NON_GST' : gstType;

    let updateData = {
      ...(invoiceNumber ? { invoiceNumber } : {}),
      invoiceType,
      gstType,
      customerId: customerId !== undefined ? (customerId || null) : existing.customerId,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : existing.invoiceDate,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate,
      deliveryNoteDate: deliveryNoteDate !== undefined ? (deliveryNoteDate ? new Date(deliveryNoteDate) : null) : existing.deliveryNoteDate,
      deliveryNote: deliveryNote !== undefined ? deliveryNote : existing.deliveryNote,
      paymentTerms: paymentTerms !== undefined ? paymentTerms : existing.paymentTerms,
      referenceNumber: referenceNumber !== undefined ? referenceNumber : existing.referenceNumber,
      referenceDate: referenceDate !== undefined ? (referenceDate ? new Date(referenceDate) : null) : existing.referenceDate,
      otherReferences: otherReferences !== undefined ? otherReferences : existing.otherReferences,
      buyerOrderNumber: buyerOrderNumber !== undefined ? buyerOrderNumber : existing.buyerOrderNumber,
      buyerOrderDate: buyerOrderDate !== undefined ? (buyerOrderDate ? new Date(buyerOrderDate) : null) : existing.buyerOrderDate,
      dispatchDocNumber: dispatchDocNumber !== undefined ? dispatchDocNumber : existing.dispatchDocNumber,
      dispatchedThrough: dispatchedThrough !== undefined ? dispatchedThrough : existing.dispatchedThrough,
      destination: destination !== undefined ? destination : existing.destination,
      termsOfDelivery: termsOfDelivery !== undefined ? termsOfDelivery : existing.termsOfDelivery,
      notes: notes !== undefined ? notes : existing.notes,
    };

    const updated = await prisma.$transaction(async (tx) => {
      if (items && Array.isArray(items)) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

        const calculatedItems = items.map((item, index) => {
          const calc = calculateInvoiceItem(item, effectiveGstType);
          return {
            invoiceId: id,
            slNo: index + 1,
            productId: item.productId || null,
            description: item.description,
            hsnSacCode: item.hsnSacCode || null,
            gstRate: item.gstRate || 0,
            taxClassification: item.taxClassification || 'TAXABLE',
            shippedQty: item.shippedQty,
            billedQty: item.billedQty,
            unit: item.unit || 'PCS',
            rate: item.rate,
            discountPercent: item.discountPercent || 0,
            discountAmount: calc.discountAmount,
            taxableAmount: calc.taxableAmount,
            cgstRate: calc.cgstRate,
            cgstAmount: calc.cgstAmount,
            sgstRate: calc.sgstRate,
            sgstAmount: calc.sgstAmount,
            igstRate: calc.igstRate,
            igstAmount: calc.igstAmount,
            amount: calc.amount,
          };
        });

        await tx.invoiceItem.createMany({ data: calculatedItems });

        const totals = calculateInvoiceTotals(calculatedItems, effectiveGstType, roundOffEnabled);

        updateData = {
          ...updateData,
          subtotal: totals.subtotal,
          totalDiscount: totals.totalDiscount,
          taxableAmount: totals.taxableAmount,
          cgstAmount: totals.cgstAmount,
          sgstAmount: totals.sgstAmount,
          igstAmount: totals.igstAmount,
          totalTax: totals.totalTax,
          roundOff: totals.roundOff,
          grandTotal: totals.grandTotal,
          outstandingAmount: totals.grandTotal - Number(existing.totalPaid),
          totalShippedQty: totals.totalShippedQty,
          totalBilledQty: totals.totalBilledQty,
        };
      }

      const res = await tx.invoice.update({
        where: { id },
        data: updateData,
        include: { items: true, customer: true },
      });

      await tx.invoiceAuditLog.create({
        data: {
          invoiceId: id,
          action: 'EDITED',
          details: { grandTotal: res.grandTotal },
          performedBy: req.user?.name || req.user?.email,
        },
      });

      return res;
    });

    return success(res, updated, 'Invoice updated successfully');
  } catch (err) {
    next(err);
  }
};

export const issueInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId: req.businessId },
      include: {
        customer: true,
        items: true,
        business: {
          include: {
            bankAccounts: { where: { isDefault: true }, take: 1 },
          },
        },
      },
    });

    if (!invoice) {
      return error(res, 'Invoice not found', 404);
    }

    if (invoice.status === 'ISSUED') {
      return error(res, 'Invoice is already issued', 400);
    }

    if (invoice.status === 'CANCELLED') {
      return error(res, 'Cannot issue a cancelled invoice', 400);
    }

    if (invoice.items.length === 0) {
      return error(res, 'Cannot issue an invoice with no product items', 400);
    }

    const sellerSnapshot = {
      name: invoice.business.name,
      address: invoice.business.address,
      city: invoice.business.city,
      state: invoice.business.state,
      stateCode: invoice.business.stateCode,
      phone: invoice.business.phone,
      email: invoice.business.email,
      gstin: invoice.business.gstin,
      pan: invoice.business.pan,
      authorizedSignatory: invoice.business.authorizedSignatory,
      declaration: invoice.business.declaration,
      jurisdiction: invoice.business.jurisdiction,
    };

    const customerSnapshot = invoice.customer
      ? {
          name: invoice.customer.name,
          billingAddress: invoice.customer.billingAddress,
          billingCity: invoice.customer.billingCity,
          billingState: invoice.customer.billingState,
          billingStateCode: invoice.customer.billingStateCode,
          shippingAddress: invoice.customer.shippingAddress,
          shippingCity: invoice.customer.shippingCity,
          shippingState: invoice.customer.shippingState,
          shippingStateCode: invoice.customer.shippingStateCode,
          gstin: invoice.customer.gstin,
          contactPerson: invoice.customer.contactPerson,
          phone: invoice.customer.phone,
          email: invoice.customer.email,
        }
      : null;

    const shareToken = crypto.randomBytes(32).toString('hex');
    const defaultBank = invoice.business.bankAccounts[0] || null;

    const invoiceData = {
      invoice,
      business: invoice.business,
      customer: invoice.customer,
      bankAccount: defaultBank,
    };

    const pdfFileName = `${invoice.invoiceNumber.replace(/[\/\\:]/g, '_')}_${Date.now()}.pdf`;
    const pdfFilePath = path.join(UPLOADS_DIR, pdfFileName);

    let pdfRelativePath = null;
    try {
      await pdfService.generateInvoicePdf(invoiceData, pdfFilePath);
      pdfRelativePath = `uploads/invoices/${pdfFileName}`;
    } catch (pdfErr) {
      console.error('[PDF Generation Error]', pdfErr.message);
    }

    const issued = await prisma.$transaction(async (tx) => {
      const res = await tx.invoice.update({
        where: { id },
        data: {
          status: 'ISSUED',
          issuedAt: new Date(),
          sellerSnapshot,
          customerSnapshot,
          shareToken,
          pdfPath: pdfRelativePath,
        },
        include: { items: true, customer: true },
      });

      await tx.invoiceAuditLog.create({
        data: {
          invoiceId: id,
          action: 'ISSUED',
          details: { invoiceNumber: invoice.invoiceNumber, grandTotal: invoice.grandTotal },
          performedBy: req.user?.name || req.user?.email,
        },
      });

      if (pdfRelativePath) {
        await tx.invoiceFile.create({
          data: {
            invoiceId: id,
            fileType: 'PDF',
            filePath: pdfRelativePath,
          },
        });
      }

      return res;
    });

    return success(res, issued, 'Invoice issued successfully');
  } catch (err) {
    next(err);
  }
};

export const cancelInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId: req.businessId },
    });

    if (!invoice) {
      return error(res, 'Invoice not found', 404);
    }

    if (invoice.status === 'CANCELLED') {
      return error(res, 'Invoice is already cancelled', 400);
    }

    if (invoice.paymentStatus === 'PAID') {
      return error(res, 'Cannot cancel a fully paid invoice. Revert payments first.', 400);
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      const res = await tx.invoice.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });

      await tx.invoiceAuditLog.create({
        data: {
          invoiceId: id,
          action: 'CANCELLED',
          details: { reason },
          performedBy: req.user?.name || req.user?.email,
        },
      });

      return res;
    });

    return success(res, cancelled, 'Invoice cancelled successfully');
  } catch (err) {
    next(err);
  }
};

export const downloadPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId: req.businessId },
      include: {
        customer: true,
        items: { orderBy: { slNo: 'asc' } },
        business: {
          include: {
            bankAccounts: { where: { isDefault: true }, take: 1 },
          },
        },
      },
    });

    if (!invoice) {
      return error(res, 'Invoice not found', 404);
    }

    const defaultBank = invoice.business.bankAccounts[0] || null;
    const invoiceData = {
      invoice,
      business: invoice.sellerSnapshot || invoice.business,
      customer: invoice.customerSnapshot || invoice.customer,
      bankAccount: defaultBank,
    };

    let pdfBuffer;
    try {
      pdfBuffer = await pdfService.generateInvoicePdf(invoiceData);
    } catch (pdfErr) {
      console.warn('[PDF Generation Warning] Serverless browser unavailable, sending printable HTML:', pdfErr.message);
      const html = await pdfService.generateInvoiceHtml(invoiceData);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Fallback-Print', 'true');
      return res.send(html);
    }

    const filename = `${invoice.invoiceNumber.replace(/[\/\\:]/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

export const getPreviewHtml = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId: req.businessId },
      include: {
        customer: true,
        items: { orderBy: { slNo: 'asc' } },
        business: {
          include: {
            bankAccounts: { where: { isDefault: true }, take: 1 },
          },
        },
      },
    });

    if (!invoice) {
      return error(res, 'Invoice not found', 404);
    }

    const defaultBank = invoice.business.bankAccounts[0] || null;
    const invoiceData = {
      invoice,
      business: invoice.sellerSnapshot || invoice.business,
      customer: invoice.customerSnapshot || invoice.customer,
      bankAccount: defaultBank,
    };

    const html = await pdfService.generateInvoiceHtml(invoiceData);
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (err) {
    next(err);
  }
};

export const duplicateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const original = await prisma.invoice.findFirst({
      where: { id, businessId: req.businessId },
      include: { items: true },
    });

    if (!original) {
      return error(res, 'Original invoice not found', 404);
    }

    const businessSettings = await prisma.businessSettings.findUnique({
      where: { businessId: req.businessId },
    });
    const prefix = businessSettings?.invoicePrefix || 'INV';
    const newInvoiceNumber = await generateInvoiceNumber(req.businessId, prefix, prisma);

    const duplicated = await prisma.invoice.create({
      data: {
        businessId: req.businessId,
        customerId: original.customerId,
        invoiceNumber: newInvoiceNumber,
        invoiceType: original.invoiceType,
        gstType: original.gstType,
        status: 'DRAFT',
        paymentStatus: 'UNPAID',
        invoiceDate: new Date(),
        dueDate: null,
        deliveryNote: original.deliveryNote,
        paymentTerms: original.paymentTerms,
        otherReferences: original.otherReferences,
        termsOfDelivery: original.termsOfDelivery,
        subtotal: original.subtotal,
        totalDiscount: original.totalDiscount,
        taxableAmount: original.taxableAmount,
        cgstAmount: original.cgstAmount,
        sgstAmount: original.sgstAmount,
        igstAmount: original.igstAmount,
        totalTax: original.totalTax,
        roundOff: original.roundOff,
        grandTotal: original.grandTotal,
        totalPaid: 0,
        outstandingAmount: original.grandTotal,
        totalShippedQty: original.totalShippedQty,
        totalBilledQty: original.totalBilledQty,
        notes: original.notes,
        items: {
          create: original.items.map((item) => ({
            productId: item.productId,
            slNo: item.slNo,
            description: item.description,
            hsnSacCode: item.hsnSacCode,
            gstRate: item.gstRate,
            taxClassification: item.taxClassification,
            shippedQty: item.shippedQty,
            billedQty: item.billedQty,
            unit: item.unit,
            rate: item.rate,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            taxableAmount: item.taxableAmount,
            cgstRate: item.cgstRate,
            cgstAmount: item.cgstAmount,
            sgstRate: item.sgstRate,
            sgstAmount: item.sgstAmount,
            igstRate: item.igstRate,
            igstAmount: item.igstAmount,
            amount: item.amount,
          })),
        },
      },
      include: { items: true, customer: true },
    });

    return success(res, duplicated, 'Invoice duplicated successfully as new draft', 201);
  } catch (err) {
    next(err);
  }
};

export const getSharedInvoice = async (req, res, next) => {
  try {
    const { token } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { shareToken: token },
      include: {
        customer: true,
        items: { orderBy: { slNo: 'asc' } },
        business: {
          include: {
            bankAccounts: { where: { isDefault: true }, take: 1 },
          },
        },
      },
    });

    if (!invoice) {
      return error(res, 'Invoice not found or link has expired', 404);
    }

    const defaultBank = invoice.business.bankAccounts[0] || null;
    const invoiceData = {
      invoice,
      business: invoice.sellerSnapshot || invoice.business,
      customer: invoice.customerSnapshot || invoice.customer,
      bankAccount: defaultBank,
    };

    const html = await pdfService.generateInvoiceHtml(invoiceData);
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (err) {
    next(err);
  }
};

