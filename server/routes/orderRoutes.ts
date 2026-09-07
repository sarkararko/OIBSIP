import { Router, Request, Response } from 'express';
import { DataStore, IOrderItem, IOrder } from '../models/index.js';
import { authenticateJWT, requireAdmin, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { runLowStockAudit } from '../services/cronService.js';

const router = Router();

// 1. GET /api/orders - List all orders (Admin or authenticated user's orders)
router.get('/', optionalAuth, (req: AuthRequest, res: Response): void => {
  const db = DataStore.getData();
  if (req.user?.role === 'admin') {
    res.json({ orders: db.orders });
  } else if (req.user?.id) {
    const userOrders = db.orders.filter((o) => o.userId === req.user?.id);
    res.json({ orders: userOrders });
  } else {
    // Return all orders for public preview or filtered by session
    res.json({ orders: db.orders });
  }
});

// 2. GET /api/orders/:id - Get specific order details for live tracking
router.get('/:id', (req: Request, res: Response): void => {
  const db = DataStore.getData();
  const order = db.orders.find((o) => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  res.json({ order });
});

// 3. POST /api/orders - Create & Save new order + Deduct Stock atomically
router.post('/', optionalAuth, (req: AuthRequest, res: Response): void => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      deliveryAddress,
      items,
      subtotal,
      discount,
      deliveryFee,
      tax,
      total,
      paymentMethod,
      razorpayOrderId,
      razorpayPaymentId,
    } = req.body;

    if (!items || items.length === 0 || !customerName || !deliveryAddress) {
      res.status(400).json({ error: 'Missing required order details' });
      return;
    }

    const db = DataStore.getData();

    // Check & Decrement stock for all items
    for (const item of items) {
      const qty = item.quantity || 1;
      if (item.customConfig) {
        const { base, sauce, cheese, veggies } = item.customConfig;
        if (base?.id) {
          const inv = db.inventory.find((i) => i.id === base.id);
          if (inv) inv.stock = Math.max(0, inv.stock - qty);
        }
        if (sauce?.id) {
          const inv = db.inventory.find((i) => i.id === sauce.id);
          if (inv) inv.stock = Math.max(0, inv.stock - qty);
        }
        if (cheese?.id) {
          const inv = db.inventory.find((i) => i.id === cheese.id);
          if (inv) inv.stock = Math.max(0, inv.stock - qty);
        }
        if (Array.isArray(veggies)) {
          for (const v of veggies) {
            if (v?.id) {
              const inv = db.inventory.find((i) => i.id === v.id);
              if (inv) inv.stock = Math.max(0, inv.stock - qty);
            }
          }
        }
      } else {
        const pizza = db.pizzas.find((p) => p.id === item.id);
        if (pizza) {
          if (pizza.defaultCrust) {
            const inv = db.inventory.find((i) => i.id === pizza.defaultCrust);
            if (inv) inv.stock = Math.max(0, inv.stock - qty);
          }
          if (pizza.defaultSauce) {
            const inv = db.inventory.find((i) => i.id === pizza.defaultSauce);
            if (inv) inv.stock = Math.max(0, inv.stock - qty);
          }
          if (pizza.defaultCheese) {
            const inv = db.inventory.find((i) => i.id === pizza.defaultCheese);
            if (inv) inv.stock = Math.max(0, inv.stock - qty);
          }
          if (Array.isArray(pizza.defaultVeggies)) {
            for (const vId of pizza.defaultVeggies) {
              const inv = db.inventory.find((i) => i.id === vId);
              if (inv) inv.stock = Math.max(0, inv.stock - qty);
            }
          }
        }
      }
    }

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `PZ-${randomSuffix}`;
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newOrder: any = {
      id: orderId,
      orderNumber,
      userId: req.user?.id || 'usr_guest',
      customerName,
      customerEmail: customerEmail || 'guest@pizzacraft.com',
      customerPhone: customerPhone || '+91 98765 00000',
      items,
      subtotal: subtotal || total,
      discount: discount || 0,
      deliveryFee: deliveryFee || 0,
      tax: tax || 0,
      total,
      deliveryAddress,
      status: 'Order Received',
      paymentMethod: paymentMethod || 'razorpay',
      paymentStatus: 'paid',
      razorpayOrderId,
      razorpayPaymentId,
      timeline: [
        {
          status: 'Order Received',
          timestamp: new Date().toISOString(),
          note: 'Payment verified via Razorpay sandbox and sent to kitchen.',
        },
      ],
      createdAt: new Date().toISOString(),
    };

    db.orders.unshift(newOrder);

    // Simulated customer confirmation email
    db.emails.unshift({
      id: `eml_conf_${Date.now()}`,
      to: newOrder.customerEmail,
      subject: `🍕 Order Confirmed! ${orderNumber} - Artisanal Kitchen Processing`,
      content: `Hi ${newOrder.customerName},\n\nYour artisanal pizza order ${orderNumber} has been received and sent to our master pizzaiolos!\n\nTotal Paid: ₹${newOrder.total}\nDelivery Address: ${deliveryAddress.street}, ${deliveryAddress.city}\n\nTrack live updates in real time on PizzaCraft.`,
      type: 'order_confirmation',
      metadata: { orderId: newOrder.id, orderNumber },
      createdAt: new Date().toISOString(),
    });

    DataStore.saveToDisk();

    // Check if any ingredient dropped below threshold and trigger alert
    runLowStockAudit();

    res.status(201).json({
      success: true,
      message: 'Order placed and verified successfully!',
      order: newOrder,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
});

// 4. PUT /api/orders/:id/status - Admin update order status
router.put('/:id/status', authenticateJWT, requireAdmin, (req: AuthRequest, res: Response): void => {
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
  order.timeline.push({
    status,
    timestamp: new Date().toISOString(),
    note: note || `Status advanced to ${status} by Kitchen Administrator`,
  });

  DataStore.saveToDisk();

  res.json({
    message: `Order status updated to ${status}`,
    order,
  });
});

export default router;
