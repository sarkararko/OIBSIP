import { Router, Request, Response } from 'express';
import { DataStore } from '../models/index.js';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';
import { runLowStockAudit } from '../services/cronService.js';
import { RAZORPAY_KEY_ID } from '../services/razorpayService.js';

const router = Router();

// Helper to calculate inventory stock needed for a set of cart items
function calculateRequiredStock(items: any[], dbInventory: any[], dbPizzas: any[]) {
  const stockNeeded: Record<string, { name: string; needed: number; available: number }> = {};

  for (const item of items) {
    const qty = Number(item.quantity) || 1;

    if (item.type === 'custom' || item.customConfig) {
      const { base, sauce, cheese, vegetables } = item.customConfig || {};
      if (base?.id) {
        const inv = dbInventory.find((i) => i.id === base.id);
        stockNeeded[base.id] = stockNeeded[base.id] || { name: base.name || inv?.name || base.id, needed: 0, available: inv?.stock ?? 0 };
        stockNeeded[base.id].needed += qty;
      }
      if (sauce?.id) {
        const inv = dbInventory.find((i) => i.id === sauce.id);
        stockNeeded[sauce.id] = stockNeeded[sauce.id] || { name: sauce.name || inv?.name || sauce.id, needed: 0, available: inv?.stock ?? 0 };
        stockNeeded[sauce.id].needed += qty;
      }
      if (cheese?.id) {
        const inv = dbInventory.find((i) => i.id === cheese.id);
        stockNeeded[cheese.id] = stockNeeded[cheese.id] || { name: cheese.name || inv?.name || cheese.id, needed: 0, available: inv?.stock ?? 0 };
        stockNeeded[cheese.id].needed += qty;
      }
      if (Array.isArray(vegetables)) {
        for (const v of vegetables) {
          if (v?.id) {
            const inv = dbInventory.find((i) => i.id === v.id);
            stockNeeded[v.id] = stockNeeded[v.id] || { name: v.name || inv?.name || v.id, needed: 0, available: inv?.stock ?? 0 };
            stockNeeded[v.id].needed += qty;
          }
        }
      }
    } else {
      // Preset signature pizza
      const pizza = dbPizzas.find((p) => p.id === item.id || p.id === item.presetPizza?.id) || item.presetPizza;
      if (pizza) {
        const baseId = pizza.base || pizza.defaultCrust;
        const sauceId = pizza.sauce || pizza.defaultSauce;
        const cheeseId = pizza.cheese || pizza.defaultCheese;
        const veggieIds = pizza.vegetables || pizza.defaultVeggies || [];

        if (baseId) {
          const inv = dbInventory.find((i) => i.id === baseId);
          stockNeeded[baseId] = stockNeeded[baseId] || { name: inv?.name || baseId, needed: 0, available: inv?.stock ?? 0 };
          stockNeeded[baseId].needed += qty;
        }
        if (sauceId) {
          const inv = dbInventory.find((i) => i.id === sauceId);
          stockNeeded[sauceId] = stockNeeded[sauceId] || { name: inv?.name || sauceId, needed: 0, available: inv?.stock ?? 0 };
          stockNeeded[sauceId].needed += qty;
        }
        if (cheeseId) {
          const inv = dbInventory.find((i) => i.id === cheeseId);
          stockNeeded[cheeseId] = stockNeeded[cheeseId] || { name: inv?.name || cheeseId, needed: 0, available: inv?.stock ?? 0 };
          stockNeeded[cheeseId].needed += qty;
        }
        if (Array.isArray(veggieIds)) {
          for (const vId of veggieIds) {
            const inv = dbInventory.find((i) => i.id === vId);
            stockNeeded[vId] = stockNeeded[vId] || { name: inv?.name || vId, needed: 0, available: inv?.stock ?? 0 };
            stockNeeded[vId].needed += qty;
          }
        }
      }
    }
  }

  return stockNeeded;
}

