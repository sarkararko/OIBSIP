import { Router, Request, Response } from 'express';
import { dbService } from '../services/dbService.js';

const router = Router();

// GET /api/menu/pizzas - List signature artisanal pizzas
router.get('/pizzas', async (req: Request, res: Response): Promise<void> => {
  try {
    const pizzas = await dbService.getPizzas();
    res.json({
      presetPizzas: pizzas,
      pizzas,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch pizzas' });
  }
});

// GET /api/menu/options - Ingredients partitioned for custom builder
router.get('/options', async (req: Request, res: Response): Promise<void> => {
  try {
    const inventory = await dbService.getInventory();

    const bases = inventory.filter((i) => i.category === 'base');
    const sauces = inventory.filter((i) => i.category === 'sauce');
    const cheeses = inventory.filter((i) => i.category === 'cheese');
    const vegetables = inventory.filter((i) => i.category === 'vegetable' || i.category === 'veggie');
    const extras = inventory.filter((i) => i.category === 'extra');

    res.json({
      bases,
      sauces,
      cheeses,
      vegetables,
      veggies: vegetables,
      extras,
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
    res.status(500).json({ error: err.message || 'Failed to fetch ingredient options' });
  }
});

export default router;
