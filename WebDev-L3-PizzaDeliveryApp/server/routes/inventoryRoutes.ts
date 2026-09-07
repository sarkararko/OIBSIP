import { Router, Request, Response } from 'express';
import { dbService } from '../services/dbService.js';
import { authenticateJWT, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { runLowStockAudit } from '../services/cronService.js';

const router = Router();

// GET /api/inventory - View all stock levels & thresholds
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const inventory = await dbService.getInventory();
    const lowStockCount = inventory.filter((i) => i.stock < i.threshold).length;
    res.json({
      inventory,
      lowStockCount,
      totalSKUs: inventory.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch inventory' });
  }
});

// POST /api/inventory/check-availability - Verify if order items can be fulfilled
router.post('/check-availability', async (req: Request, res: Response): Promise<void> => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      res.status(400).json({ error: 'Items array is required' });
      return;
    }

    const inventory = await dbService.getInventory();
    const pizzas = await dbService.getPizzas();
    const requiredStock: Record<string, number> = {};

    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      if (item.customConfig) {
        const { base, sauce, cheese, vegetables, veggies } = item.customConfig;
        if (base?.id) requiredStock[base.id] = (requiredStock[base.id] || 0) + qty;
        if (sauce?.id) requiredStock[sauce.id] = (requiredStock[sauce.id] || 0) + qty;
        if (cheese?.id) requiredStock[cheese.id] = (requiredStock[cheese.id] || 0) + qty;
        const vegList = vegetables || veggies || [];
        if (Array.isArray(vegList)) {
          for (const v of vegList) {
            const vId = typeof v === 'string' ? v : v?.id;
            if (vId) requiredStock[vId] = (requiredStock[vId] || 0) + qty;
          }
        }
      } else {
        const pizza = pizzas.find((p) => p.id === item.id || p.id === item.presetPizza?.id) || item.presetPizza;
        if (pizza) {
          const baseId = pizza.base || pizza.defaultCrust;
          const sauceId = pizza.sauce || pizza.defaultSauce;
          const cheeseId = pizza.cheese || pizza.defaultCheese;
          const vegList = pizza.vegetables || pizza.defaultVeggies || [];

          if (baseId) requiredStock[baseId] = (requiredStock[baseId] || 0) + qty;
          if (sauceId) requiredStock[sauceId] = (requiredStock[sauceId] || 0) + qty;
          if (cheeseId) requiredStock[cheeseId] = (requiredStock[cheeseId] || 0) + qty;
          if (Array.isArray(vegList)) {
            for (const vId of vegList) {
              requiredStock[vId] = (requiredStock[vId] || 0) + qty;
            }
          }
        }
      }
    }

    const unavailableItems: Array<{ id: string; name: string; requested: number; available: number }> = [];
    for (const [id, reqQty] of Object.entries(requiredStock)) {
      const inv = inventory.find((i) => i.id === id);
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
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Availability check failed' });
  }
});

// POST /api/inventory/adjust-stock - Admin manual stock adjustment
router.post('/adjust-stock', authenticateJWT, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { itemId, amount, newStock } = req.body;
    if (!itemId) {
      res.status(400).json({ error: 'Item ID is required' });
      return;
    }

    const item = await dbService.getInventoryItem(itemId);
    if (!item) {
      res.status(404).json({ error: 'Inventory item not found' });
      return;
    }

    let updatedItem = null;
    if (typeof newStock === 'number') {
      updatedItem = await dbService.updateInventoryItem(itemId, { stock: Math.max(0, newStock) });
    } else if (typeof amount === 'number') {
      updatedItem = await dbService.adjustInventoryStock(itemId, amount);
    }

    // Run low stock audit to evaluate alerts
    runLowStockAudit();

    res.json({
      message: `Stock updated for ${item.name}`,
      item: updatedItem,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to adjust stock' });
  }
});

// PUT /api/inventory/update-item - Admin edit threshold, price, details
router.put('/update-item', authenticateJWT, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, name, stock, threshold, price } = req.body;
    if (!id) {
      res.status(400).json({ error: 'Item ID is required' });
      return;
    }

    const item = await dbService.getInventoryItem(id);
    if (!item) {
      res.status(404).json({ error: 'Inventory item not found' });
      return;
    }

    const updates: any = {};
    if (typeof name === 'string') updates.name = name;
    if (typeof stock === 'number') updates.stock = Math.max(0, stock);
    if (typeof threshold === 'number') updates.threshold = Math.max(0, threshold);
    if (typeof price === 'number') updates.price = Math.max(0, price);

    const updated = await dbService.updateInventoryItem(id, updates);
    res.json({ message: 'Item details updated', item: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update item' });
  }
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
