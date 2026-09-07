import { Router, Request, Response } from 'express';
import { DataStore } from '../models/index.js';

const router = Router();

// GET /api/menu/pizzas - List signature artisanal pizzas
router.get('/pizzas', (req: Request, res: Response): void => {
  const db = DataStore.getData();
  res.json({
    presetPizzas: db.pizzas,
    pizzas: db.pizzas,
  });
});

// GET /api/menu/options - Ingredients partitioned for custom builder
router.get('/options', (req: Request, res: Response): void => {
  const db = DataStore.getData();

  const bases = db.inventory.filter((i) => i.category === 'base');
  const sauces = db.inventory.filter((i) => i.category === 'sauce');
  const cheeses = db.inventory.filter((i) => i.category === 'cheese');
  const vegetables = db.inventory.filter((i) => i.category === 'vegetable' || i.category === 'veggie');
  const extras = db.inventory.filter((i) => i.category === 'extra');

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
});

export default router;
