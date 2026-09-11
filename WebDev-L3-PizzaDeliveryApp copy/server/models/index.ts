import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { DATA_FILE } from '../config/db.js';
import { UserModel, IUser } from './User.js';
import { AdminModel, IAdmin } from './Admin.js';
import { PizzaModel, IPizza } from './Pizza.js';
import { IngredientModel, IIngredient } from './Ingredient.js';
import { OrderModel, IOrder } from './Order.js';
import { VerificationTokenModel, IVerificationToken } from './VerificationToken.js';
import { PasswordResetTokenModel, IPasswordResetToken } from './PasswordResetToken.js';

export * from './User.js';
export * from './Admin.js';
export * from './Pizza.js';
export * from './Ingredient.js';
export * from './Order.js';
export * from './VerificationToken.js';
export * from './PasswordResetToken.js';

export interface ISystemEmail {
  id: string;
  to: string;
  subject: string;
  content: string;
  type: 'verification' | 'password_reset' | 'low_stock_alert' | 'order_confirmation';
  metadata?: any;
  read?: boolean;
  createdAt: string;
}

export interface IServerData {
  users: any[];
  admins: any[];
  inventory: any[];
  pizzas: any[];
  orders: any[];
  verificationTokens: any[];
  passwordResetTokens: any[];
  emails: ISystemEmail[];
}

