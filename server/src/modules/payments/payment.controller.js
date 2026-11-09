import prisma from '../../config/database.js';
import { success, error } from '../../utils/response.js';

export const listAllPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, method, startDate, endDate } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * take;

    const where = {
      invoice: {
        businessId: req.businessId,
      },
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

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { paymentDate: 'desc' },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              grandTotal: true,
              customer: {
                select: { name: true },
              },
            },
          },
        },
      }),
    ]);

    return success(res, {
      payments,
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

export const listInvoicePayments = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, businessId: req.businessId },
    });

    if (!invoice) {
      return error(res, 'Invoice not found', 404);
    }

    const payments = await prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { paymentDate: 'desc' },
    });

    return success(res, payments);
  } catch (err) {
    next(err);
  }
};

export const recordPayment = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const { amount, paymentDate, paymentMethod, transactionRef, notes } = req.body;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, businessId: req.businessId },
    });

    if (!invoice) {
      return error(res, 'Invoice not found', 404);
    }

    if (invoice.status !== 'ISSUED') {
      return error(res, 'Payments can only be recorded against ISSUED invoices', 400);
    }

    const outstanding = Number(invoice.outstandingAmount);
    const paymentAmount = Number(amount);

    if (paymentAmount > outstanding + 0.01) {
      return error(
        res,
        `Payment amount (₹${paymentAmount.toFixed(2)}) cannot exceed outstanding balance (₹${outstanding.toFixed(2)})`,
        400
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          amount: paymentAmount,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethod,
          transactionRef: transactionRef || null,
          notes: notes || null,
        },
      });

      const newTotalPaid = Number(invoice.totalPaid) + paymentAmount;
      const newOutstanding = Math.max(0, Number(invoice.grandTotal) - newTotalPaid);
      const newPaymentStatus = newOutstanding <= 0.01 ? 'PAID' : 'PARTIALLY_PAID';

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          totalPaid: newTotalPaid,
          outstandingAmount: newOutstanding,
          paymentStatus: newPaymentStatus,
        },
      });

      await tx.invoiceAuditLog.create({
        data: {
          invoiceId,
          action: 'PAYMENT_RECORDED',
          details: {
            paymentId: payment.id,
            amount: paymentAmount,
            method: paymentMethod,
            outstandingRemaining: newOutstanding,
          },
          performedBy: req.user?.name || req.user?.email,
        },
      });

      return { payment, invoice: updatedInvoice };
    });

    return success(res, result, 'Payment recorded successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const deletePayment = async (req, res, next) => {
  try {
    const { invoiceId, paymentId } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, businessId: req.businessId },
    });

    if (!invoice) {
      return error(res, 'Invoice not found', 404);
    }

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, invoiceId },
    });

    if (!payment) {
      return error(res, 'Payment record not found', 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id: paymentId } });

      const newTotalPaid = Math.max(0, Number(invoice.totalPaid) - Number(payment.amount));
      const newOutstanding = Number(invoice.grandTotal) - newTotalPaid;
      const newPaymentStatus =
        newTotalPaid <= 0.01
          ? 'UNPAID'
          : newOutstanding <= 0.01
          ? 'PAID'
          : 'PARTIALLY_PAID';

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          totalPaid: newTotalPaid,
          outstandingAmount: newOutstanding,
          paymentStatus: newPaymentStatus,
        },
      });

      await tx.invoiceAuditLog.create({
        data: {
          invoiceId,
          action: 'PAYMENT_REVERTED',
          details: { paymentId, amountReverted: payment.amount },
          performedBy: req.user?.name || req.user?.email,
        },
      });

      return updatedInvoice;
    });

    return success(res, result, 'Payment reverted successfully');
  } catch (err) {
    next(err);
  }
};

