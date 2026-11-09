import ExcelJS from 'exceljs';
import prisma from '../../config/database.js';
import { success, error } from '../../utils/response.js';

// ─── List Products ────────────────────────────────────────────────────────────

/**
 * GET /api/products
 * Paginated list with optional search and filters, scoped to req.businessId.
 */
export async function listProducts(req, res) {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      isService,
      taxClassification,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Build the where clause
    const where = {
      businessId: req.businessId,
      isActive: true,
    };

    // Search by name, SKU, or HSN/SAC code
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { sku: { contains: search.trim(), mode: 'insensitive' } },
        { hsnSacCode: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // Filter by isService
    if (isService !== undefined && isService !== '') {
      where.isService = isService === 'true';
    }

    // Filter by taxClassification
    if (taxClassification && taxClassification.trim()) {
      where.taxClassification = taxClassification.trim().toUpperCase();
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.product.count({ where }),
    ]);

    return success(res, {
      products,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('[Products] listProducts error:', err);
    return error(res, 'Failed to fetch products', 500);
  }
}

// ─── Create Product ───────────────────────────────────────────────────────────

/**
 * POST /api/products
 * Creates a new product scoped to req.businessId.
 */
export async function createProduct(req, res) {
  try {
    const {
      name,
      sku,
      description,
      hsnSacCode,
      unit = 'PCS',
      sellingPrice,
      gstRate = 0,
      taxClassification = 'TAXABLE',
      defaultDiscount = 0,
      isService = false,
    } = req.body;

    // Check for duplicate SKU within this business
    if (sku && sku.trim()) {
      const existing = await prisma.product.findFirst({
        where: { businessId: req.businessId, sku: sku.trim(), isActive: true },
      });
      if (existing) {
        return error(res, `A product with SKU "${sku.trim()}" already exists in this business.`, 409);
      }
    }

    const product = await prisma.product.create({
      data: {
        businessId: req.businessId,
        name: name.trim(),
        sku: sku?.trim() || null,
        description: description?.trim() || null,
        hsnSacCode: hsnSacCode?.trim() || null,
        unit,
        sellingPrice,
        gstRate,
        taxClassification,
        defaultDiscount,
        isService,
      },
    });

    return success(res, { product }, 'Product created successfully', 201);
  } catch (err) {
    console.error('[Products] createProduct error:', err);
    return error(res, 'Failed to create product', 500);
  }
}

// ─── Get Product ──────────────────────────────────────────────────────────────

/**
 * GET /api/products/:id
 * Returns a single product, enforcing tenant scope.
 */
export async function getProduct(req, res) {
  try {
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: { id, businessId: req.businessId },
    });

    if (!product) {
      return error(res, 'Product not found', 404);
    }

    return success(res, { product });
  } catch (err) {
    console.error('[Products] getProduct error:', err);
    return error(res, 'Failed to fetch product', 500);
  }
}

// ─── Update Product ───────────────────────────────────────────────────────────

/**
 * PUT /api/products/:id
 * Updates an existing product, enforcing tenant scope.
 */
export async function updateProduct(req, res) {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.product.findFirst({
      where: { id, businessId: req.businessId },
    });
    if (!existing) {
      return error(res, 'Product not found', 404);
    }

    const {
      name,
      sku,
      description,
      hsnSacCode,
      unit,
      sellingPrice,
      gstRate,
      taxClassification,
      defaultDiscount,
      isService,
    } = req.body;

    // Check for duplicate SKU (excluding current product)
    if (sku !== undefined && sku !== null && sku.trim()) {
      const duplicate = await prisma.product.findFirst({
        where: {
          businessId: req.businessId,
          sku: sku.trim(),
          isActive: true,
          NOT: { id },
        },
      });
      if (duplicate) {
        return error(res, `A product with SKU "${sku.trim()}" already exists in this business.`, 409);
      }
    }

    // Build update data (only provided fields)
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (sku !== undefined) data.sku = sku?.trim() || null;
    if (description !== undefined) data.description = description?.trim() || null;
    if (hsnSacCode !== undefined) data.hsnSacCode = hsnSacCode?.trim() || null;
    if (unit !== undefined) data.unit = unit;
    if (sellingPrice !== undefined) data.sellingPrice = sellingPrice;
    if (gstRate !== undefined) data.gstRate = gstRate;
    if (taxClassification !== undefined) data.taxClassification = taxClassification;
    if (defaultDiscount !== undefined) data.defaultDiscount = defaultDiscount;
    if (isService !== undefined) data.isService = isService;

    const product = await prisma.product.update({
      where: { id },
      data,
    });

    return success(res, { product }, 'Product updated successfully');
  } catch (err) {
    console.error('[Products] updateProduct error:', err);
    return error(res, 'Failed to update product', 500);
  }
}

