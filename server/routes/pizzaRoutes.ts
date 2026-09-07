import { Router, Request, Response } from 'express';
import { DataStore } from '../models/index.js';

const router = Router();

// GET /api/pizzas - List signature artisanal pizzas
router.get('/', (req: Request, res: Response): void => {
  const db = DataStore.getData();
  res.json({
    pizzas: db.pizzas,
    presetPizzas: db.pizzas,
  });
});

// GET /api/pizzas/builder-options - Ingredients separated by category for custom pizza builder
router.get('/builder-options', (req: Request, res: Response): void => {
  const db = DataStore.getData();
  const bases = db.inventory.filter((i) => i.category === 'base');
  const sauces = db.inventory.filter((i) => i.category === 'sauce');
  const cheeses = db.inventory.filter((i) => i.category === 'cheese');
  const vegetables = db.inventory.filter((i) => i.category === 'vegetable' || i.category === 'veggie');

  res.json({
    bases,
    sauces,
    cheeses,
    vegetables,
    veggies: vegetables,
    pricingRules: {
      basePizzaPrice: 299,
      sizeMultipliers: {
        'Regular (8")': 0.85,
        'Medium (10")': 1.0,
        'Large (12")': 1.35,
      },
    },
  });
});

// POST /api/pizzas/calculate-price - Server-side price calculation and ingredient verification
router.post('/calculate-price', (req: Request, res: Response): void => {
  try {
    const { size, baseId, sauceId, cheeseId, veggieIds } = req.body;
    const db = DataStore.getData();

    const base = db.inventory.find((i) => i.id === baseId);
    const sauce = db.inventory.find((i) => i.id === sauceId);
    const cheese = db.inventory.find((i) => i.id === cheeseId);
    const selectedVeggies = (veggieIds || [])
      .map((vid: string) => db.inventory.find((i) => i.id === vid))
      .filter(Boolean);

    let baseCrustCost = 299 + (base?.price || 0);
    const sauceCost = sauce?.price || 0;
    const cheeseCost = cheese?.price || 0;
    const veggiesCost = selectedVeggies.reduce((sum: number, v: any) => sum + (v?.price || 0), 0);

    const subtotal = baseCrustCost + sauceCost + cheeseCost + veggiesCost;
    const multiplier =
      size === 'Large (12")' ? 1.35 : size === 'Regular (8")' ? 0.85 : 1.0;

    const finalPrice = Math.round(subtotal * multiplier);

    res.json({
      price: finalPrice,
      breakdown: {
        basePrice: 299,
        baseUpgrade: base?.price || 0,
        sauceUpgrade: sauceCost,
        cheeseUpgrade: cheeseCost,
        veggiesTotal: veggiesCost,
        sizeMultiplier: multiplier,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Price calculation failed' });
  }
});

export default router;
