import { Router, Response } from 'express';
import { dbService } from '../services/dbService.js';
import { authenticateJWT, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { runLowStockAudit } from '../services/cronService.js';
import { UserModel } from '../models/User.js';
import { isMongoConnected, connectDB, getDatabaseDiagnostics } from '../config/db.js';
import { DataStore } from '../models/index.js';

const router = Router();

// Apply strict JWT and Admin Role authorization to all admin endpoints
router.use(authenticateJWT, requireAdmin);

// GET /api/admin/dashboard - High-level operational metrics
router.get('/dashboard', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const inventory = await dbService.getInventory();
    const orders = await dbService.getOrders();
    const lowStockThreshold = Number(process.env.LOW_STOCK_THRESHOLD) || 20;

    const lowStockCount = inventory.filter(
      (i) => i.stock < (i.threshold || lowStockThreshold)
    ).length;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => (o.status !== 'Cancelled' ? sum + o.total : sum), 0);
    const activeOrders = orders.filter(
      (o) => o.status === 'Order Received' || o.status === 'In Kitchen' || o.status === 'Sent to Delivery'
    ).length;

    let totalCustomers = 0;
    if (isMongoConnected()) {
      totalCustomers = await UserModel.countDocuments({ role: { $ne: 'admin' } });
    } else {
      totalCustomers = DataStore.getData().users.filter((u) => u.role !== 'admin').length;
    }

    res.json({
      metrics: {
        totalOrders,
        totalRevenue,
        activeOrders,
        lowStockCount,
        totalCustomers,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch dashboard metrics' });
  }
});

// GET /api/admin/inventory - All SKUs with summary metrics
router.get('/inventory', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const inventory = await dbService.getInventory();
    const lowStockThreshold = Number(process.env.LOW_STOCK_THRESHOLD) || 20;

    const lowStockCount = inventory.filter(
      (i) => i.stock < (i.threshold || lowStockThreshold)
    ).length;
    const healthyCount = inventory.filter(
      (i) => i.stock >= (i.threshold || lowStockThreshold)
    ).length;

    res.json({
      inventory,
      summary: {
        totalSkus: inventory.length,
        lowStockCount,
        healthyCount,
        threshold: lowStockThreshold,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch inventory' });
  }
});

// POST /api/admin/inventory/:itemId/adjust - Increment or decrement stock
router.post('/inventory/:itemId/adjust', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const { delta } = req.body;

    const item = await dbService.getInventoryItem(itemId);
    if (!item) {
      res.status(404).json({ error: 'Inventory item not found' });
      return;
    }

    const adjustment = typeof delta === 'number' ? delta : 0;
    const updated = await dbService.adjustInventoryStock(itemId, adjustment);

    // Run audit for alert checks
    runLowStockAudit();

    res.json({
      message: `Stock for ${item.name} adjusted by ${adjustment > 0 ? '+' : ''}${adjustment}. Current: ${updated?.stock ?? item.stock}`,
      item: updated || item,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to adjust stock' });
  }
});

// PUT /api/admin/inventory/:itemId - Edit item properties
router.put('/inventory/:itemId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const { name, stock, threshold, price, unit, description, badge } = req.body;

    const item = await dbService.getInventoryItem(itemId);
    if (!item) {
      res.status(404).json({ error: 'Inventory item not found' });
      return;
    }

    const updates: any = {};
    if (typeof name === 'string') updates.name = name;
    if (typeof stock === 'number') updates.stock = Math.max(0, stock);
    if (typeof threshold === 'number') updates.threshold = Math.max(0, threshold);
    if (typeof price === 'number') updates.price = Math.max(0, price);
    if (typeof unit === 'string') updates.unit = unit;
    if (typeof description === 'string') updates.description = description;
    if (typeof badge === 'string') updates.badge = badge;
    updates.lastUpdated = new Date().toISOString();

    const updated = await dbService.updateInventoryItem(itemId, updates);
    runLowStockAudit();

    res.json({
      message: `Inventory item ${item.name} updated successfully.`,
      item: updated || item,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update inventory item' });
  }
});

// GET /api/admin/orders - All customer orders
router.get('/orders', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await dbService.getOrders();
    res.json({ orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch orders' });
  }
});

// PATCH & PUT /api/admin/orders/:orderId/status - Update kitchen progress
const updateOrderStatusHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }

    const order = await dbService.getOrderById(orderId);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const defaultNote =
      status === 'Cancelled'
        ? 'Order cancelled by Admin. Inventory has been restored.'
        : `Order advanced to "${status}" by Executive Kitchen Staff`;

    const updated = await dbService.updateOrderStatus(orderId, status, note || defaultNote);

    res.json({
      message: `Order #${order.orderNumber} status changed to ${status}`,
      order: updated || order,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update order status' });
  }
};

router.patch('/orders/:orderId/status', updateOrderStatusHandler);
router.put('/orders/:orderId/status', updateOrderStatusHandler);

// GET /api/admin/users - User management (sanitized)
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let users: any[] = [];
    if (isMongoConnected()) {
      users = await UserModel.find().select('-passwordHash').lean();
    } else {
      users = DataStore.getData().users.map((u) => {
        const { passwordHash, ...safe } = u;
        return safe;
      });
    }
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch users' });
  }
});

// POST /api/admin/inventory/alerts/trigger-check - Manual execution of Node-Cron audit
router.post('/inventory/alerts/trigger-check', async (req: AuthRequest, res: Response): Promise<void> => {
  const auditResult = await runLowStockAudit();
  res.json({
    message: 'Manual Node-Cron stock monitor executed successfully',
    lowItems: auditResult.lowStockItems,
    emailDispatched: auditResult.alertGenerated,
  });
});

// POST /api/admin/reset-demo-data - Restore factory demo state
router.post('/reset-demo-data', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    DataStore.initDefaultData();
    if (isMongoConnected()) {
      await dbService.seedInitialMongoData();
    }
    res.json({ message: 'Demo inventory & sample orders restored.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reset demo data' });
  }
});

// GET /api/admin/database/diagnostics - Deep MongoDB diagnostics
router.get('/database/diagnostics', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const diag = getDatabaseDiagnostics();
    let mongoCounts: any = null;
    if (isMongoConnected()) {
      const { IngredientModel } = await import('../models/Ingredient.js');
      const { PizzaModel } = await import('../models/Pizza.js');
      const { OrderModel } = await import('../models/Order.js');
      const { UserModel } = await import('../models/User.js');
      mongoCounts = {
        ingredients: await (IngredientModel as any).countDocuments(),
        pizzas: await (PizzaModel as any).countDocuments(),
        orders: await (OrderModel as any).countDocuments(),
        users: await (UserModel as any).countDocuments(),
      };
    }
    res.json({
      ...diag,
      mongoCounts,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get database diagnostics' });
  }
});

// POST /api/admin/reconnect-db - Force an immediate MongoDB connection attempt
router.post('/reconnect-db', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const connected = await connectDB(false);
    const diag = getDatabaseDiagnostics();
    res.json({
      success: connected,
      message: connected
        ? 'Successfully connected to MongoDB Atlas! MongoDB is now active as Primary Database.'
        : 'Connection attempt failed. Check MongoDB Atlas Network Access whitelist.',
      diagnostics: diag,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Connection attempt error' });
  }
});

export default router;