// ─── Delete Product ───────────────────────────────────────────────────────────

/**
 * DELETE /api/products/:id
 * Soft-deletes a product. Rejects if the product is used in any ISSUED invoices.
 */
export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.product.findFirst({
      where: { id, businessId: req.businessId },
    });
    if (!existing) {
      return error(res, 'Product not found', 404);
    }

    if (!existing.isActive) {
      return error(res, 'Product is already deleted', 400);
    }

    // Check if used in any ISSUED invoices
    const usedInIssuedInvoice = await prisma.invoiceItem.findFirst({
      where: {
        productId: id,
        invoice: {
          businessId: req.businessId,
          status: 'ISSUED',
        },
      },
      select: { id: true },
    });

    if (usedInIssuedInvoice) {
      return error(
        res,
        'This product is used in one or more issued invoices and cannot be deleted.',
        400,
      );
    }

    // Soft delete
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return success(res, null, 'Product deleted successfully');
  } catch (err) {
    console.error('[Products] deleteProduct error:', err);
    return error(res, 'Failed to delete product', 500);
  }
}

// ─── Import Products ──────────────────────────────────────────────────────────

/**
 * POST /api/products/import
 * Parses an uploaded Excel (.xlsx) file and upserts products by SKU.
 * Expected columns (row 1 is header):
 *   Name | SKU | Description | HSN/SAC Code | Unit | Selling Price |
 *   GST Rate | Tax Classification | Default Discount (%) | Is Service
 */
