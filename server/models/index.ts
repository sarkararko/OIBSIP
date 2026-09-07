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
  // 5 Crust Bases
  { id: 'base_sourdough', name: 'Slow-Fermented Sourdough', category: 'base', stock: 45, threshold: 15, unit: 'crusts', price: 0, isVeg: true, description: '48-hour fermented artisanal sourdough crust with crispy airy cornicione.', badge: 'Bestseller' },
  { id: 'base_thin_crust', name: 'Neapolitan Thin Crust', category: 'base', stock: 50, threshold: 15, unit: 'crusts', price: 0, isVeg: true, description: 'Traditional ultra-thin stone baked crust with leopard spotting.' },
  { id: 'base_cheese_burst', name: 'Molten Cheese Burst', category: 'base', stock: 30, threshold: 10, unit: 'crusts', price: 99, isVeg: true, description: 'Double crust packed with molten artisanal cheddar & mozzarella core.', badge: '+₹99' },
  { id: 'base_gluten_free', name: 'Gluten-Free Cauliflower Herb', category: 'base', stock: 25, threshold: 10, unit: 'crusts', price: 79, isVeg: true, description: 'Healthy low-carb crust blended with cauliflower, oregano & parmesan.', badge: '+₹79' },
  { id: 'base_pan_deep_dish', name: 'Chicago Style Deep Dish', category: 'base', stock: 35, threshold: 12, unit: 'crusts', price: 69, isVeg: true, description: 'Buttery, golden deep crust baked in seasoned iron pans.' },

  // 5 Gourmet Sauces
  { id: 'sauce_san_marzano', name: 'San Marzano Tomato & Basil', category: 'sauce', stock: 60, threshold: 20, unit: 'portions', price: 0, isVeg: true, description: 'D.O.P. Italian plum tomatoes crushed with extra virgin olive oil & fresh basil.' },
  { id: 'sauce_spicy_arrabbiata', name: 'Fire-Roasted Spicy Arrabbiata', category: 'sauce', stock: 40, threshold: 15, unit: 'portions', price: 20, isVeg: true, description: 'Sun-dried chillies and roasted garlic slow-cooked in rich tomato reduction.' },
  { id: 'sauce_basil_pesto', name: 'Genovese Basil Pine Nut Pesto', category: 'sauce', stock: 35, threshold: 12, unit: 'portions', price: 49, isVeg: true, description: 'Fresh basil leaves, toasted pine nuts, pecorino cheese and cold-pressed olive oil.' },
  { id: 'sauce_creamy_garlic_alfredo', name: 'Creamy Roasted Garlic Alfredo', category: 'sauce', stock: 30, threshold: 10, unit: 'portions', price: 39, isVeg: true, description: 'Silky rich white sauce infused with caramelized garlic and white pepper.' },
  { id: 'sauce_smoky_chipotle_bbq', name: 'Smoky Chipotle BBQ Glaze', category: 'sauce', stock: 40, threshold: 15, unit: 'portions', price: 29, isVeg: true, description: 'Sweet and tangy hickory-smoked sauce with chipotle heat.' },

  // 5 Cheeses
  { id: 'cheese_mozzarella', name: 'Fior di Latte Fresh Mozzarella', category: 'cheese', stock: 55, threshold: 20, unit: 'portions', price: 0, isVeg: true, description: 'Creamy cow milk mozzarella that stretches with golden bubbling caramelization.' },
  { id: 'cheese_burrata', name: 'Artisanal Creamy Burrata Ball', category: 'cheese', stock: 18, threshold: 10, unit: 'balls', price: 119, isVeg: true, description: 'Decadent whole burrata ball with stracciatella heart.', badge: 'Gourmet' },
  { id: 'cheese_gorgonzola', name: 'Aged Gorgonzola Blue Cheese', category: 'cheese', stock: 22, threshold: 8, unit: 'portions', price: 89, isVeg: true, description: 'Sharp, pungent Italian blue cheese for authentic depth of flavor.' },
  { id: 'cheese_smoked_scamorza', name: 'Smoked Alpine Scamorza', category: 'cheese', stock: 28, threshold: 10, unit: 'portions', price: 79, isVeg: true, description: 'Oakwood-smoked stretched curd cheese with golden aromatic rind.' },
  { id: 'cheese_vegan_cashew', name: 'Plant-Based Truffle Cashew Mozzarella', category: 'cheese', stock: 20, threshold: 8, unit: 'portions', price: 69, isVeg: true, description: '100% dairy-free artisanal nut cheese with black truffle essence.' },

  // 8 Fresh Veggies & Toppings
  { id: 'veg_cherry_tomatoes', name: 'Sun-ripened Cherry Tomatoes', category: 'veggie', stock: 70, threshold: 20, unit: 'portions', price: 29, isVeg: true, description: 'Sweet blistered heirloom cherry tomatoes burst with juiciness.' },
  { id: 'veg_kalamata_olives', name: 'Greek Kalamata Black Olives', category: 'veggie', stock: 65, threshold: 20, unit: 'portions', price: 39, isVeg: true, description: 'Pitted, plump Mediterranean olives cured in red wine vinegar.' },
  { id: 'veg_caramelized_onions', name: 'Balsamic Caramelized Onions', category: 'veggie', stock: 50, threshold: 15, unit: 'portions', price: 29, isVeg: true, description: 'Slow-cooked sweet Spanish onions glazed with Modena balsamic.' },
  { id: 'veg_wild_mushrooms', name: 'Truffle-Glazed Wild Mushrooms', category: 'veggie', stock: 45, threshold: 15, unit: 'portions', price: 49, isVeg: true, description: 'Medley of cremini, shiitake and oyster mushrooms sautéed in thyme.' },
  { id: 'veg_bell_peppers', name: 'Charred Tricolor Bell Peppers', category: 'veggie', stock: 60, threshold: 20, unit: 'portions', price: 29, isVeg: true, description: 'Crisp red, yellow and green bell peppers fire-roasted for natural sweetness.' },
  { id: 'veg_pickled_jalapenos', name: 'Spicy Escabeche Jalapeños', category: 'veggie', stock: 55, threshold: 18, unit: 'portions', price: 29, isVeg: true, description: 'Crisp hand-pickled jalapeño wheels with a fiery zesty bite.' },
  { id: 'veg_marinated_artichokes', name: 'Tuscan Marinated Artichoke Hearts', category: 'veggie', stock: 35, threshold: 12, unit: 'portions', price: 59, isVeg: true, description: 'Tender Italian artichoke quarters soaked in oregano infused oil.' },
  { id: 'veg_baby_spinach', name: 'Organic Tender Baby Spinach', category: 'veggie', stock: 50, threshold: 15, unit: 'portions', price: 25, isVeg: true, description: 'Farm-fresh organic baby greens wilted gently in oven heat.' }
];

