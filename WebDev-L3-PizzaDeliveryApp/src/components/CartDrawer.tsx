import React from 'react';
import { 
  X, 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  Sparkles, 
  Tag, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
  onOpenBuilder: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout,
  onOpenBuilder
}) => {
  const { 
    items, 
    removeItem, 
    updateQuantity, 
    subtotal, 
    itemCount, 
    promoCode, 
    discount, 
    applyPromoCode, 
    removePromoCode 
  } = useCart();
  const { isAuthenticated } = useAuth();
  const [promoInput, setPromoInput] = React.useState('');
  const [promoMessage, setPromoMessage] = React.useState<{ text: string; isError: boolean } | null>(null);

  if (!isOpen) return null;

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput) return;
    const res = applyPromoCode(promoInput);
    setPromoMessage({ text: res.message, isError: !res.success });
  };

  const deliveryFee = subtotal > 500 || subtotal === 0 ? 0 : 40;
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Math.round(taxableAmount * 0.05 * 100) / 100;
  const grandTotal = Math.round((taxableAmount + tax + deliveryFee) * 100) / 100;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 text-slate-100 shadow-2xl flex flex-col justify-between border-l border-slate-800">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white font-display">Your Artisanal Cart</h3>
                <p className="text-xs text-slate-400">{itemCount} items selected</p>
              </div>
            </div>
            <button
              id="cart-drawer-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-3xl shadow-inner">
                  🍕
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-white text-base font-display">Your cart is currently empty</p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Choose from our stone-fired specialty pizzas or build your own custom recipe.
                  </p>
                </div>
                <button
                  onClick={() => { onClose(); onOpenBuilder(); }}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow transition-all"
                >
                  Open Custom Builder
                </button>
              </div>
            ) : (
              items.map(item => (
                <div
                  key={item.id}
                  className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          item.type === 'custom' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {item.type === 'custom' ? 'Custom' : 'Signature'}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{item.size}</span>
                      </div>
                      <h4 className="font-bold text-sm text-white mt-1 font-display">{item.name}</h4>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400 hover:text-red-400 p-1 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Recipe detail tags if custom */}
                  {item.customConfig && (
                    <div className="text-[11px] text-slate-300 space-y-0.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 font-sans">
                      <p><span className="text-slate-500 font-medium">Base:</span> {item.customConfig.base.name}</p>
                      <p><span className="text-slate-500 font-medium">Sauce:</span> {item.customConfig.sauce.name}</p>
                      <p><span className="text-slate-500 font-medium">Cheese:</span> {item.customConfig.cheese.name} {item.customConfig.extraCheese && '(Extra)'}</p>
                      {item.customConfig.vegetables.length > 0 && (
                        <p><span className="text-slate-500 font-medium">Veggies:</span> {item.customConfig.vegetables.map(v => v.name.split(' ')[0]).join(', ')}</p>
                      )}
                    </div>
                  )}

                  {/* Quantity and Price */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-700/60">
                    <div className="flex items-center space-x-2 bg-slate-900 rounded-xl p-1 border border-slate-700">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-white px-1.5 font-mono">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-mono">₹{item.price} each</span>
                      <span className="text-sm font-black text-amber-400 font-mono">₹{item.price * item.quantity}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with Calculations & Checkout Button */}
          {items.length > 0 && (
            <div className="p-5 border-t border-slate-800 bg-slate-950 space-y-4">
              
              {/* Promo Code Input */}
              <div className="space-y-1.5">
                {promoCode ? (
                  <div className="flex items-center justify-between bg-emerald-950/60 border border-emerald-500/40 p-2.5 rounded-xl text-xs">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                      <Tag className="w-4 h-4" />
                      <span>{promoCode} Applied (-₹{discount})</span>
                    </div>
                    <button
                      onClick={removePromoCode}
                      className="text-slate-400 hover:text-red-400 text-xs underline font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Try code: PIZZA50 or FIRSTBITE"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      className="flex-1 uppercase font-mono text-xs px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:normal-case placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 transition-colors"
                    >
                      Apply
                    </button>
                  </form>
                )}

                {promoMessage && (
                  <p className={`text-[11px] font-medium ${promoMessage.isError ? 'text-red-400' : 'text-emerald-400'}`}>
                    {promoMessage.text}
                  </p>
                )}
              </div>

              {/* Price Details */}
              <div className="space-y-1.5 text-xs text-slate-400 font-medium">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-slate-200 font-mono">₹{subtotal}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Discount</span>
                    <span className="font-mono">-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Taxes (5% GST)</span>
                  <span className="text-slate-200 font-mono">₹{tax}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-mono">
                    {deliveryFee === 0 ? <span className="text-emerald-400 font-bold">FREE</span> : `₹${deliveryFee}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800 font-display">
                  <span>Grand Total</span>
                  <span className="text-amber-400 text-lg font-mono font-black">₹{grandTotal}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                id="cart-btn-proceed-checkout"
                onClick={() => { onClose(); onProceedToCheckout(); }}
                className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-red-950/40 text-sm flex items-center justify-center space-x-2 transition-all active:scale-95"
              >
                <span>Proceed to Order Summary</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
