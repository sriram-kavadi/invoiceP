// Serverless API entrypoint for Vercel
process.env.VERCEL = process.env.VERCEL || '1';

import app from '../server/src/index.js';

export default app;
