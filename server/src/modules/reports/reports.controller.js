import ExcelJS from 'exceljs';
import prisma from '../../config/database.js';
import { success, error } from '../../utils/response.js';

export const getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, customerId, status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * take;

    const where = {
      businessId: req.businessId,
      ...(status ? { status } : { status: { not: 'CANCELLED' } }),
      ...(customerId ? { customerId } : {}),
      ...(startDate || endDate
        ? {
            invoiceDate: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const [total, invoices, aggregates] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { invoiceDate: 'desc' },
        include: {
          customer: {
            select: { name: true, gstin: true },
          },
        },
      }),
      prisma.invoice.aggregate({
        where,
        _sum: {
          taxableAmount: true,
          cgstAmount: true,
          sgstAmount: true,
          igstAmount: true,
          totalTax: true,
          grandTotal: true,
          totalPaid: true,
          outstandingAmount: true,
        },
      }),
    ]);

    return success(res, {
      invoices,
      totals: {
        taxableAmount: aggregates._sum.taxableAmount || 0,
        cgstAmount: aggregates._sum.cgstAmount || 0,
        sgstAmount: aggregates._sum.sgstAmount || 0,
        igstAmount: aggregates._sum.igstAmount || 0,
        totalTax: aggregates._sum.totalTax || 0,
        grandTotal: aggregates._sum.grandTotal || 0,
        totalPaid: aggregates._sum.totalPaid || 0,
        outstandingAmount: aggregates._sum.outstandingAmount || 0,
      },
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

export const exportSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, customerId, status } = req.query;

    const where = {
      businessId: req.businessId,
      ...(status ? { status } : { status: { not: 'CANCELLED' } }),
      ...(customerId ? { customerId } : {}),
      ...(startDate || endDate
        ? {
            invoiceDate: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
      include: {
        customer: { select: { name: true, gstin: true } },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
      { header: 'Invoice No', key: 'invoiceNumber', width: 20 },
      { header: 'Date', key: 'invoiceDate', width: 14 },
      { header: 'Customer Name', key: 'customerName', width: 28 },
      { header: 'GSTIN', key: 'gstin', width: 18 },
      { header: 'Type', key: 'invoiceType', width: 12 },
      { header: 'Taxable Value (₹)', key: 'taxableAmount', width: 18 },
      { header: 'CGST (₹)', key: 'cgstAmount', width: 14 },
      { header: 'SGST (₹)', key: 'sgstAmount', width: 14 },
      { header: 'IGST (₹)', key: 'igstAmount', width: 14 },
      { header: 'Total Tax (₹)', key: 'totalTax', width: 16 },
      { header: 'Grand Total (₹)', key: 'grandTotal', width: 18 },
      { header: 'Paid (₹)', key: 'totalPaid', width: 16 },
      { header: 'Outstanding (₹)', key: 'outstandingAmount', width: 18 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Payment Status', key: 'paymentStatus', width: 16 },
    ];

    // Header styling
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' },
    };

    let sumTaxable = 0;
    let sumTotalTax = 0;
    let sumGrandTotal = 0;
    let sumPaid = 0;
    let sumOutstanding = 0;

    for (const inv of invoices) {
      const taxable = Number(inv.taxableAmount);
      const totalTax = Number(inv.totalTax);
      const grandTotal = Number(inv.grandTotal);
      const paid = Number(inv.totalPaid);
      const outstanding = Number(inv.outstandingAmount);

      sumTaxable += taxable;
      sumTotalTax += totalTax;
      sumGrandTotal += grandTotal;
      sumPaid += paid;
      sumOutstanding += outstanding;

      worksheet.addRow({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: new Date(inv.invoiceDate).toLocaleDateString('en-IN'),
        customerName: inv.customer?.name || 'Walk-in Customer',
        gstin: inv.customer?.gstin || '-',
        invoiceType: inv.invoiceType,
        taxableAmount: taxable,
        cgstAmount: Number(inv.cgstAmount),
        sgstAmount: Number(inv.sgstAmount),
        igstAmount: Number(inv.igstAmount),
        totalTax: totalTax,
        grandTotal: grandTotal,
        totalPaid: paid,
        outstandingAmount: outstanding,
        status: inv.status,
        paymentStatus: inv.paymentStatus,
      });
    }

    // Totals row
    const totalRow = worksheet.addRow({
      invoiceNumber: 'TOTAL',
      taxableAmount: sumTaxable,
      totalTax: sumTotalTax,
      grandTotal: sumGrandTotal,
      totalPaid: sumPaid,
      outstandingAmount: sumOutstanding,
    });
    totalRow.font = { bold: true };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="sales_report_${Date.now()}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

export const getPaymentsReport = async (req, res, next) => {
  try {
    const { startDate, endDate, method, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * take;

    const where = {
      invoice: { businessId: req.businessId },
      ...(method ? { paymentMethod: method } : {}),
      ...(startDate || endDate
        ? {
            paymentDate: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const [total, payments, aggregate] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { paymentDate: 'desc' },
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              grandTotal: true,
              customer: { select: { name: true } },
            },
          },
        },
      }),
      prisma.payment.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);

    return success(res, {
      payments,
      totalAmount: aggregate._sum.amount || 0,
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

export const exportPaymentsReport = async (req, res, next) => {
  try {
    const { startDate, endDate, method } = req.query;

    const where = {
      invoice: { businessId: req.businessId },
      ...(method ? { paymentMethod: method } : {}),
      ...(startDate || endDate
        ? {
            paymentDate: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            grandTotal: true,
            customer: { select: { name: true } },
          },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payments Report');

    worksheet.columns = [
      { header: 'Payment Date', key: 'paymentDate', width: 14 },
      { header: 'Invoice No', key: 'invoiceNumber', width: 20 },
      { header: 'Customer', key: 'customerName', width: 28 },
      { header: 'Invoice Total (₹)', key: 'invoiceTotal', width: 18 },
      { header: 'Amount Paid (₹)', key: 'amount', width: 18 },
      { header: 'Method', key: 'paymentMethod', width: 16 },
      { header: 'Transaction Ref', key: 'transactionRef', width: 22 },
      { header: 'Notes', key: 'notes', width: 25 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF047857' },
    };

    let totalAmount = 0;
    for (const p of payments) {
      const amt = Number(p.amount);
      totalAmount += amt;
      worksheet.addRow({
        paymentDate: new Date(p.paymentDate).toLocaleDateString('en-IN'),
        invoiceNumber: p.invoice.invoiceNumber,
        customerName: p.invoice.customer?.name || 'Walk-in Customer',
        invoiceTotal: Number(p.invoice.grandTotal),
        amount: amt,
        paymentMethod: p.paymentMethod,
        transactionRef: p.transactionRef || '-',
        notes: p.notes || '-',
      });
    }

    const totalRow = worksheet.addRow({
      paymentDate: 'TOTAL',
      amount: totalAmount,
    });
    totalRow.font = { bold: true };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payments_report_${Date.now()}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