export const INITIAL_INVENTORY = [
  // 5 Pizza Bases
  { id: 'base_hand_tossed', name: 'Classic Hand Tossed', category: 'base', stock: 50, threshold: 15, unit: 'crusts', price: 0, isVeg: true, description: 'Fresh stone-baked dough hand-tossed to perfection with airy crust.', badge: 'Classic' },
  { id: 'base_thin_crust', name: 'Thin Crust', category: 'base', stock: 45, threshold: 15, unit: 'crusts', price: 0, isVeg: true, description: 'Crisp, lightweight Italian-style thin crust baked crisp in stone oven.', badge: 'Crispy' },
  { id: 'base_cheese_burst', name: 'Cheese Burst', category: 'base', stock: 35, threshold: 10, unit: 'crusts', price: 99, isVeg: true, description: 'Molten liquid mozzarella & cheddar core loaded inside double crust.', badge: '+₹99' },
  { id: 'base_whole_wheat', name: 'Whole Wheat', category: 'base', stock: 30, threshold: 10, unit: 'crusts', price: 49, isVeg: true, description: 'Wholesome stone-ground 100% whole wheat crust with nutty flavor.', badge: '+₹49' },
  { id: 'base_stuffed_crust', name: 'Stuffed Crust', category: 'base', stock: 25, threshold: 10, unit: 'crusts', price: 89, isVeg: true, description: 'Outer ring stuffed with seasoned herbs and molten garlic cheese.', badge: '+₹89' },

  // 5 Sauces
  { id: 'sauce_classic_tomato', name: 'Classic Tomato', category: 'sauce', stock: 60, threshold: 20, unit: 'portions', price: 0, isVeg: true, description: 'Simmered crushed Italian tomatoes with olive oil, basil, and sea salt.' },
  { id: 'sauce_bbq', name: 'BBQ Sauce', category: 'sauce', stock: 40, threshold: 15, unit: 'portions', price: 29, isVeg: true, description: 'Hickory-smoked sweet and tangy artisanal barbecue sauce glaze.' },
  { id: 'sauce_pesto', name: 'Pesto', category: 'sauce', stock: 35, threshold: 12, unit: 'portions', price: 49, isVeg: true, description: 'Fresh basil leaves, roasted pine nuts, parmesan and extra virgin olive oil.' },
  { id: 'sauce_garlic_butter', name: 'Garlic Butter', category: 'sauce', stock: 35, threshold: 12, unit: 'portions', price: 39, isVeg: true, description: 'Rich clarified butter infused with slow-roasted caramelized garlic.' },
  { id: 'sauce_spicy_arrabbiata', name: 'Spicy Arrabbiata', category: 'sauce', stock: 40, threshold: 15, unit: 'portions', price: 29, isVeg: true, description: 'Fiery sun-ripened tomato reduction slow-cooked with red chili flakes.' },

  // 5 Cheeses
  { id: 'cheese_mozzarella', name: 'Mozzarella', category: 'cheese', stock: 55, threshold: 20, unit: 'portions', price: 0, isVeg: true, description: 'Traditional creamy whole-milk mozzarella with classic golden stretch.' },
  { id: 'cheese_cheddar', name: 'Cheddar', category: 'cheese', stock: 35, threshold: 12, unit: 'portions', price: 49, isVeg: true, description: 'Sharp English yellow cheddar offering intense savory richness.' },
  { id: 'cheese_parmesan', name: 'Parmesan', category: 'cheese', stock: 30, threshold: 10, unit: 'portions', price: 59, isVeg: true, description: 'Aged hard Parmigiano style cheese with delicate savory crystals.' },
  { id: 'cheese_ricotta', name: 'Ricotta', category: 'cheese', stock: 25, threshold: 10, unit: 'portions', price: 69, isVeg: true, description: 'Fluffy, mild and creamy whipped Italian whey ricotta cheese.' },
  { id: 'cheese_vegan', name: 'Vegan Cheese', category: 'cheese', stock: 25, threshold: 8, unit: 'portions', price: 59, isVeg: true, description: '100% plant-based dairy-free cheese that melts and bubbles evenly.' },

  // 7 Vegetables
  { id: 'veg_onion', name: 'Onion', category: 'vegetable', stock: 70, threshold: 20, unit: 'portions', price: 25, isVeg: true, description: 'Fresh crisp sliced red onions roasted sweet and caramelized.' },
  { id: 'veg_bell_pepper', name: 'Bell Pepper', category: 'vegetable', stock: 65, threshold: 20, unit: 'portions', price: 29, isVeg: true, description: 'Crisp, vibrant tricolor sweet bell peppers chopped fresh daily.' },
  { id: 'veg_mushroom', name: 'Mushroom', category: 'vegetable', stock: 45, threshold: 15, unit: 'portions', price: 39, isVeg: true, description: 'Plump button and cremini mushrooms sautéed lightly in olive oil.' },
  { id: 'veg_tomato', name: 'Tomato', category: 'vegetable', stock: 60, threshold: 20, unit: 'portions', price: 25, isVeg: true, description: 'Juicy ripe diced tomatoes delivering fresh acidity and flavor.' },
  { id: 'veg_black_olive', name: 'Black Olive', category: 'vegetable', stock: 55, threshold: 18, unit: 'portions', price: 35, isVeg: true, description: 'Sliced tender black olives with rich Mediterranean brine.' },
  { id: 'veg_jalapeno', name: 'Jalapeno', category: 'vegetable', stock: 50, threshold: 15, unit: 'portions', price: 29, isVeg: true, description: 'Pickled Mexican jalapeño wheels offering tangy spicy kick.' },
  { id: 'veg_sweet_corn', name: 'Sweet Corn', category: 'vegetable', stock: 60, threshold: 20, unit: 'portions', price: 25, isVeg: true, description: 'Golden tender sweet corn kernels adding sweetness and crunch.' }
];

