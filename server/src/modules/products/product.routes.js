import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireBusiness } from '../../middleware/tenant.js';
import { validate } from '../../middleware/validate.js';
import { productSchema, productUpdateSchema } from './product.validation.js';
import multer from 'multer';
import {
  listProducts,
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  importProducts,
  exportProducts,
} from './product.controller.js';

const router = Router();

// All product routes require authentication + resolved business
router.use(authenticate, requireBusiness);

// Multer configuration for Excel import (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are accepted'), false);
    }
  },
});

/** GET /api/products — paginated list with search & filters */
router.get('/', listProducts);

/** POST /api/products — create a new product */
router.post('/', validate(productSchema), createProduct);

/** GET /api/products/export — export all products as Excel */
router.get('/export', exportProducts);

/** POST /api/products/import — import products from Excel */
router.post('/import', upload.single('file'), importProducts);

/** GET /api/products/:id — get single product */
router.get('/:id', getProduct);

/** PUT /api/products/:id — update product */
router.put('/:id', validate(productUpdateSchema), updateProduct);

/** DELETE /api/products/:id — soft-delete product */
router.delete('/:id', deleteProduct);

export default router;