export const INITIAL_PIZZAS = [
  {
    id: 'pizza_margherita_classica',
    name: 'Margherita Verace D.O.P.',
    category: 'Classic Artisanal',
    description: 'Slow-fermented sourdough, San Marzano tomato sauce, fresh Fior di Latte mozzarella, fragrant basil and cold-pressed extra virgin olive oil.',
    price: 399,
    basePrice: 399,
    isVeg: true,
    image: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    badge: 'Chef Signature',
    defaultCrust: 'base_sourdough',
    defaultSauce: 'sauce_san_marzano',
    defaultCheese: 'cheese_mozzarella',
    defaultVeggies: ['veg_cherry_tomatoes']
  },
  {
    id: 'pizza_truffle_wild_mushroom',
    name: 'Tartufo & Wild Forest Mushroom',
    category: 'Gourmet Woodfire',
    description: 'Cauliflower herb crust, creamy garlic alfredo base, smoked scamorza, medley of thyme roasted wild mushrooms and white truffle drizzle.',
    price: 549,
    basePrice: 549,
    isVeg: true,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80',
    rating: 4.95,
    badge: 'Award Winner',
    defaultCrust: 'base_gluten_free',
    defaultSauce: 'sauce_creamy_garlic_alfredo',
    defaultCheese: 'cheese_smoked_scamorza',
    defaultVeggies: ['veg_wild_mushrooms', 'veg_baby_spinach']
  },
  {
    id: 'pizza_quattro_formaggi',
    name: 'Quattro Formaggi Cremoso',
    category: 'Cheese Lovers',
    description: 'Molten cheese burst crust loaded with Fior di Latte, aged Gorgonzola blue, smoked scamorza, and whipped mascarpone cream.',
    price: 599,
    basePrice: 599,
    isVeg: true,
    image: 'https://images.unsplash.com/photo-1573821663912-569905455b1c?w=800&auto=format&fit=crop&q=80',
    rating: 4.85,
    badge: 'Bestseller',
    defaultCrust: 'base_cheese_burst',
    defaultSauce: 'sauce_san_marzano',
    defaultCheese: 'cheese_gorgonzola',
    defaultVeggies: ['veg_caramelized_onions']
  },
  {
    id: 'pizza_burrata_pesto_artisan',
    name: 'Genovese Burrata & Basil Pesto',
    category: 'Gourmet Woodfire',
    description: 'Neapolitan thin crust smothered with fresh Genovese basil pine nut pesto, blistered cherry tomatoes, Kalamata olives and a creamy burrata heart.',
    price: 649,
    basePrice: 649,
    isVeg: true,
    image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&auto=format&fit=crop&q=80',
    rating: 4.98,
    badge: 'Premium Reserve',
    defaultCrust: 'base_thin_crust',
    defaultSauce: 'sauce_basil_pesto',
    defaultCheese: 'cheese_burrata',
    defaultVeggies: ['veg_cherry_tomatoes', 'veg_kalamata_olives', 'veg_marinated_artichokes']
  },
  {
    id: 'pizza_fiery_arrabbiata_ortolana',
    name: 'Fiery Arrabbiata Primavera',
    category: 'Spicy Garden',
    description: 'Sourdough crust with fire-roasted arrabbiata sauce, vegan cashew cheese, charred tricolor peppers, pickled jalapeños, and caramelized onions.',
    price: 479,
    basePrice: 479,
    isVeg: true,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80',
    rating: 4.75,
    badge: 'Spicy ★★★',
    defaultCrust: 'base_sourdough',
    defaultSauce: 'sauce_spicy_arrabbiata',
    defaultCheese: 'cheese_vegan_cashew',
    defaultVeggies: ['veg_bell_peppers', 'veg_pickled_jalapenos', 'veg_caramelized_onions']
  },
  {
    id: 'pizza_chicago_deep_dish_feast',
    name: 'Chicago Rustic Deep Dish',
    category: 'Deep Dish',
    description: 'Authentic 2-inch deep golden buttery crust loaded with a half-pound of molten mozzarella, rich chunky San Marzano marinara, and garden veggies.',
    price: 629,
    basePrice: 629,
    isVeg: true,
    image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800&auto=format&fit=crop&q=80',
    rating: 4.88,
    badge: 'Heavyweight',
    defaultCrust: 'base_pan_deep_dish',
    defaultSauce: 'sauce_san_marzano',
    defaultCheese: 'cheese_mozzarella',
    defaultVeggies: ['veg_wild_mushrooms', 'veg_bell_peppers', 'veg_kalamata_olives']
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
      } else {
        this.initDefaultData();
      }
    } catch (e) {
      this.initDefaultData();
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
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving data to disk:', err);
    }
  }

  public getData(): IServerData {
    return this.data;
  }
}

export const DataStore = new StorageEngine();
