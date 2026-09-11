import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import pizzaRoutes from './routes/pizzaRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { isMongoConnected, getDatabaseDiagnostics } from './config/db.js';

export function createExpressApp(): Express {
  const app = express();

  // Explicit allowed frontend origins
  const explicitAllowedOrigins = [
    'https://pizzacraft-frontend.vercel.app',
    'https://pizzacraft-oibsip.vercel.app',
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    process.env.APP_URL,
  ].filter(Boolean) as string[];

  // Dynamic CORS configuration supporting Vercel deployments and local development
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman, internal server requests)
      if (!origin) {
        return callback(null, true);
      }

      // Check explicit allowed origins
      if (explicitAllowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow any Vercel domain (*.vercel.app) for preview and production deployments
      if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // Allow any Cloud Run / AI Studio domain (*.run.app and *.googleusercontent.com)
      if (
        /^https:\/\/[a-zA-Z0-9_.-]+\.run\.app$/.test(origin) ||
        /^https:\/\/[a-zA-Z0-9_.-]+\.googleusercontent\.com$/.test(origin)
      ) {
        return callback(null, true);
      }

      // Allow localhost / 127.0.0.1 on any port in development
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // If in non-production, be permissive
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      console.warn(`[CORS Blocked] Origin: ${origin}`);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Authorization'],
    maxAge: 86400,
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Healthcheck
  app.get('/api/health', (_req, res) => {
    const connected = isMongoConnected();
    res.status(200).json({
      status: 'ok',
      database: connected ? 'connected' : 'connecting',
      service: 'PizzaCraft Artisanal Backend Engine',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/database/status', (req, res) => {
    res.json(getDatabaseDiagnostics());
  });

  // Mount API Routers
  app.use('/api/auth', authRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/pizzas', pizzaRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payment', paymentRoutes);
  app.use('/api/emails', emailRoutes);

  // Global error handler (handles CORS rejections cleanly)
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (err && typeof err.message === 'string' && err.message.includes('Not allowed by CORS')) {
      res.status(403).json({ error: err.message });
      return;
    }
    next(err);
  });

  return app;
}
