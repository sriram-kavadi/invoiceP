import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import prisma from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';
import { requireBusiness } from '../../middleware/tenant.js';
import { error } from '../../utils/response.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');

router.get('/invoice/:id', authenticate, requireBusiness, async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId: req.businessId },
    });

    if (!invoice || !invoice.pdfPath) {
      return error(res, 'Invoice PDF not found', 404);
    }

    const fullPath = path.resolve(ROOT_DIR, invoice.pdfPath);
    if (!fs.existsSync(fullPath)) {
      return error(res, 'PDF file not found on disk', 404);
    }

    res.setHeader('Content-Type', 'application/pdf');
    return res.sendFile(fullPath);
  } catch (err) {
    next(err);
  }
});

export default router;