export const INITIAL_PIZZAS = [
  {
    id: 'pizza_margherita_classica',
    name: 'Margherita Verace D.O.P.',
    tagline: 'Chef Signature',
    category: 'Veg',
    description: 'Classic Hand Tossed crust, rich Classic Tomato sauce, fresh golden Mozzarella, and ripe sweet Tomatoes.',
    price: 349,
    basePrice: 349,
    isVeg: true,
    isBestSeller: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    badge: 'Chef Signature',
    base: 'base_hand_tossed',
    sauce: 'sauce_classic_tomato',
    cheese: 'cheese_mozzarella',
    vegetables: ['veg_tomato'],
    defaultCrust: 'base_hand_tossed',
    defaultSauce: 'sauce_classic_tomato',
    defaultCheese: 'cheese_mozzarella',
    defaultVeggies: ['veg_tomato']
  },
  {
    id: 'pizza_farmhouse_delight',
    name: 'Farmhouse Garden Special',
    tagline: 'Bestseller',
    category: 'Veg',
    description: 'Classic Hand Tossed crust, Classic Tomato sauce, Mozzarella, topped with crisp Onion, Bell Pepper, Mushroom, and Sweet Corn.',
    price: 449,
    basePrice: 449,
    isVeg: true,
    isBestSeller: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80',
    rating: 4.92,
    badge: 'Bestseller',
    base: 'base_hand_tossed',
    sauce: 'sauce_classic_tomato',
    cheese: 'cheese_mozzarella',
    vegetables: ['veg_onion', 'veg_bell_pepper', 'veg_mushroom', 'veg_sweet_corn'],
    defaultCrust: 'base_hand_tossed',
    defaultSauce: 'sauce_classic_tomato',
    defaultCheese: 'cheese_mozzarella',
    defaultVeggies: ['veg_onion', 'veg_bell_pepper', 'veg_mushroom', 'veg_sweet_corn']
  },
  {
    id: 'pizza_fiery_arrabbiata',
    name: 'Fiery Arrabbiata Primavera',
    tagline: 'Spicy Fire-Roasted',
    category: 'Chef Special',
    description: 'Thin Crust, fire-roasted Spicy Arrabbiata sauce, melted Mozzarella, loaded with Onion, Bell Pepper, and spicy Jalapenos.',
    price: 479,
    basePrice: 479,
    isVeg: true,
    isBestSeller: false,
    isSpicy: true,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80',
    rating: 4.85,
    badge: 'Spicy ★★★',
    base: 'base_thin_crust',
    sauce: 'sauce_spicy_arrabbiata',
    cheese: 'cheese_mozzarella',
    vegetables: ['veg_onion', 'veg_bell_pepper', 'veg_jalapeno'],
    defaultCrust: 'base_thin_crust',
    defaultSauce: 'sauce_spicy_arrabbiata',
    defaultCheese: 'cheese_mozzarella',
    defaultVeggies: ['veg_onion', 'veg_bell_pepper', 'veg_jalapeno']
  },
  {
    id: 'pizza_quattro_formaggi',
    name: 'Quattro Formaggi Deluxe',
    tagline: 'Cheese Lovers',
    category: 'Gourmet',
    description: 'Molten Cheese Burst crust, savory Garlic Butter sauce, quad-cheese blend of Mozzarella, Cheddar, Parmesan & Ricotta with Black Olives.',
    price: 579,
    basePrice: 579,
    isVeg: true,
    isBestSeller: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1573821663912-569905455b1c?w=800&auto=format&fit=crop&q=80',
    rating: 4.88,
    badge: 'Cheese Burst',
    base: 'base_cheese_burst',
    sauce: 'sauce_garlic_butter',
    cheese: 'cheese_cheddar',
    vegetables: ['veg_black_olive'],
    defaultCrust: 'base_cheese_burst',
    defaultSauce: 'sauce_garlic_butter',
    defaultCheese: 'cheese_cheddar',
    defaultVeggies: ['veg_black_olive']
  },
  {
    id: 'pizza_pesto_artisan',
    name: 'Genovese Pesto Verdure',
    tagline: 'Premium Reserve',
    category: 'Gourmet',
    description: 'Whole Wheat crust, fragrant Genovese Pesto sauce, rich Mozzarella, Tomato slices, sautéed Mushrooms, and Black Olives.',
    price: 529,
    basePrice: 529,
    isVeg: true,
    isBestSeller: false,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&auto=format&fit=crop&q=80',
    rating: 4.96,
    badge: 'Premium Reserve',
    base: 'base_whole_wheat',
    sauce: 'sauce_pesto',
    cheese: 'cheese_mozzarella',
    vegetables: ['veg_tomato', 'veg_mushroom', 'veg_black_olive'],
    defaultCrust: 'base_whole_wheat',
    defaultSauce: 'sauce_pesto',
    defaultCheese: 'cheese_mozzarella',
    defaultVeggies: ['veg_tomato', 'veg_mushroom', 'veg_black_olive']
  },
  {
    id: 'pizza_smoky_bbq_feast',
    name: 'Smoky BBQ Stuffed Crust',
    tagline: 'Heavyweight Special',
    category: 'Chef Special',
    description: 'Stuffed Crust, rich smoky BBQ sauce, melted Cheddar, Onion, Bell Pepper, Sweet Corn, and Jalapeno slices.',
    price: 549,
    basePrice: 549,
    isVeg: true,
    isBestSeller: true,
    isSpicy: false,
    image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800&auto=format&fit=crop&q=80',
    rating: 4.89,
    badge: 'Stuffed Crust',
    base: 'base_stuffed_crust',
    sauce: 'sauce_bbq',
    cheese: 'cheese_cheddar',
    vegetables: ['veg_onion', 'veg_bell_pepper', 'veg_sweet_corn', 'veg_jalapeno'],
    defaultCrust: 'base_stuffed_crust',
    defaultSauce: 'sauce_bbq',
    defaultCheese: 'cheese_cheddar',
    defaultVeggies: ['veg_onion', 'veg_bell_pepper', 'veg_sweet_corn', 'veg_jalapeno']
  }
];