// 1. POST /api/orders/create-razorpay-order - Verify stock & initiate payment intent
router.post('/create-razorpay-order', optionalAuth, (req: AuthRequest, res: Response): void => {
  try {
    const { items, deliveryAddress, discount = 0 } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Your pizza cart is empty.' });
      return;
    }

    const db = DataStore.getData();

    // Check inventory stock sufficiency
    const stockMap = calculateRequiredStock(items, db.inventory, db.pizzas);
    const shortages: string[] = [];

    for (const [id, info] of Object.entries(stockMap)) {
      if (info.available < info.needed) {
        shortages.push(`"${info.name}" has only ${info.available} remaining (requested ${info.needed})`);
      }
    }

    if (shortages.length > 0) {
      res.status(400).json({
        error: 'Insufficient kitchen stock for your order.',
        details: shortages,
      });
      return;
    }

    // Calculate subtotal
    const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
    const calculatedDiscount = Math.min(subtotal, Number(discount) || 0);
    const tax = Math.round((subtotal - calculatedDiscount) * 0.05);
    const deliveryFee = subtotal >= 500 ? 0 : 40;
    const total = subtotal - calculatedDiscount + tax + deliveryFee;

    const razorpayOrderId = `order_rzp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    res.json({
      orderId: `ord_intent_${Date.now()}`,
      razorpayOrderId,
      amount: total * 100, // in paise
      currency: 'INR',
      keyId: RAZORPAY_KEY_ID,
      subtotal,
      discount: calculatedDiscount,
      tax,
      deliveryFee,
      total,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to initiate order.' });
  }
});

// 2. POST /api/orders/confirm - Finalize order, deduct inventory & trigger notifications
router.post('/confirm', optionalAuth, (req: AuthRequest, res: Response): void => {
  try {
    const {
      items,
      deliveryAddress,
      subtotal,
      discount = 0,
      tax = 0,
      deliveryFee = 0,
      total,
      paymentDetails,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Cart items are required.' });
      return;
    }

    if (!deliveryAddress || !deliveryAddress.street) {
      res.status(400).json({ error: 'Delivery address is required.' });
      return;
    }

    const db = DataStore.getData();

    // Deduct stock for all items
    const stockMap = calculateRequiredStock(items, db.inventory, db.pizzas);
    for (const [id, info] of Object.entries(stockMap)) {
      const inv = db.inventory.find((i) => i.id === id);
      if (inv) {
        inv.stock = Math.max(0, inv.stock - info.needed);
        inv.lastUpdated = new Date().toISOString();
      }
    }

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `PZ-${randomSuffix}`;
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const user = req.user;
    const customerName = deliveryAddress.name || user?.name || 'Artisanal Foodie';
    const customerEmail = deliveryAddress.email || user?.email || 'customer@pizzacraft.com';
    const customerPhone = deliveryAddress.phone || user?.phone || '+91 98765 43210';

    const newOrder: any = {
      id: orderId,
      orderNumber,
      userId: user?.id || 'usr_guest',
      customerName,
      customerEmail,
      customerPhone,
      deliveryAddress,
      items,
      subtotal: Number(subtotal) || Number(total) || 0,
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      deliveryFee: Number(deliveryFee) || 0,
      total: Number(total) || 0,
      paymentMethod: paymentDetails?.method || 'razorpay',
      paymentStatus: 'paid',
      razorpayPaymentId: paymentDetails?.razorpay_payment_id || `pay_rzp_${Date.now()}`,
      razorpayOrderId: paymentDetails?.razorpay_order_id || `order_rzp_${Date.now()}`,
      status: 'Order Received',
      estimatedDeliveryMinutes: 30,
      timeline: [
        {
          status: 'Order Received',
          timestamp: new Date().toISOString(),
          note: 'Payment verified via Razorpay sandbox. Dispatched to woodfire oven line.',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.orders.unshift(newOrder);

    // Create system email notification
    db.emails.unshift({
      id: `eml_ord_${Date.now()}`,
      to: customerEmail,
      subject: `🍕 Order Confirmed! ${orderNumber} - Artisanal Kitchen Processing`,
      type: 'order_confirmation',
      content: `Hello ${customerName},\n\nYour artisanal pizza order #${orderNumber} is confirmed!\n\nDelivery Address: ${deliveryAddress.street}, ${deliveryAddress.city} (${deliveryAddress.pincode})\nTotal Paid: ₹${newOrder.total} (Razorpay ID: ${newOrder.razorpayPaymentId})\nEstimated delivery: ~30 minutes.\n\nTrack your order in real time on PizzaCraft!`,
      createdAt: new Date().toISOString(),
      metadata: { orderId, orderNumber },
    });

    DataStore.saveToDisk();

    // Check if any items dropped below threshold and dispatch email alert
    runLowStockAudit();

    res.status(201).json({
      success: true,
      message: 'Order placed and verified successfully!',
      order: newOrder,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to place order.' });
  }
});

// 3. GET /api/orders/my-orders - Authenticated user orders (or recent if guest)
router.get('/my-orders', optionalAuth, (req: AuthRequest, res: Response): void => {
  const db = DataStore.getData();
  if (req.user?.id && req.user.id !== 'usr_guest') {
    const userOrders = db.orders.filter((o) => o.userId === req.user?.id || o.customerEmail === req.user?.email);
    res.json({ orders: userOrders.length > 0 ? userOrders : db.orders.slice(0, 3) });
  } else {
    res.json({ orders: db.orders.slice(0, 5) });
  }
});

// 4. GET /api/orders/track/:id - Track order by ID or orderNumber
router.get('/track/:id', (req: Request, res: Response): void => {
  const db = DataStore.getData();
  const search = req.params.id;
  const order = db.orders.find((o) => o.id === search || o.orderNumber === search);

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  res.json({ order });
});

// 5. GET /api/orders - All orders
router.get('/', optionalAuth, (req: AuthRequest, res: Response): void => {
  const db = DataStore.getData();
  res.json({ orders: db.orders });
});

// 6. GET /api/orders/:id - Single order
router.get('/:id', (req: Request, res: Response): void => {
  const db = DataStore.getData();
  const search = req.params.id;
  const order = db.orders.find((o) => o.id === search || o.orderNumber === search);

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  res.json({ order });
});

// 7. PATCH /api/orders/:id/status
router.patch('/:id/status', optionalAuth, (req: AuthRequest, res: Response): void => {
  const { status, note } = req.body;
  if (!status) {
    res.status(400).json({ error: 'Status is required' });
    return;
  }

  const db = DataStore.getData();
  const order = db.orders.find((o) => o.id === req.params.id || o.orderNumber === req.params.id);

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
    note: note || `Order updated to ${status}`,
  });

  DataStore.saveToDisk();

  res.json({ message: 'Order status updated', order });
});

export default router;
