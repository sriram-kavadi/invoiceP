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

// ─── BUSINESS ANALYTICS ────────────────────────────────────────────────────────

function getPeriodRanges(period, startDate, endDate) {
  const now = new Date();
  let currentStart, currentEnd, prevStart, prevEnd;

  if (period === 'CUSTOM' && startDate && endDate) {
    currentStart = new Date(startDate);
    currentStart.setHours(0, 0, 0, 0);
    currentEnd = new Date(endDate);
    currentEnd.setHours(23, 59, 59, 999);
    const durationMs = currentEnd.getTime() - currentStart.getTime();
    prevEnd = new Date(currentStart.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - durationMs);
  } else if (period === 'TODAY') {
    currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
  } else if (period === 'THIS_WEEK') {
    const day = now.getDay();
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
    currentStart = new Date(now.getFullYear(), now.getMonth(), diffToMonday, 0, 0, 0, 0);
    currentEnd = new Date(now.getFullYear(), now.getMonth(), diffToMonday + 6, 23, 59, 59, 999);
    prevStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    prevEnd = new Date(currentStart.getTime() - 1);
  } else if (period === 'THIS_YEAR') {
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    currentStart = new Date(startYear, 3, 1, 0, 0, 0, 0);
    currentEnd = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
    prevStart = new Date(startYear - 1, 3, 1, 0, 0, 0, 0);
    prevEnd = new Date(startYear, 2, 31, 23, 59, 59, 999);
  } else {
    // Default: THIS_MONTH
    currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  }

  return {
    current: { start: currentStart, end: currentEnd },
    previous: { start: prevStart, end: prevEnd },
  };
}

function calcChange(curr, prev) {
  if (!prev || prev === 0) return curr > 0 ? 100 : 0;
  return Number((((curr - prev) / prev) * 100).toFixed(1));
}

