import prisma from '../../config/database.js';
import { success, error } from '../../utils/response.js';

export const listCustomers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20, activeOnly = 'true' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * take;

    const where = {
      businessId: req.businessId,
      ...(activeOnly === 'true' ? { isActive: true } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { gstin: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { contactPerson: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { invoices: true },
          },
        },
      }),
    ]);

    return success(res, {
      customers,
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

export const getCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findFirst({
      where: { id, businessId: req.businessId },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });

    if (!customer) {
      return error(res, 'Customer not found', 404);
    }

    return success(res, customer);
  } catch (err) {
    next(err);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const customerData = {
      ...req.body,
      businessId: req.businessId,
    };

    if (customerData.sameAsShipping) {
      customerData.shippingAddress = customerData.billingAddress;
      customerData.shippingCity = customerData.billingCity;
      customerData.shippingState = customerData.billingState;
      customerData.shippingStateCode = customerData.billingStateCode;
      customerData.shippingPincode = customerData.billingPincode;
    }

    const customer = await prisma.customer.create({
      data: customerData,
    });

    return success(res, customer, 'Customer created successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.customer.findFirst({
      where: { id, businessId: req.businessId },
    });

    if (!existing) {
      return error(res, 'Customer not found', 404);
    }

    const updateData = { ...req.body };
    if (updateData.sameAsShipping) {
      updateData.shippingAddress = updateData.billingAddress || existing.billingAddress;
      updateData.shippingCity = updateData.billingCity || existing.billingCity;
      updateData.shippingState = updateData.billingState || existing.billingState;
      updateData.shippingStateCode = updateData.billingStateCode || existing.billingStateCode;
      updateData.shippingPincode = updateData.billingPincode || existing.billingPincode;
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return success(res, updated, 'Customer updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.customer.findFirst({
      where: { id, businessId: req.businessId },
      include: {
        _count: { select: { invoices: true } },
      },
    });

    if (!existing) {
      return error(res, 'Customer not found', 404);
    }

    // Soft delete to preserve invoice history
    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });

    return success(res, null, 'Customer deleted successfully');
  } catch (err) {
    next(err);
  }
};

export const getCustomerInvoices = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const take = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * take;

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({
        where: { customerId: id, businessId: req.businessId },
      }),
      prisma.invoice.findMany({
        where: { customerId: id, businessId: req.businessId },
        skip,
        take,
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

