import prisma from '../../config/database.js';
import { success } from '../../utils/response.js';

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

    const [
      invoices,
      totalCustomers,
      totalProducts,
      recentInvoices,
      allInvoicesForTopCustomers,
    ] = await Promise.all([
      prisma.invoice.findMany({
        where: invoiceWhere,
        select: {
          grandTotal: true,
          totalPaid: true,
          outstandingAmount: true,
          paymentStatus: true,
          invoiceType: true,
          status: true,
        },
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
      prisma.invoice.findMany({
        where: { businessId, status: { not: 'CANCELLED' }, customerId: { not: null } },
        select: {
          customerId: true,
          grandTotal: true,
          customer: { select: { id: true, name: true } },
        },
      }),
    ]);

    let totalSales = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let partiallyPaidAmount = 0;
    let gstSales = 0;
    let nonGstSales = 0;

    for (const inv of invoices) {
      const gTotal = Number(inv.grandTotal);
      const paid = Number(inv.totalPaid);
      const outstanding = Number(inv.outstandingAmount);

      totalSales += gTotal;
      paidAmount += paid;
      if (inv.paymentStatus === 'PARTIALLY_PAID') {
        partiallyPaidAmount += outstanding;
        pendingAmount += outstanding;
      } else if (inv.paymentStatus === 'UNPAID') {
        pendingAmount += outstanding;
      }

      if (inv.invoiceType === 'GST') {
        gstSales += gTotal;
      } else {
        nonGstSales += gTotal;
      }
    }

    // Top 5 customers by revenue
    const customerMap = {};
    for (const inv of allInvoicesForTopCustomers) {
      if (!inv.customer) continue;
      const cId = inv.customer.id;
      if (!customerMap[cId]) {
        customerMap[cId] = {
          id: cId,
          name: inv.customer.name,
          totalAmount: 0,
          invoiceCount: 0,
        };
      }
      customerMap[cId].totalAmount += Number(inv.grandTotal);
      customerMap[cId].invoiceCount += 1;
    }

    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    // Monthly sales for the last 6 months
    const monthlySales = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthLabel = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });

      const monthInvoices = await prisma.invoice.findMany({
        where: {
          businessId,
          status: { not: 'CANCELLED' },
          invoiceDate: { gte: mStart, lte: mEnd },
        },
        select: { grandTotal: true },
      });

      const mTotal = monthInvoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
      monthlySales.push({
        month: monthLabel,
        totalSales: mTotal,
        invoiceCount: monthInvoices.length,
      });
    }

    return success(res, {
      totalSales,
      totalInvoices: invoices.length,
      paidAmount,
      pendingAmount,
      partiallyPaidAmount,
      totalCustomers,
      totalProducts,
      recentInvoices,
      topCustomers,
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

