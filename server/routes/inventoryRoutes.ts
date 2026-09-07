import { Router, Request, Response } from 'express';
import { DataStore } from '../models/index.js';
import { authenticateJWT, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { runLowStockAudit } from '../services/cronService.js';

const router = Router();

// GET /api/inventory - View all stock levels & thresholds
router.get('/', (req: Request, res: Response): void => {
  const db = DataStore.getData();
  const lowStockCount = db.inventory.filter((i) => i.stock < i.threshold).length;
  res.json({
    inventory: db.inventory,
    lowStockCount,
    totalSKUs: db.inventory.length,
  });
});

// POST /api/inventory/check-availability - Verify if order items can be fulfilled
router.post('/check-availability', (req: Request, res: Response): void => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    res.status(400).json({ error: 'Items array is required' });
    return;
  }

  const db = DataStore.getData();
  const requiredStock: Record<string, number> = {};

  for (const item of items) {
    const qty = item.quantity || 1;
    if (item.customConfig) {
      const { base, sauce, cheese, veggies } = item.customConfig;
      if (base?.id) requiredStock[base.id] = (requiredStock[base.id] || 0) + qty;
      if (sauce?.id) requiredStock[sauce.id] = (requiredStock[sauce.id] || 0) + qty;
      if (cheese?.id) requiredStock[cheese.id] = (requiredStock[cheese.id] || 0) + qty;
      if (Array.isArray(veggies)) {
        for (const v of veggies) {
          if (v?.id) requiredStock[v.id] = (requiredStock[v.id] || 0) + qty;
        }
      }
    } else {
      // Standard signature pizza default mappings
      const pizza = db.pizzas.find((p) => p.id === item.id);
      if (pizza) {
        if (pizza.defaultCrust) requiredStock[pizza.defaultCrust] = (requiredStock[pizza.defaultCrust] || 0) + qty;
        if (pizza.defaultSauce) requiredStock[pizza.defaultSauce] = (requiredStock[pizza.defaultSauce] || 0) + qty;
        if (pizza.defaultCheese) requiredStock[pizza.defaultCheese] = (requiredStock[pizza.defaultCheese] || 0) + qty;
        if (Array.isArray(pizza.defaultVeggies)) {
          for (const vId of pizza.defaultVeggies) {
            requiredStock[vId] = (requiredStock[vId] || 0) + qty;
          }
        }
      }
    }
  }

  const unavailableItems: Array<{ id: string; name: string; requested: number; available: number }> = [];
  for (const [id, reqQty] of Object.entries(requiredStock)) {
    const inv = db.inventory.find((i) => i.id === id);
    if (!inv || inv.stock < reqQty) {
      unavailableItems.push({
        id,
        name: inv?.name || id,
        requested: reqQty,
        available: inv?.stock || 0,
      });
    }
  }

  if (unavailableItems.length > 0) {
    res.status(409).json({
      available: false,
      message: 'Some ingredients have insufficient stock to fulfill your pizza selection.',
      unavailableItems,
    });
    return;
  }

  res.json({ available: true, message: 'All ingredients available in stock.' });
});

// POST /api/inventory/adjust-stock - Admin manual stock adjustment
router.post('/adjust-stock', authenticateJWT, requireAdmin, (req: AuthRequest, res: Response): void => {
  const { itemId, amount, newStock } = req.body;
  if (!itemId) {
    res.status(400).json({ error: 'Item ID is required' });
    return;
  }

  const db = DataStore.getData();
  const item = db.inventory.find((i) => i.id === itemId);
  if (!item) {
    res.status(404).json({ error: 'Inventory item not found' });
    return;
  }

  if (typeof newStock === 'number') {
    item.stock = Math.max(0, newStock);
  } else if (typeof amount === 'number') {
    item.stock = Math.max(0, item.stock + amount);
  }

  DataStore.saveToDisk();

  // Run low stock audit to evaluate alerts
  runLowStockAudit();

  res.json({
    message: `Stock updated for ${item.name}`,
    item,
  });
});

// PUT /api/inventory/update-item - Admin edit threshold, price, details
router.put('/update-item', authenticateJWT, requireAdmin, (req: AuthRequest, res: Response): void => {
  const { id, name, stock, threshold, price } = req.body;
  if (!id) {
    res.status(400).json({ error: 'Item ID is required' });
    return;
  }

  const db = DataStore.getData();
  const item = db.inventory.find((i) => i.id === id);
  if (!item) {
    res.status(404).json({ error: 'Inventory item not found' });
    return;
  }

  if (typeof name === 'string') item.name = name;
  if (typeof stock === 'number') item.stock = Math.max(0, stock);
  if (typeof threshold === 'number') item.threshold = Math.max(0, threshold);
  if (typeof price === 'number') item.price = Math.max(0, price);

  DataStore.saveToDisk();
  res.json({ message: 'Item details updated', item });
});

// POST /api/inventory/trigger-cron - Trigger manual node-cron check
router.post('/trigger-cron', (req: Request, res: Response): void => {
  const result = runLowStockAudit();
  res.json({
    message: 'Manual Node-Cron inventory audit completed',
    result,
  });
});

export default router;