class StorageEngine {
  private data: IServerData = {
    users: [],
    admins: [],
    inventory: [],
    pizzas: [],
    orders: [],
    verificationTokens: [],
    passwordResetTokens: [],
    emails: []
  };

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);

        // Normalize inventory items
        if (Array.isArray(this.data.inventory)) {
          this.data.inventory.forEach((item: any) => {
            if (item.category === 'veggie') {
              item.category = 'vegetable';
            }
          });
        }

        // Normalize pizzas
        if (!Array.isArray(this.data.pizzas) || this.data.pizzas.length === 0) {
          this.data.pizzas = INITIAL_PIZZAS;
        } else {
          this.data.pizzas = this.data.pizzas.map((p: any) => {
            const initial = INITIAL_PIZZAS.find((ip) => ip.id === p.id);
            return {
              ...p,
              tagline: p.tagline || p.badge || initial?.tagline || 'Chef Signature',
              category: p.category || initial?.category || 'Gourmet',
              isBestSeller: p.isBestSeller ?? initial?.isBestSeller ?? false,
              isSpicy: p.isSpicy ?? initial?.isSpicy ?? false,
              base: p.base || p.defaultCrust || initial?.base || 'base_hand_tossed',
              sauce: p.sauce || p.defaultSauce || initial?.sauce || 'sauce_classic_tomato',
              cheese: p.cheese || p.defaultCheese || initial?.cheese || 'cheese_mozzarella',
              vegetables: p.vegetables || p.defaultVeggies || initial?.vegetables || ['veg_tomato'],
              defaultCrust: p.defaultCrust || p.base || initial?.defaultCrust || 'base_hand_tossed',
              defaultSauce: p.defaultSauce || p.sauce || initial?.defaultSauce || 'sauce_classic_tomato',
              defaultCheese: p.defaultCheese || p.cheese || initial?.defaultCheese || 'cheese_mozzarella',
              defaultVeggies: p.defaultVeggies || p.vegetables || initial?.defaultVeggies || ['veg_tomato'],
            };
          });
        }
        this.ensureOasisData();
        this.saveToDisk();
      } else {
        this.initDefaultData();
      }
    } catch (e) {
      this.initDefaultData();
    }
  }

  public ensureOasisData() {
    const hasOasisBase = Array.isArray(this.data.inventory) && this.data.inventory.some((i: any) => i.id === 'base_hand_tossed');
    if (!hasOasisBase || !this.data.inventory || this.data.inventory.length < 17) {
      this.data.inventory = INITIAL_INVENTORY;
      this.data.pizzas = INITIAL_PIZZAS;
      this.saveToDisk();
    }
  }

  public initDefaultData() {
    const salt = bcrypt.genSaltSync(10);
    const demoUserPasswordHash = bcrypt.hashSync('password123', salt);
    const demoAdminPasswordHash = bcrypt.hashSync('admin123', salt);

    this.data = {
      users: [
        {
          id: 'usr_demo_customer_01',
          name: 'Marco Rossi',
          email: 'user@example.com',
          passwordHash: demoUserPasswordHash,
          phone: '+91 98765 43210',
          isVerified: true,
          addresses: [
            { street: '42 Artisanal Way, Gourmet Boulevard', city: 'Mumbai', pincode: '400050', notes: 'Ring bell twice' }
          ],
          role: 'customer',
          createdAt: new Date().toISOString()
        }
      ],
      admins: [
        {
          id: 'adm_master_01',
          name: 'Executive Chef Mario',
          email: 'admin@pizzacraft.com',
          passwordHash: demoAdminPasswordHash,
          role: 'admin',
          permissions: ['all'],
          lastLogin: new Date().toISOString()
        }
      ],
      inventory: INITIAL_INVENTORY,
      pizzas: INITIAL_PIZZAS,
      orders: [
        {
          id: 'ord_demo_live_01',
          orderNumber: 'PZ-882194',
          userId: 'usr_demo_customer_01',
          customerName: 'Marco Rossi',
          customerEmail: 'user@example.com',
          customerPhone: '+91 98765 43210',
          items: [
            {
              id: 'pizza_margherita_classica',
              name: 'Margherita Verace D.O.P.',
              price: 399,
              quantity: 1,
              size: 'Medium (12")',
              image: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=800&auto=format&fit=crop&q=80',
              isCustom: false
            }
          ],
          subtotal: 399,
          discount: 0,
          deliveryFee: 0,
          tax: 20,
          total: 419,
          deliveryAddress: {
            street: '42 Artisanal Way, Gourmet Boulevard',
            city: 'Mumbai',
            pincode: '400050',
            notes: 'Leave with concierge if not answering'
          },
          status: 'In Kitchen',
          paymentMethod: 'razorpay',
          paymentStatus: 'paid',
          razorpayOrderId: 'order_demo_rzp_101',
          razorpayPaymentId: 'pay_demo_rzp_901',
          timeline: [
            { status: 'Order Received', timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(), note: 'Payment verified via Razorpay Sandbox' },
            { status: 'In Kitchen', timestamp: new Date(Date.now() - 1000 * 60 * 6).toISOString(), note: 'Dough stretched, toppings assembled and baking in stone oven at 450°C' }
          ],
          createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString()
        }
      ],
      verificationTokens: [],
      passwordResetTokens: [],
      emails: [
        {
          id: 'eml_welcome_01',
          to: 'user@example.com',
          subject: 'Welcome to PizzaCraft Artisanal! 🍕',
          content: 'Hi Marco,\n\nWelcome to PizzaCraft! Your account has been pre-verified for seamless ordering.\n\nEnjoy our slow-fermented crusts!',
          type: 'verification',
          createdAt: new Date().toISOString()
        }
      ]
    };
    this.saveToDisk();
  }

  public saveToDisk() {
    try {
      if (process.env.ENABLE_LOCAL_FILE_PERSISTENCE === 'true') {
        fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('Error saving data to disk:', err);
    }
  }

  public getData(): IServerData {
    return this.data;
  }
}

export const DataStore = new StorageEngine();
