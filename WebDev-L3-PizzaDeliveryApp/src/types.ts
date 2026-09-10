export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: number;
  phone?: string;
  address?: string;
  createdAt: string;
}

export type PizzaBase = 'classic_hand_tossed' | 'thin_crust' | 'cheese_burst' | 'wheat_sourdough' | 'gluten_free';
export type PizzaSauce = 'san_marzano' | 'creamy_alfredo' | 'spicy_peri_peri' | 'basil_pesto' | 'chipotle_bbq';
export type PizzaCheese = 'fresh_mozzarella' | 'smoked_gouda' | 'sharp_cheddar' | 'vegan_mozzarella' | 'ricotta_parmesan';
export type PizzaVegetable = 
  | 'black_olives' 
  | 'bell_peppers' 
  | 'caramelized_onions' 
  | 'button_mushrooms' 
  | 'jalapeno_slices' 
  | 'sundried_tomatoes' 
  | 'baby_spinach' 
  | 'sweet_corn';

export interface InventoryItem {
  id: string;
  name: string;
  category: 'base' | 'sauce' | 'cheese' | 'vegetable' | 'extra';
  stock: number;
  threshold: number; // e.g. 20
  unit: string;
  price: number;
  iconName?: string;
  description: string;
  lastUpdated: string;
}

export interface CustomPizzaConfig {
  base: {
    id: string;
    name: string;
    price: number;
  };
  sauce: {
    id: string;
    name: string;
    price: number;
  };
  cheese: {
    id: string;
    name: string;
    price: number;
  };
  vegetables: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  size: 'Regular (8")' | 'Medium (10")' | 'Large (12")';
  extraCheese?: boolean;
}

export interface PresetPizza {
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  image: string;
  category: 'Veg' | 'Non-Veg' | 'Gourmet' | 'Chef Special';
  isSpicy?: boolean;
  isBestSeller?: boolean;
  base: string;
  sauce: string;
  cheese: string;
  vegetables: string[];
}

export interface CartItem {
  id: string;
  type: 'preset' | 'custom';
  name: string;
  price: number;
  quantity: number;
  size: string;
  customConfig?: CustomPizzaConfig;
  presetPizza?: PresetPizza;
  specialInstructions?: string;
}

export type OrderStatus = 'Order Received' | 'In Kitchen' | 'Sent to Delivery' | 'Delivered' | 'Cancelled';

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  note: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: {
    street: string;
    city: string;
    pincode: string;
    notes?: string;
  };
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;
  paymentMethod: 'razorpay' | 'cod';
  paymentStatus: 'paid' | 'pending' | 'failed';
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  status: OrderStatus;
  timeline: OrderTimelineEvent[];
  estimatedDeliveryMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemEmail {
  id: string;
  to: string;
  subject: string;
  type: 'verification' | 'password_reset' | 'low_stock_alert' | 'order_confirmation';
  content: string;
  actionLink?: string;
  actionText?: string;
  createdAt: string;
  read?: boolean;
  metadata?: Record<string, any>;
}

export interface InventoryAlertConfig {
  defaultThreshold: number;
  alertEmail: string;
  notificationsEnabled: boolean;
  lastCheckedAt?: string;
}