export async function importProducts(req, res) {
  try {
    if (!req.file) {
      return error(res, 'No Excel file uploaded. Please attach a file with field name "file".', 400);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return error(res, 'The uploaded file contains no worksheets.', 400);
    }

    const VALID_UNITS = ['PCS', 'KG', 'BOX', 'WAL', 'LTR', 'MTR', 'NOS', 'SET', 'DZ', 'PACK', 'OTHER'];
    const VALID_TAX_CLASSIFICATIONS = ['TAXABLE', 'EXEMPT', 'NIL_RATED', 'NON_GST'];
    const VALID_GST_RATES = [0, 5, 12, 18, 28];

    const results = { created: 0, updated: 0, skipped: 0, errors: [] };

    // Skip header row (row 1)
    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) rows.push({ row, rowNumber });
    });

    for (const { row, rowNumber } of rows) {
      const getCellValue = (col) => {
        const cell = row.getCell(col);
        return cell.value !== null && cell.value !== undefined
          ? String(cell.value).trim()
          : '';
      };

      const name = getCellValue(1);
      const sku = getCellValue(2);
      const description = getCellValue(3);
      const hsnSacCode = getCellValue(4);
      const unitRaw = getCellValue(5).toUpperCase() || 'PCS';
      const sellingPriceRaw = getCellValue(6);
      const gstRateRaw = getCellValue(7);
      const taxClassificationRaw = getCellValue(8).toUpperCase() || 'TAXABLE';
      const defaultDiscountRaw = getCellValue(9);
      const isServiceRaw = getCellValue(10).toLowerCase();

      // Required: name
      if (!name) {
        results.errors.push({ row: rowNumber, message: 'Name is required' });
        results.skipped++;
        continue;
      }

      const sellingPrice = parseFloat(sellingPriceRaw);
      if (isNaN(sellingPrice) || sellingPrice <= 0) {
        results.errors.push({ row: rowNumber, message: 'Selling price must be a positive number' });
        results.skipped++;
        continue;
      }

      const gstRate = parseFloat(gstRateRaw) || 0;
      if (!VALID_GST_RATES.includes(gstRate)) {
        results.errors.push({ row: rowNumber, message: `GST rate must be one of: ${VALID_GST_RATES.join(', ')}` });
        results.skipped++;
        continue;
      }

      const unit = VALID_UNITS.includes(unitRaw) ? unitRaw : 'PCS';
      const taxClassification = VALID_TAX_CLASSIFICATIONS.includes(taxClassificationRaw)
        ? taxClassificationRaw
        : 'TAXABLE';
      const defaultDiscount = Math.min(100, Math.max(0, parseFloat(defaultDiscountRaw) || 0));
      const isService = ['true', '1', 'yes'].includes(isServiceRaw);

      const data = {
        businessId: req.businessId,
        name,
        description: description || null,
        hsnSacCode: hsnSacCode || null,
        unit,
        sellingPrice,
        gstRate,
        taxClassification,
        defaultDiscount,
        isService,
        isActive: true,
      };

      try {
        if (sku) {
          // Upsert by SKU within this business
          const existingProduct = await prisma.product.findFirst({
            where: { businessId: req.businessId, sku },
          });

          if (existingProduct) {
            await prisma.product.update({
              where: { id: existingProduct.id },
              data: { ...data, sku },
            });
            results.updated++;
          } else {
            await prisma.product.create({ data: { ...data, sku } });
            results.created++;
          }
        } else {
          // No SKU — always create
          await prisma.product.create({ data });
          results.created++;
        }
      } catch (rowErr) {
        console.error(`[Products] importProducts row ${rowNumber} error:`, rowErr);
        results.errors.push({ row: rowNumber, message: 'Failed to save product' });
        results.skipped++;
      }
    }

    return success(res, { results }, `Import complete: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped.`);
  } catch (err) {
    console.error('[Products] importProducts error:', err);
    return error(res, 'Failed to import products', 500);
  }
}

// ─── Export Products ──────────────────────────────────────────────────────────

/**
 * GET /api/products/export
 * Generates and streams an Excel file of all active products for the business.
 */
export async function exportProducts(req, res) {
  try {
    const products = await prisma.product.findMany({
      where: { businessId: req.businessId, isActive: true },
      orderBy: { name: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'InvoiceHub';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Products');

    // Define columns
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'HSN/SAC Code', key: 'hsnSacCode', width: 15 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Selling Price', key: 'sellingPrice', width: 15 },
      { header: 'GST Rate (%)', key: 'gstRate', width: 12 },
      { header: 'Tax Classification', key: 'taxClassification', width: 20 },
      { header: 'Default Discount (%)', key: 'defaultDiscount', width: 20 },
      { header: 'Is Service', key: 'isService', width: 12 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { horizontal: 'center' };

    // Add data rows
    for (const product of products) {
      worksheet.addRow({
        name: product.name,
        sku: product.sku || '',
        description: product.description || '',
        hsnSacCode: product.hsnSacCode || '',
        unit: product.unit,
        sellingPrice: parseFloat(product.sellingPrice),
        gstRate: parseFloat(product.gstRate),
        taxClassification: product.taxClassification,
        defaultDiscount: parseFloat(product.defaultDiscount),
        isService: product.isService ? 'Yes' : 'No',
        createdAt: product.createdAt.toISOString().split('T')[0],
      });
    }

    // Format numeric columns
    worksheet.getColumn('sellingPrice').numFmt = '#,##0.00';
    worksheet.getColumn('gstRate').numFmt = '0.00';
    worksheet.getColumn('defaultDiscount').numFmt = '0.00';

    // Auto-filter on header
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: worksheet.columns.length },
    };

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="products_${new Date().toISOString().split('T')[0]}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[Products] exportProducts error:', err);
    // If headers not sent yet, send error response
    if (!res.headersSent) {
      return error(res, 'Failed to export products', 500);
    }
  }
}
