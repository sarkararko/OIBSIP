import express, { Express } from 'express';
import authRoutes from './routes/authRoutes.js';
import pizzaRoutes from './routes/pizzaRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { isMongoConnected } from './config/db.js';

export function createExpressApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Healthcheck & system status
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'PizzaCraft Artisanal Backend Engine',
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: isMongoConnected(),
        mode: isMongoConnected() ? 'MongoDB Atlas' : 'Local File Persistence (server-data.json)',
        note: isMongoConnected()
          ? 'Connected to live MongoDB cluster'
          : 'Operating with persistent server-data.json engine. To enable Atlas, add 0.0.0.0/0 to Atlas IP whitelist.',
      },
    });
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

  return app;
}
