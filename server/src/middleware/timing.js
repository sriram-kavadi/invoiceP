/**
 * Request timing middleware.
 * Logs slow requests (>500ms) in production; logs everything in development.
 */
export const timingMiddleware = (req, res, next) => {
  const start = performance.now();

  res.on('finish', () => {
    const duration = (performance.now() - start).toFixed(2);
    const isSlowInProd = process.env.NODE_ENV === 'production' && Number(duration) > 500;
    if (process.env.NODE_ENV !== 'production' || isSlowInProd) {
      const level = Number(duration) > 1000 ? 'SLOW' : 'OK';
      console.log(`[Timing][${level}] ${req.method} ${req.path} → ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
};

