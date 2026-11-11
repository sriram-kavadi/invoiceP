import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './modules/auth/auth.routes.js';
import businessRoutes from './modules/business/business.routes.js';
import customerRoutes from './modules/customers/customer.routes.js';
import productRoutes from './modules/products/product.routes.js';
import invoiceRoutes from './modules/invoices/invoice.routes.js';
import paymentRoutes from './modules/payments/payment.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import reportRoutes from './modules/reports/reports.routes.js';
import fileRoutes from './modules/files/files.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { timingMiddleware } from './middleware/timing.js';
import prisma from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Trust reverse proxy (Vercel)
app.set('trust proxy', 1);

// Performance timing (before all other middleware)
app.use(timingMiddleware);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, same-origin)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Allow all valid web clients
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Business-Id'],
}));

// Compression
app.use(compression());

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again after 15 minutes.',
  },
});
app.use(globalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files (logos, etc.) — public, no auth needed
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/business', businessRoutes);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/invoices', invoiceRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/files', fileRoutes);

// Health check with database diagnostics
apiRouter.get('/health', async (req, res) => {
  let dbStatus = 'ok';
  let dbError = null;
  try {
    if (!process.env.DATABASE_URL) {
      dbStatus = 'missing_env';
      dbError = 'DATABASE_URL is not set in environment variables';
    } else {
      await prisma.$queryRaw`SELECT 1`;
    }
  } catch (err) {
    dbStatus = 'connection_error';
    dbError = err.message;
  }

  res.json({
    success: dbStatus === 'ok',
    message: dbStatus === 'ok' ? 'InvoiceHub API is running and connected to Supabase' : 'Database connection issue detected',
    database: dbStatus,
    dbError,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    timestamp: new Date().toISOString(),
  });
});

// Mount on /api and root (for serverless environments)
app.use('/api', apiRouter);
app.use('/', apiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
});

// Global error handler
app.use(errorHandler);

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Server] InvoiceHub server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`[Server] CORS origin: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  });
}

export default app;
