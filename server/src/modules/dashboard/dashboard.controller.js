import prisma from '../../config/database.js';
import { success } from '../../utils/response.js';
import { Prisma } from '@prisma/client';

export const getSummary = async (req, res, next) => {
  try {
    const { period = 'THIS_MONTH', startDate, endDate } = req.query;

    const now = new Date();
    let dateFilter = {};

    if (startDate && endDate) {
      dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      switch (period) {
        case 'TODAY': {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          dateFilter = { gte: startOfToday };
          break;
        }
        case 'THIS_WEEK': {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          const startOfWeek = new Date(now.setDate(diff));
          startOfWeek.setHours(0, 0, 0, 0);
          dateFilter = { gte: startOfWeek };
          break;
        }
        case 'THIS_MONTH': {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          dateFilter = { gte: startOfMonth };
          break;
        }
        case 'THIS_YEAR': {
          // Indian FY starts Apr 1
          const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
          const startOfFy = new Date(startYear, 3, 1);
          dateFilter = { gte: startOfFy };
          break;
        }
        default:
          dateFilter = undefined;
      }
    }

    const businessId = req.businessId;

    const invoiceWhere = {
      businessId,
      ...(dateFilter ? { invoiceDate: dateFilter } : {}),
      status: { not: 'CANCELLED' },
    };

    // Six months ago for monthly chart
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Run all queries in parallel — no sequential awaits
    const [
      kpiAgg,
      gstAgg,
      nonGstAgg,
      totalCustomers,
      totalProducts,
      recentInvoices,
      topCustomersRaw,
      monthlySalesRaw,
    ] = await Promise.all([
      // KPI: aggregate instead of fetching all rows into JS
      prisma.invoice.aggregate({
        where: invoiceWhere,
        _sum: {
          grandTotal: true,
          totalPaid: true,
          outstandingAmount: true,
        },
        _count: { id: true },
      }),

      // GST sales total
      prisma.invoice.aggregate({
        where: { ...invoiceWhere, invoiceType: 'GST' },
        _sum: { grandTotal: true },
      }),

      // Non-GST sales total
      prisma.invoice.aggregate({
        where: { ...invoiceWhere, invoiceType: { not: 'GST' } },
        _sum: { grandTotal: true },
      }),

      prisma.customer.count({
        where: { businessId, isActive: true },
      }),

      prisma.product.count({
        where: { businessId, isActive: true },
      }),

      prisma.invoice.findMany({
        where: { businessId },
        take: 10,
        orderBy: { invoiceDate: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          grandTotal: true,
          totalPaid: true,
          outstandingAmount: true,
          status: true,
          paymentStatus: true,
          customer: {
            select: { name: true },
          },
        },
      }),

      // Top 5 customers — single SQL GROUP BY, no JS aggregation
      prisma.$queryRaw`
        SELECT c.id, c.name,
               COUNT(i.id)::int AS "invoiceCount",
               COALESCE(SUM(i."grandTotal"), 0)::float AS "totalAmount"
        FROM "Invoice" i
        JOIN "Customer" c ON c.id = i."customerId"
        WHERE i."businessId" = ${businessId}
          AND i.status != 'CANCELLED'
          AND i."customerId" IS NOT NULL
        GROUP BY c.id, c.name
        ORDER BY "totalAmount" DESC
        LIMIT 5
      `,

      // Monthly sales — single SQL GROUP BY replaces the 6-iteration loop
      prisma.$queryRaw`
        SELECT date_trunc('month', "invoiceDate") AS month,
               COUNT(*)::int AS "invoiceCount",
               COALESCE(SUM("grandTotal"), 0)::float AS "totalSales"
        FROM "Invoice"
        WHERE "businessId" = ${businessId}
          AND status != 'CANCELLED'
          AND "invoiceDate" >= ${sixMonthsAgo}
        GROUP BY 1
        ORDER BY 1
      `,
    ]);

    // Calculate pending amounts from KPI aggregation
    // We need partiallyPaidAmount — requires a targeted query (but fast, aggregate only)
    const partiallyPaidAgg = await prisma.invoice.aggregate({
      where: { ...invoiceWhere, paymentStatus: 'PARTIALLY_PAID' },
      _sum: { outstandingAmount: true },
    });

    const totalSales = Number(kpiAgg._sum.grandTotal || 0);
    const paidAmount = Number(kpiAgg._sum.totalPaid || 0);
    const pendingAmount = Number(kpiAgg._sum.outstandingAmount || 0);
    const partiallyPaidAmount = Number(partiallyPaidAgg._sum.outstandingAmount || 0);
    const gstSales = Number(gstAgg._sum.grandTotal || 0);
    const nonGstSales = Number(nonGstAgg._sum.grandTotal || 0);

    // Build a complete 6-month array, filling in zeros for months with no data
    const monthlySales = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      // Match against the raw SQL result
      const rawRow = monthlySalesRaw.find((r) => {
        const rowDate = new Date(r.month);
        return rowDate.getFullYear() === d.getFullYear() && rowDate.getMonth() === d.getMonth();
      });
      monthlySales.push({
        month: monthLabel,
        totalSales: rawRow ? Number(rawRow.totalSales) : 0,
        invoiceCount: rawRow ? Number(rawRow.invoiceCount) : 0,
      });
    }

    return success(res, {
      totalSales,
      totalInvoices: kpiAgg._count.id,
      paidAmount,
      pendingAmount,
      partiallyPaidAmount,
      totalCustomers,
      totalProducts,
      recentInvoices,
      topCustomers: topCustomersRaw.map((r) => ({
        id: r.id,
        name: r.name,
        invoiceCount: Number(r.invoiceCount),
        totalAmount: Number(r.totalAmount),
      })),
      monthlySales,
      gstVsNonGstSales: {
        gstSales,
        nonGstSales,
      },
    });
  } catch (err) {
    next(err);
  }
};

