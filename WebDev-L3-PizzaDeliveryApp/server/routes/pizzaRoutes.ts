import { Router, Request, Response } from 'express';
import { dbService } from '../services/dbService.js';

const router = Router();

// GET /api/pizzas - List signature artisanal pizzas
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const pizzas = await dbService.getPizzas();
    res.json({
      pizzas,
      presetPizzas: pizzas,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch pizzas' });
  }
});

// GET /api/pizzas/builder-options - Ingredients separated by category for custom pizza builder
router.get('/builder-options', async (req: Request, res: Response): Promise<void> => {
  try {
    const inventory = await dbService.getInventory();
    const bases = inventory.filter((i) => i.category === 'base');
    const sauces = inventory.filter((i) => i.category === 'sauce');
    const cheeses = inventory.filter((i) => i.category === 'cheese');
    const vegetables = inventory.filter((i) => i.category === 'vegetable' || i.category === 'veggie');

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
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch builder options' });
  }
});

// POST /api/pizzas/calculate-price - Server-side price calculation and ingredient verification
router.post('/calculate-price', async (req: Request, res: Response): Promise<void> => {
  try {
    const { size, baseId, sauceId, cheeseId, veggieIds } = req.body;
    const inventory = await dbService.getInventory();

    const base = inventory.find((i) => i.id === baseId);
    const sauce = inventory.find((i) => i.id === sauceId);
    const cheese = inventory.find((i) => i.id === cheeseId);
    const selectedVeggies = (veggieIds || [])
      .map((vid: string) => inventory.find((i) => i.id === vid))
      .filter(Boolean);

    const baseCrustCost = 299 + (base?.price || 0);
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
