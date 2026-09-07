import { Router, Request, Response } from 'express';
import { DataStore } from '../models/index.js';
import { authenticateJWT, requireAdmin, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { runLowStockAudit } from '../services/cronService.js';

const router = Router();

// GET /api/admin/inventory - All SKUs with summary metrics
router.get('/inventory', optionalAuth, (req: AuthRequest, res: Response): void => {
  const db = DataStore.getData();
  const lowStockCount = db.inventory.filter((i) => i.stock < i.threshold).length;
  const healthyCount = db.inventory.filter((i) => i.stock >= i.threshold).length;

  res.json({
    inventory: db.inventory,
    summary: {
      totalSkus: db.inventory.length,
      lowStockCount,
      healthyCount,
    },
  });
});

// POST /api/admin/inventory/:itemId/adjust - Increment or decrement stock
router.post('/inventory/:itemId/adjust', optionalAuth, (req: AuthRequest, res: Response): void => {
  const { itemId } = req.params;
  const { delta } = req.body;

  const db = DataStore.getData();
  const item = db.inventory.find((i) => i.id === itemId);

  if (!item) {
    res.status(404).json({ error: 'Inventory item not found' });
    return;
  }

  const adjustment = typeof delta === 'number' ? delta : 0;
  item.stock = Math.max(0, item.stock + adjustment);
  item.lastUpdated = new Date().toISOString();

  DataStore.saveToDisk();

  // Check if stock alerts need to trigger
  runLowStockAudit();

  res.json({
    message: `Stock for ${item.name} adjusted by ${adjustment > 0 ? '+' : ''}${adjustment}. Current: ${item.stock}`,
    item,
  });
});

// PUT /api/admin/inventory/:itemId - Edit item properties (name, stock, threshold, price, etc.)
router.put('/inventory/:itemId', optionalAuth, (req: AuthRequest, res: Response): void => {
  const { itemId } = req.params;
  const { name, stock, threshold, price, unit, description, badge } = req.body;

  const db = DataStore.getData();
  const item = db.inventory.find((i) => i.id === itemId);

  if (!item) {
    res.status(404).json({ error: 'Inventory item not found' });
    return;
  }

  if (typeof name === 'string') item.name = name;
  if (typeof stock === 'number') item.stock = Math.max(0, stock);
  if (typeof threshold === 'number') item.threshold = Math.max(0, threshold);
  if (typeof price === 'number') item.price = Math.max(0, price);
  if (typeof unit === 'string') item.unit = unit;
  if (typeof description === 'string') item.description = description;
  if (typeof badge === 'string') item.badge = badge;
  item.lastUpdated = new Date().toISOString();

  DataStore.saveToDisk();
  runLowStockAudit();

  res.json({
    message: `Inventory item ${item.name} updated successfully.`,
    item,
  });
});

// GET /api/admin/orders - All customer orders
router.get('/orders', optionalAuth, (req: AuthRequest, res: Response): void => {
  const db = DataStore.getData();
  res.json({ orders: db.orders });
});

// PATCH & PUT /api/admin/orders/:orderId/status - Update kitchen progress
const updateOrderStatus = (req: AuthRequest, res: Response): void => {
  const { orderId } = req.params;
  const { status, note } = req.body;

  if (!status) {
    res.status(400).json({ error: 'Status is required' });
    return;
  }

  const db = DataStore.getData();
  const order = db.orders.find((o) => o.id === orderId || o.orderNumber === orderId);

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();

  if (!Array.isArray(order.timeline)) {
    order.timeline = [];
  }

  order.timeline.push({
    status,
    timestamp: new Date().toISOString(),
    note: note || `Order advanced to "${status}" by Executive Kitchen Staff`,
  });

  DataStore.saveToDisk();

  res.json({
    message: `Order #${order.orderNumber} status changed to ${status}`,
    order,
  });
};

router.patch('/orders/:orderId/status', optionalAuth, updateOrderStatus);
router.put('/orders/:orderId/status', optionalAuth, updateOrderStatus);

// POST /api/admin/inventory/alerts/trigger-check - Manual execution of Node-Cron audit
router.post('/inventory/alerts/trigger-check', optionalAuth, (req: AuthRequest, res: Response): void => {
  const auditResult = runLowStockAudit();
  res.json({
    message: 'Manual Node-Cron stock monitor executed successfully',
    lowItems: auditResult.lowStockItems,
    emailDispatched: auditResult.alertGenerated,
  });
});

// POST /api/admin/reset-demo-data - Restore factory demo state
router.post('/reset-demo-data', optionalAuth, (req: AuthRequest, res: Response): void => {
  DataStore.initDefaultData();
  res.json({ message: 'Demo inventory & sample orders restored.' });
});

export default router;