export const getAnalytics = async (req, res, next) => {
  try {
    const { period = 'THIS_MONTH', startDate, endDate } = req.query;
    const businessId = req.businessId;
    const { current, previous } = getPeriodRanges(period, startDate, endDate);

    // Determine group interval for sales trend
    const durationDays = (current.end.getTime() - current.start.getTime()) / (1000 * 60 * 60 * 24);
    let trendInterval = 'day';
    if (period === 'TODAY') trendInterval = 'hour';
    else if (period === 'THIS_YEAR' || durationDays > 45) trendInterval = 'month';

    // Parallel Postgres aggregations for performance
    const [
      currKpiRaw,
      prevKpiRaw,
      currCollectionsRaw,
      prevCollectionsRaw,
      paymentMethodsRaw,
      customerPerfRaw,
      productPerfRaw,
      trendRaw,
      agingRaw,
      statusBreakdownRaw,
    ] = await Promise.all([
      // 1. Current Period KPIs
      prisma.$queryRaw`
        SELECT 
          COUNT(id)::int AS "invoiceCount",
          COALESCE(SUM("taxableAmount"), 0)::float AS "totalTaxable",
          COALESCE(SUM("totalTax"), 0)::float AS "totalTax",
          COALESCE(SUM("grandTotal"), 0)::float AS "totalSales",
          COALESCE(SUM("totalPaid"), 0)::float AS "totalPaid",
          COALESCE(SUM("outstandingAmount"), 0)::float AS "totalOutstanding"
        FROM "Invoice"
        WHERE "businessId" = ${businessId}
          AND status != 'CANCELLED'
          AND "invoiceDate" >= ${current.start}
          AND "invoiceDate" <= ${current.end}
      `,

      // 2. Previous Period KPIs
      prisma.$queryRaw`
        SELECT 
          COUNT(id)::int AS "invoiceCount",
          COALESCE(SUM("taxableAmount"), 0)::float AS "totalTaxable",
          COALESCE(SUM("totalTax"), 0)::float AS "totalTax",
          COALESCE(SUM("grandTotal"), 0)::float AS "totalSales",
          COALESCE(SUM("totalPaid"), 0)::float AS "totalPaid",
          COALESCE(SUM("outstandingAmount"), 0)::float AS "totalOutstanding"
        FROM "Invoice"
        WHERE "businessId" = ${businessId}
          AND status != 'CANCELLED'
          AND "invoiceDate" >= ${previous.start}
          AND "invoiceDate" <= ${previous.end}
      `,

      // 3. Current Period Actual Collections (from Payment table)
      prisma.$queryRaw`
        SELECT 
          COUNT(p.id)::int AS "paymentCount",
          COALESCE(SUM(p.amount), 0)::float AS "totalCollections"
        FROM "Payment" p
        JOIN "Invoice" i ON i.id = p."invoiceId"
        WHERE i."businessId" = ${businessId}
          AND p."paymentDate" >= ${current.start}
          AND p."paymentDate" <= ${current.end}
      `,

      // 4. Previous Period Collections
      prisma.$queryRaw`
        SELECT 
          COUNT(p.id)::int AS "paymentCount",
          COALESCE(SUM(p.amount), 0)::float AS "totalCollections"
        FROM "Payment" p
        JOIN "Invoice" i ON i.id = p."invoiceId"
        WHERE i."businessId" = ${businessId}
          AND p."paymentDate" >= ${previous.start}
          AND p."paymentDate" <= ${previous.end}
      `,

      // 5. Payment Methods Breakdown
      prisma.$queryRaw`
        SELECT 
          p."paymentMethod",
          COUNT(p.id)::int AS "count",
          COALESCE(SUM(p.amount), 0)::float AS "amount"
        FROM "Payment" p
        JOIN "Invoice" i ON i.id = p."invoiceId"
        WHERE i."businessId" = ${businessId}
          AND p."paymentDate" >= ${current.start}
          AND p."paymentDate" <= ${current.end}
        GROUP BY p."paymentMethod"
        ORDER BY "amount" DESC
      `,

      // 6. Customer Performance
      prisma.$queryRaw`
        SELECT 
          c.id, c.name, c.phone, c.gstin, c."billingCity" AS city,
          COUNT(i.id)::int AS "invoicesCount",
          COALESCE(SUM(i."taxableAmount"), 0)::float AS "totalTaxable",
          COALESCE(SUM(i."grandTotal"), 0)::float AS "totalRevenue",
          COALESCE(SUM(i."totalPaid"), 0)::float AS "totalPaid",
          COALESCE(SUM(i."outstandingAmount"), 0)::float AS "outstandingAmount"
        FROM "Invoice" i
        JOIN "Customer" c ON c.id = i."customerId"
        WHERE i."businessId" = ${businessId}
          AND i.status != 'CANCELLED'
          AND i."invoiceDate" >= ${current.start}
          AND i."invoiceDate" <= ${current.end}
        GROUP BY c.id, c.name, c.phone, c.gstin, c."billingCity"
        ORDER BY "totalRevenue" DESC
        LIMIT 15
      `,

      // 7. Product-wise Sales and Quantity
      prisma.$queryRaw`
        SELECT 
          COALESCE(p.id, ii."productId") AS "productId",
          ii.description AS "productName",
          ii."hsnSacCode" AS "hsnCode",
          ii.unit,
          COALESCE(SUM(ii."billedQty"), 0)::float AS "quantitySold",
          COALESCE(SUM(ii."taxableAmount"), 0)::float AS "totalTaxable",
          COALESCE(SUM(ii.amount), 0)::float AS "totalRevenue",
          COUNT(DISTINCT i.id)::int AS "invoicesCount"
        FROM "InvoiceItem" ii
        JOIN "Invoice" i ON i.id = ii."invoiceId"
        LEFT JOIN "Product" p ON p.id = ii."productId"
        WHERE i."businessId" = ${businessId}
          AND i.status != 'CANCELLED'
          AND i."invoiceDate" >= ${current.start}
          AND i."invoiceDate" <= ${current.end}
        GROUP BY COALESCE(p.id, ii."productId"), ii.description, ii."hsnSacCode", ii.unit
        ORDER BY "totalRevenue" DESC
        LIMIT 15
      `,

      // 8. Sales Trend (group by day or month)
      trendInterval === 'hour'
        ? prisma.$queryRaw`
            SELECT 
              date_trunc('hour', "invoiceDate") AS bucket,
              COUNT(id)::int AS "invoiceCount",
              COALESCE(SUM("grandTotal"), 0)::float AS "totalSales"
            FROM "Invoice"
            WHERE "businessId" = ${businessId}
              AND status != 'CANCELLED'
              AND "invoiceDate" >= ${current.start}
              AND "invoiceDate" <= ${current.end}
            GROUP BY 1
            ORDER BY 1
          `
        : trendInterval === 'month'
        ? prisma.$queryRaw`
            SELECT 
              date_trunc('month', "invoiceDate") AS bucket,
              COUNT(id)::int AS "invoiceCount",
              COALESCE(SUM("grandTotal"), 0)::float AS "totalSales"
            FROM "Invoice"
            WHERE "businessId" = ${businessId}
              AND status != 'CANCELLED'
              AND "invoiceDate" >= ${current.start}
              AND "invoiceDate" <= ${current.end}
            GROUP BY 1
            ORDER BY 1
          `
        : prisma.$queryRaw`
            SELECT 
              date_trunc('day', "invoiceDate") AS bucket,
              COUNT(id)::int AS "invoiceCount",
              COALESCE(SUM("grandTotal"), 0)::float AS "totalSales"
            FROM "Invoice"
            WHERE "businessId" = ${businessId}
              AND status != 'CANCELLED'
              AND "invoiceDate" >= ${current.start}
              AND "invoiceDate" <= ${current.end}
            GROUP BY 1
            ORDER BY 1
          `,

      // 9. Receivables Aging Buckets (All Unpaid Active Invoices)
      prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN CURRENT_DATE - COALESCE("dueDate"::date, "invoiceDate"::date) <= 30 THEN '0_30'
            WHEN CURRENT_DATE - COALESCE("dueDate"::date, "invoiceDate"::date) <= 60 THEN '31_60'
            WHEN CURRENT_DATE - COALESCE("dueDate"::date, "invoiceDate"::date) <= 90 THEN '61_90'
            ELSE '90_PLUS'
          END AS bucket,
          COUNT(id)::int AS count,
          COALESCE(SUM("outstandingAmount"), 0)::float AS "totalOutstanding"
        FROM "Invoice"
        WHERE "businessId" = ${businessId}
          AND status != 'CANCELLED'
          AND "paymentStatus" != 'PAID'
          AND "outstandingAmount" > 0
        GROUP BY 1
      `,

      // 10. Status Breakdown
      prisma.$queryRaw`
        SELECT 
          status,
          "paymentStatus",
          COUNT(id)::int AS count,
          COALESCE(SUM("grandTotal"), 0)::float AS "totalAmount",
          COALESCE(SUM("outstandingAmount"), 0)::float AS "outstandingAmount"
        FROM "Invoice"
        WHERE "businessId" = ${businessId}
          AND "invoiceDate" >= ${current.start}
          AND "invoiceDate" <= ${current.end}
        GROUP BY status, "paymentStatus"
      `,
    ]);

    const currKpi = currKpiRaw[0] || {
      invoiceCount: 0,
      totalTaxable: 0,
      totalTax: 0,
      totalSales: 0,
      totalPaid: 0,
      totalOutstanding: 0,
    };
    const prevKpi = prevKpiRaw[0] || {
      invoiceCount: 0,
      totalTaxable: 0,
      totalTax: 0,
      totalSales: 0,
      totalPaid: 0,
      totalOutstanding: 0,
    };

    const currCollections = currCollectionsRaw[0]?.totalCollections || 0;
    const prevCollections = prevCollectionsRaw[0]?.totalCollections || 0;

    // Format aging buckets into a clean object
    const agingMap = {
      '0_30': { count: 0, amount: 0, label: '0-30 Days (Current)' },
      '31_60': { count: 0, amount: 0, label: '31-60 Days Overdue' },
      '61_90': { count: 0, amount: 0, label: '61-90 Days Overdue' },
      '90_PLUS': { count: 0, amount: 0, label: '90+ Days Critical' },
    };
    let totalAgingOutstanding = 0;
    for (const row of agingRaw) {
      if (agingMap[row.bucket]) {
        agingMap[row.bucket].count = row.count;
        agingMap[row.bucket].amount = row.totalOutstanding;
        totalAgingOutstanding += row.totalOutstanding;
      }
    }

    // Format payment methods with percentage share
    const totalCollectedMethods = paymentMethodsRaw.reduce((sum, p) => sum + p.amount, 0);
    const paymentMethods = paymentMethodsRaw.map((pm) => ({
      method: pm.paymentMethod,
      count: pm.count,
      amount: pm.amount,
      share: totalCollectedMethods > 0 ? Number(((pm.amount / totalCollectedMethods) * 100).toFixed(1)) : 0,
    }));

    // Format sales trend
    const salesTrend = trendRaw.map((t) => {
      const d = new Date(t.bucket);
      let label = '';
      if (trendInterval === 'hour') {
        label = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      } else if (trendInterval === 'month') {
        label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      } else {
        label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      }
      return {
        date: t.bucket,
        label,
        invoiceCount: t.invoiceCount,
        totalSales: t.totalSales,
      };
    });

    const avgInvoiceValue = currKpi.invoiceCount > 0 ? currKpi.totalSales / currKpi.invoiceCount : 0;
    const prevAvgInvoiceValue = prevKpi.invoiceCount > 0 ? prevKpi.totalSales / prevKpi.invoiceCount : 0;

    return success(res, {
      period,
      dateRange: {
        current: { start: current.start, end: current.end },
        previous: { start: previous.start, end: previous.end },
      },
      summary: {
        totalSales: currKpi.totalSales,
        totalTaxable: currKpi.totalTaxable,
        totalTax: currKpi.totalTax,
        totalCollections: currCollections,
        totalOutstanding: currKpi.totalOutstanding,
        invoiceCount: currKpi.invoiceCount,
        avgInvoiceValue,
        comparison: {
          salesGrowth: calcChange(currKpi.totalSales, prevKpi.totalSales),
          invoicesGrowth: calcChange(currKpi.invoiceCount, prevKpi.invoiceCount),
          collectionsGrowth: calcChange(currCollections, prevCollections),
          outstandingGrowth: calcChange(currKpi.totalOutstanding, prevKpi.totalOutstanding),
          avgInvoiceGrowth: calcChange(avgInvoiceValue, prevAvgInvoiceValue),
          previousSales: prevKpi.totalSales,
          previousCollections: prevCollections,
          previousInvoices: prevKpi.invoiceCount,
        },
      },
      salesTrend,
      customerPerformance: customerPerfRaw,
      productPerformance: productPerfRaw,
      paymentMethods,
      aging: {
        buckets: agingMap,
        totalOutstanding: totalAgingOutstanding,
      },
      statusBreakdown: statusBreakdownRaw,
    });
  } catch (err) {
    next(err);
  }
};

export const exportAnalyticsReport = async (req, res, next) => {
  try {
    const { period = 'THIS_MONTH', startDate, endDate } = req.query;
    const businessId = req.businessId;
    const { current, previous } = getPeriodRanges(period, startDate, endDate);

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, gstin: true, phone: true, email: true },
    });

    // Run same aggregations
    const [
      currKpiRaw,
      prevKpiRaw,
      currCollectionsRaw,
      paymentMethodsRaw,
      customerPerfRaw,
      productPerfRaw,
      trendRaw,
      agingRaw,
    ] = await Promise.all([
      prisma.$queryRaw`
        SELECT 
          COUNT(id)::int AS "invoiceCount",
          COALESCE(SUM("taxableAmount"), 0)::float AS "totalTaxable",
          COALESCE(SUM("totalTax"), 0)::float AS "totalTax",
          COALESCE(SUM("grandTotal"), 0)::float AS "totalSales",
          COALESCE(SUM("totalPaid"), 0)::float AS "totalPaid",
          COALESCE(SUM("outstandingAmount"), 0)::float AS "totalOutstanding"
        FROM "Invoice"
        WHERE "businessId" = ${businessId}
          AND status != 'CANCELLED'
          AND "invoiceDate" >= ${current.start}
          AND "invoiceDate" <= ${current.end}
      `,
      prisma.$queryRaw`
        SELECT 
          COUNT(id)::int AS "invoiceCount",
          COALESCE(SUM("grandTotal"), 0)::float AS "totalSales"
        FROM "Invoice"
        WHERE "businessId" = ${businessId}
          AND status != 'CANCELLED'
          AND "invoiceDate" >= ${previous.start}
          AND "invoiceDate" <= ${previous.end}
      `,
      prisma.$queryRaw`
        SELECT 
          COUNT(p.id)::int AS "paymentCount",
          COALESCE(SUM(p.amount), 0)::float AS "totalCollections"
        FROM "Payment" p
        JOIN "Invoice" i ON i.id = p."invoiceId"
        WHERE i."businessId" = ${businessId}
          AND p."paymentDate" >= ${current.start}
          AND p."paymentDate" <= ${current.end}
      `,
      prisma.$queryRaw`
        SELECT 
          p."paymentMethod",
          COUNT(p.id)::int AS "count",
          COALESCE(SUM(p.amount), 0)::float AS "amount"
        FROM "Payment" p
        JOIN "Invoice" i ON i.id = p."invoiceId"
        WHERE i."businessId" = ${businessId}
          AND p."paymentDate" >= ${current.start}
          AND p."paymentDate" <= ${current.end}
        GROUP BY p."paymentMethod"
        ORDER BY "amount" DESC
      `,
      prisma.$queryRaw`
        SELECT 
          c.name, c.phone, c.gstin, c."billingCity" AS city,
          COUNT(i.id)::int AS "invoicesCount",
          COALESCE(SUM(i."taxableAmount"), 0)::float AS "totalTaxable",
          COALESCE(SUM(i."grandTotal"), 0)::float AS "totalRevenue",
          COALESCE(SUM(i."totalPaid"), 0)::float AS "totalPaid",
          COALESCE(SUM(i."outstandingAmount"), 0)::float AS "outstandingAmount"
        FROM "Invoice" i
        JOIN "Customer" c ON c.id = i."customerId"
        WHERE i."businessId" = ${businessId}
          AND i.status != 'CANCELLED'
          AND i."invoiceDate" >= ${current.start}
          AND i."invoiceDate" <= ${current.end}
        GROUP BY c.name, c.phone, c.gstin, c."billingCity"
        ORDER BY "totalRevenue" DESC
      `,
      prisma.$queryRaw`
        SELECT 
          ii.description AS "productName",
          ii."hsnSacCode" AS "hsnCode",
          ii.unit,
          COALESCE(SUM(ii."billedQty"), 0)::float AS "quantitySold",
          COALESCE(SUM(ii."taxableAmount"), 0)::float AS "totalTaxable",
          COALESCE(SUM(ii.amount), 0)::float AS "totalRevenue",
          COUNT(DISTINCT i.id)::int AS "invoicesCount"
        FROM "InvoiceItem" ii
        JOIN "Invoice" i ON i.id = ii."invoiceId"
        WHERE i."businessId" = ${businessId}
          AND i.status != 'CANCELLED'
          AND i."invoiceDate" >= ${current.start}
          AND i."invoiceDate" <= ${current.end}
        GROUP BY ii.description, ii."hsnSacCode", ii.unit
        ORDER BY "totalRevenue" DESC
      `,
      prisma.$queryRaw`
        SELECT 
          date_trunc('day', "invoiceDate") AS bucket,
          COUNT(id)::int AS "invoiceCount",
          COALESCE(SUM("grandTotal"), 0)::float AS "totalSales"
        FROM "Invoice"
        WHERE "businessId" = ${businessId}
          AND status != 'CANCELLED'
          AND "invoiceDate" >= ${current.start}
          AND "invoiceDate" <= ${current.end}
        GROUP BY 1
        ORDER BY 1
      `,
      prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN CURRENT_DATE - COALESCE("dueDate"::date, "invoiceDate"::date) <= 30 THEN '0-30 Days (Current)'
            WHEN CURRENT_DATE - COALESCE("dueDate"::date, "invoiceDate"::date) <= 60 THEN '31-60 Days Overdue'
            WHEN CURRENT_DATE - COALESCE("dueDate"::date, "invoiceDate"::date) <= 90 THEN '61-90 Days Overdue'
            ELSE '90+ Days Critical'
          END AS bucket,
          COUNT(id)::int AS count,
          COALESCE(SUM("outstandingAmount"), 0)::float AS "totalOutstanding"
        FROM "Invoice"
        WHERE "businessId" = ${businessId}
          AND status != 'CANCELLED'
          AND "paymentStatus" != 'PAID'
          AND "outstandingAmount" > 0
        GROUP BY 1
        ORDER BY 1
      `,
    ]);

    const currKpi = currKpiRaw[0] || { invoiceCount: 0, totalTaxable: 0, totalTax: 0, totalSales: 0, totalPaid: 0, totalOutstanding: 0 };
    const prevKpi = prevKpiRaw[0] || { invoiceCount: 0, totalSales: 0 };
    const collections = currCollectionsRaw[0]?.totalCollections || 0;

    const workbook = new ExcelJS.Workbook();

    // 1. Executive Summary Sheet
    const summarySheet = workbook.addWorksheet('Executive Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 32 },
      { header: 'Current Period', key: 'current', width: 22 },
      { header: 'Previous Period', key: 'previous', width: 22 },
      { header: 'Growth / Change (%)', key: 'growth', width: 22 },
    ];
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };

    summarySheet.addRow({ metric: 'Business Name', current: business?.name || 'My Business' });
    summarySheet.addRow({ metric: 'GSTIN', current: business?.gstin || '-' });
    summarySheet.addRow({ metric: 'Analysis Period', current: `${current.start.toLocaleDateString('en-IN')} to ${current.end.toLocaleDateString('en-IN')}` });
    summarySheet.addRow({});

    summarySheet.addRow({
      metric: 'Total Billed Sales (₹)',
      current: currKpi.totalSales,
      previous: prevKpi.totalSales,
      growth: `${calcChange(currKpi.totalSales, prevKpi.totalSales)}%`,
    });
    summarySheet.addRow({
      metric: 'Taxable Revenue (₹)',
      current: currKpi.totalTaxable,
    });
    summarySheet.addRow({
      metric: 'GST Collected (₹)',
      current: currKpi.totalTax,
    });
    summarySheet.addRow({
      metric: 'Total Payment Collections (₹)',
      current: collections,
    });
    summarySheet.addRow({
      metric: 'Total Outstanding Balance (₹)',
      current: currKpi.totalOutstanding,
    });
    summarySheet.addRow({
      metric: 'Invoices Issued',
      current: currKpi.invoiceCount,
      previous: prevKpi.invoiceCount,
      growth: `${calcChange(currKpi.invoiceCount, prevKpi.invoiceCount)}%`,
    });

    // 2. Product Performance Sheet
    const productSheet = workbook.addWorksheet('Product Performance');
    productSheet.columns = [
      { header: 'Product Name', key: 'name', width: 32 },
      { header: 'HSN / SAC', key: 'hsn', width: 16 },
      { header: 'Unit', key: 'unit', width: 12 },
      { header: 'Quantity Sold', key: 'qty', width: 16 },
      { header: 'Taxable Value (₹)', key: 'taxable', width: 20 },
      { header: 'Total Revenue (₹)', key: 'revenue', width: 20 },
      { header: 'Invoices Count', key: 'invCount', width: 16 },
    ];
    productSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    productSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };

    let totalProdQty = 0, totalProdRev = 0;
    for (const p of productPerfRaw) {
      totalProdQty += p.quantitySold;
      totalProdRev += p.totalRevenue;
      productSheet.addRow({
        name: p.productName,
        hsn: p.hsnCode || '-',
        unit: p.unit || 'PCS',
        qty: p.quantitySold,
        taxable: p.totalTaxable,
        revenue: p.totalRevenue,
        invCount: p.invoicesCount,
      });
    }
    const prodTotalRow = productSheet.addRow({ name: 'TOTAL', qty: totalProdQty, revenue: totalProdRev });
    prodTotalRow.font = { bold: true };

    // 3. Customer Performance Sheet
    const customerSheet = workbook.addWorksheet('Customer Performance');
    customerSheet.columns = [
      { header: 'Customer Name', key: 'name', width: 30 },
      { header: 'GSTIN', key: 'gstin', width: 18 },
      { header: 'City', key: 'city', width: 18 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Invoices', key: 'count', width: 14 },
      { header: 'Total Revenue (₹)', key: 'revenue', width: 20 },
      { header: 'Total Paid (₹)', key: 'paid', width: 18 },
      { header: 'Outstanding Balance (₹)', key: 'outstanding', width: 22 },
    ];
    customerSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    customerSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };

    let totalCustRev = 0, totalCustPaid = 0, totalCustOut = 0;
    for (const c of customerPerfRaw) {
      totalCustRev += c.totalRevenue;
      totalCustPaid += c.totalPaid;
      totalCustOut += c.outstandingAmount;
      customerSheet.addRow({
        name: c.name,
        gstin: c.gstin || '-',
        city: c.city || '-',
        phone: c.phone || '-',
        count: c.invoicesCount,
        revenue: c.totalRevenue,
        paid: c.totalPaid,
        outstanding: c.outstandingAmount,
      });
    }
    const custTotalRow = customerSheet.addRow({ name: 'TOTAL', revenue: totalCustRev, paid: totalCustPaid, outstanding: totalCustOut });
    custTotalRow.font = { bold: true };

    // 4. Collections by Method Sheet
    const paymentSheet = workbook.addWorksheet('Payment Collections');
    paymentSheet.columns = [
      { header: 'Payment Method', key: 'method', width: 22 },
      { header: 'Transaction Count', key: 'count', width: 20 },
      { header: 'Total Amount (₹)', key: 'amount', width: 22 },
    ];
    paymentSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    paymentSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };

    let totalPayAmt = 0;
    for (const pm of paymentMethodsRaw) {
      totalPayAmt += pm.amount;
      paymentSheet.addRow({
        method: pm.paymentMethod,
        count: pm.count,
        amount: pm.amount,
      });
    }
    const payTotalRow = paymentSheet.addRow({ method: 'TOTAL', amount: totalPayAmt });
    payTotalRow.font = { bold: true };

    // 5. Receivables Aging Sheet
    const agingSheet = workbook.addWorksheet('Receivables Aging');
    agingSheet.columns = [
      { header: 'Aging Category', key: 'bucket', width: 28 },
      { header: 'Overdue Invoices Count', key: 'count', width: 24 },
      { header: 'Outstanding Amount (₹)', key: 'amount', width: 24 },
    ];
    agingSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    agingSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };

    let totalAgingAmt = 0;
    for (const a of agingRaw) {
      totalAgingAmt += a.totalOutstanding;
      agingSheet.addRow({
        bucket: a.bucket,
        count: a.count,
        amount: a.totalOutstanding,
      });
    }
    const agingTotalRow = agingSheet.addRow({ bucket: 'TOTAL OVERDUE', amount: totalAgingAmt });
    agingTotalRow.font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="business_analytics_${Date.now()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

