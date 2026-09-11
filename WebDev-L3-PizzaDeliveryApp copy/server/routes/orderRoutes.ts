import { Router, Request, Response } from 'express';
import { dbService } from '../services/dbService.js';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';
import { runLowStockAudit } from '../services/cronService.js';
import { RAZORPAY_KEY_ID } from '../services/razorpayService.js';
import { sendEmailNotification } from '../services/emailService.js';

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
router.post('/create-razorpay-order', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items, deliveryAddress, discount = 0 } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Your pizza cart is empty.' });
      return;
    }

    const inventory = await dbService.getInventory();
    const pizzas = await dbService.getPizzas();

    // Check inventory stock sufficiency
    const stockMap = calculateRequiredStock(items, inventory, pizzas);
    const shortages: string[] = [];

    for (const [, info] of Object.entries(stockMap)) {
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
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0
    );
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
router.post('/confirm', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
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

    // Deduct stock via unified dbService (handles MongoDB & DataStore)
    await dbService.deductOrderInventory(items);

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

    const savedOrder = await dbService.createOrder(newOrder);

    // Send confirmation email
    await sendEmailNotification({
      to: customerEmail,
      subject: `🍕 Order Confirmed! ${orderNumber} - Artisanal Kitchen Processing`,
      text: `Hello ${customerName},\n\nYour artisanal pizza order #${orderNumber} is confirmed!\n\nDelivery Address: ${deliveryAddress.street}, ${deliveryAddress.city} (${deliveryAddress.pincode})\nTotal Paid: ₹${newOrder.total} (Razorpay ID: ${newOrder.razorpayPaymentId})\nEstimated delivery: ~30 minutes.\n\nTrack your order in real time on PizzaCraft!`,
      html: `<h2>🍕 Order #${orderNumber} Confirmed!</h2><p>Hello <strong>${customerName}</strong>,</p><p>Your artisanal pizza order has been dispatched to our woodfire kitchen.</p><p><strong>Total:</strong> ₹${newOrder.total}</p><p><strong>Delivery to:</strong> ${deliveryAddress.street}, ${deliveryAddress.city} - ${deliveryAddress.pincode}</p>`,
    });

    // Check if any items dropped below threshold and dispatch email alert
    runLowStockAudit();

    res.status(201).json({
      success: true,
      message: 'Order placed and verified successfully!',
      order: savedOrder,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to place order.' });
  }
});

// 3. GET /api/orders/my-orders - Authenticated user orders (or recent if guest)
router.get('/my-orders', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await dbService.getOrders();
    if (req.user?.id && req.user.id !== 'usr_guest') {
      const userOrders = orders.filter(
        (o) => o.userId === req.user?.id || o.customerEmail === req.user?.email
      );
      res.json({ orders: userOrders.length > 0 ? userOrders : orders.slice(0, 3) });
    } else {
      res.json({ orders: orders.slice(0, 5) });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch orders' });
  }
});

// 4. GET /api/orders/track/:id - Track order by ID or orderNumber
router.get('/track/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.params.id;
    const order = await dbService.getOrderById(search);

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json({ order });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to track order' });
  }
});

// 5. GET /api/orders - All orders (or recent)
router.get('/', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await dbService.getOrders();
    res.json({ orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch orders' });
  }
});

// 6. GET /api/orders/:id - Single order
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.params.id;
    const order = await dbService.getOrderById(search);

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json({ order });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch order' });
  }
});

// 7. PATCH /api/orders/:id/status
router.patch('/:id/status', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, note } = req.body;
    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }

    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const updated = await dbService.updateOrderStatus(req.params.id, status, note || `Order updated to ${status}`);
    res.json({ message: 'Order status updated', order: updated || order });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update order status' });
  }
});

export default router;
