import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, CustomPizzaConfig, PresetPizza } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
  promoCode: string;
  discount: number;
  applyPromoCode: (code: string) => { success: boolean; message: string; discountAmount: number };
  removePromoCode: () => void;
  deliveryAddress: {
    street: string;
    city: string;
    pincode: string;
    phone: string;
    notes?: string;
  };
  setDeliveryAddress: React.Dispatch<React.SetStateAction<{
    street: string;
    city: string;
    pincode: string;
    phone: string;
    notes?: string;
  }>>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('pizzacraft_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [promoCode, setPromoCode] = useState<string>(() => {
    return localStorage.getItem('pizzacraft_promo') || '';
  });

  const [discount, setDiscount] = useState<number>(0);

  const [deliveryAddress, setDeliveryAddress] = useState({
    street: 'Flat 402, Sunset Heights, Baker Street',
    city: 'Mumbai',
    pincode: '400001',
    phone: '+91 99887 76655',
    notes: 'Please don\'t ring bell if after 9 PM'
  });

  useEffect(() => {
    localStorage.setItem('pizzacraft_cart', JSON.stringify(items));
    recalcDiscount(promoCode, items);
  }, [items]);

  const recalcDiscount = (code: string, currentItems: CartItem[]) => {
    const rawSubtotal = currentItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (!code) {
      setDiscount(0);
      return;
    }

    const cleanCode = code.toUpperCase().trim();
    if (cleanCode === 'PIZZA50') {
      const disc = Math.min(rawSubtotal * 0.5, 150);
      setDiscount(Math.round(disc));
    } else if (cleanCode === 'FIRSTBITE') {
      const disc = Math.min(rawSubtotal * 0.2, 100);
      setDiscount(Math.round(disc));
    } else if (cleanCode === 'CHEF100') {
      setDiscount(Math.min(100, rawSubtotal));
    } else {
      setDiscount(0);
    }
  };

  const addItem = (itemData: Omit<CartItem, 'id'>) => {
    const newItem: CartItem = {
      ...itemData,
      id: `cart_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems(prev => prev.map(item => item.id === id ? { ...item, quantity } : item));
  };

  const clearCart = () => {
    setItems([]);
    setPromoCode('');
    setDiscount(0);
    localStorage.removeItem('pizzacraft_cart');
    localStorage.removeItem('pizzacraft_promo');
  };

  const applyPromoCode = (code: string) => {
    const cleanCode = code.toUpperCase().trim();
    const rawSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (rawSubtotal <= 0) {
      return { success: false, message: 'Your cart is empty', discountAmount: 0 };
    }

    if (cleanCode === 'PIZZA50') {
      const disc = Math.min(Math.round(rawSubtotal * 0.5), 150);
      setPromoCode('PIZZA50');
      setDiscount(disc);
      localStorage.setItem('pizzacraft_promo', 'PIZZA50');
      return { success: true, message: `Promo PIZZA50 applied! 50% off up to ₹150 saved.`, discountAmount: disc };
    } else if (cleanCode === 'FIRSTBITE') {
      const disc = Math.min(Math.round(rawSubtotal * 0.2), 100);
      setPromoCode('FIRSTBITE');
      setDiscount(disc);
      localStorage.setItem('pizzacraft_promo', 'FIRSTBITE');
      return { success: true, message: `Welcome Offer FIRSTBITE applied! ₹${disc} discount added.`, discountAmount: disc };
    } else if (cleanCode === 'CHEF100') {
      const disc = Math.min(100, rawSubtotal);
      setPromoCode('CHEF100');
      setDiscount(disc);
      localStorage.setItem('pizzacraft_promo', 'CHEF100');
      return { success: true, message: 'Chef Discount ₹100 applied successfully!', discountAmount: disc };
    } else {
      return { success: false, message: 'Invalid coupon code. Try PIZZA50 or FIRSTBITE', discountAmount: 0 };
    }
  };

  const removePromoCode = () => {
    setPromoCode('');
    setDiscount(0);
    localStorage.removeItem('pizzacraft_promo');
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        subtotal,
        itemCount,
        promoCode,
        discount,
        applyPromoCode,
        removePromoCode,
        deliveryAddress,
        setDeliveryAddress
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
