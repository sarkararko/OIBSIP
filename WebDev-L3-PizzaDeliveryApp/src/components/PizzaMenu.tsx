import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Sparkles, 
  ShoppingBag, 
  SlidersHorizontal, 
  Check, 
  AlertCircle, 
  ChevronRight,
  Info,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { PresetPizza } from '../types';
import { useCart } from '../context/CartContext';
import { apiUrl, apiFetch } from '../config/api';

interface PizzaMenuProps {
  onCustomizePreset: (pizza: PresetPizza) => void;
  onNavigateToBuilder: () => void;
  onOpenCart: () => void;
}

export const PizzaMenu: React.FC<PizzaMenuProps> = ({
  onCustomizePreset,
  onNavigateToBuilder,
  onOpenCart
}) => {
  const { addItem } = useCart();
  const [pizzas, setPizzas] = useState<PresetPizza[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [addedNotice, setAddedNotice] = useState<string | null>(null);
  const [outOfStockItems, setOutOfStockItems] = useState<string[]>([]);

  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await apiFetch('/api/menu/pizzas');
      if (res.ok) {
        const data = await res.json();
        setPizzas(data.presetPizzas || data.pizzas || []);
      } else {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      
      // Also fetch options to check any out of stock items
      const optRes = await apiFetch('/api/menu/options');
      if (optRes.ok) {
        const optData = await optRes.json();
        const outOfStock: string[] = [];
        const allItems = [
          ...(optData.bases || []),
          ...(optData.sauces || []),
          ...(optData.cheeses || []),
          ...(optData.vegetables || optData.veggies || [])
        ];
        allItems.forEach((item: any) => {
          if (item && item.stock <= 0) {
            outOfStock.push(item.id);
          }
        });
        setOutOfStockItems(outOfStock);
      }
    } catch (err: any) {
      console.error('Failed to load menu pizzas:', err);
      setFetchError(err?.message || 'Unable to connect to the menu server. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = (pizza: PresetPizza) => {
    // Check if base or key ingredients are out of stock
    const isOut = outOfStockItems.includes(pizza.base) || 
                  outOfStockItems.includes(pizza.sauce) || 
                  outOfStockItems.includes(pizza.cheese);

    if (isOut) {
      alert('Sorry, an essential ingredient for this pizza is currently out of stock. Please check custom builder for substitutes!');
      return;
    }

    addItem({
      type: 'preset',
      name: pizza.name,
      price: pizza.price,
      quantity: 1,
      size: 'Medium (10")',
      presetPizza: pizza
    });

    setAddedNotice(pizza.name);
    setTimeout(() => setAddedNotice(null), 3000);
  };

  const categories = ['All', 'Veg', 'Gourmet', 'Chef Special'];

  const filteredPizzas = pizzas.filter(pizza => {
    if (categoryFilter === 'All') return true;
    return pizza.category === categoryFilter;
  });

  return (
    <div className="space-y-8 pb-16">
      
      {/* Hero Banner with Quick CTA */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-red-950 border border-amber-900/30 p-6 sm:p-10 shadow-2xl">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 p-8 hidden lg:block opacity-20 transform rotate-12 pointer-events-none text-amber-400 font-mono text-9xl">
          🍕
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/40">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Handmade Sourdough & 380°C Stone-Fired</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white font-display tracking-tight leading-tight">
            Artisanal Pizzas, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-400">Crafted Your Way</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Choose from our Chef’s signature stone-fired varieties or build your own custom masterpiece with fresh mozzarella, authentic sauces, and gourmet toppings.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              id="hero-btn-custom-builder"
              onClick={onNavigateToBuilder}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-red-950/50 transition-all hover:scale-[1.02] active:scale-95 text-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Launch 4-Step Custom Builder</span>
            </button>

            <a
              href="#specialty-pizzas"
              className="inline-flex items-center space-x-2 bg-slate-800/90 hover:bg-slate-800 text-slate-200 font-semibold px-5 py-3 rounded-xl border border-slate-700 transition-all text-sm"
            >
              <span>Explore Chef Varieties</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Added notice banner */}
      {addedNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-amber-400/50 flex items-center space-x-3 animate-in slide-in-from-bottom-5">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            ✓
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Added to order</p>
            <p className="text-sm font-bold text-white font-display">{addedNotice}</p>
          </div>
          <button
            onClick={onOpenCart}
            className="ml-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-xl shadow"
          >
            View Cart
          </button>
        </div>
      )}

      {/* Specialty Pizzas Section Header & Filter */}
      <div id="specialty-pizzas" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
            Chef’s Signature Pizzas
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm">
            Freshly prepared with San Marzano tomatoes, artisanal cheeses, and farm veggies.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              id={`filter-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-amber-300 shadow-md shadow-slate-900/20'
                  : 'bg-amber-100/70 hover:bg-amber-200/80 text-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton or Pizza Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="bg-amber-50/50 rounded-3xl p-4 animate-pulse space-y-3 h-96 border border-amber-100" />
          ))}
        </div>
      ) : fetchError && pizzas.length === 0 ? (
        <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-8 text-center space-y-4 max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900 font-display">Unable to Load Menu</h3>
          <p className="text-xs text-slate-600">{fetchError}</p>
          <button
            onClick={fetchMenu}
            className="bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold px-4 py-2 rounded-xl text-xs transition shadow"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredPizzas.map(pizza => {
            const hasOutOfStockBase = outOfStockItems.includes(pizza.base);
            const hasOutOfStockSauce = outOfStockItems.includes(pizza.sauce);
            const isUnavailable = hasOutOfStockBase || hasOutOfStockSauce;

            return (
              <div
                key={pizza.id}
                id={`pizza-card-${pizza.id}`}
                className="group bg-white rounded-3xl border border-amber-100/80 shadow-sm hover:shadow-xl hover:border-amber-300/80 transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                {/* Image & Badges */}
                <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-amber-50">
                  <img
                    src={pizza.image}
                    alt={pizza.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                  {/* Category & Tag badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {pizza.isBestSeller && (
                      <span className="bg-amber-400 text-slate-950 font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full shadow-md tracking-wider">
                        ★ Best Seller
                      </span>
                    )}
                    {pizza.isSpicy && (
                      <span className="bg-red-600 text-white font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-full shadow-md flex items-center space-x-1">
                        <Flame className="w-3 h-3" />
                        <span>Spicy</span>
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md shadow ${
                      pizza.category === 'Veg' 
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' 
                        : pizza.category === 'Gourmet'
                        ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40'
                        : 'bg-slate-900/80 text-amber-300 border border-amber-500/40'
                    }`}>
                      {pizza.category}
                    </span>
                  </div>

                  {/* Price Tag Overlay */}
                  <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md text-amber-300 px-3 py-1 rounded-xl font-mono font-black text-sm border border-slate-700/60 shadow">
                    ₹{pizza.price}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-slate-900 font-display leading-snug group-hover:text-red-600 transition-colors">
                      {pizza.name}
                    </h3>
                    <p className="text-xs font-bold text-amber-600">{pizza.tagline}</p>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {pizza.description}
                    </p>
                  </div>

                  {/* Stock Notice if any */}
                  {isUnavailable && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-2.5 py-1.5 rounded-xl flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Item currently restocking in inventory</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-amber-100/60 flex items-center gap-2">
                    <button
                      id={`btn-customize-${pizza.id}`}
                      onClick={() => onCustomizePreset(pizza)}
                      className="flex-1 py-2 px-3 rounded-xl border border-amber-200/80 hover:border-amber-500 hover:bg-amber-50 text-slate-700 hover:text-amber-900 text-xs font-bold transition-colors flex items-center justify-center space-x-1"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Customize</span>
                    </button>

                    <button
                      id={`btn-add-${pizza.id}`}
                      onClick={() => handleQuickAdd(pizza)}
                      disabled={isUnavailable}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-1.5 ${
                        isUnavailable
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 active:scale-95'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Pizza Promo Card */}
      <div className="bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 border border-amber-200/80 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center space-x-1 text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-200/70 px-3 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3 text-amber-700" />
            <span>Total Creative Freedom</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
            Want to craft something entirely unique?
          </h3>
          <p className="text-slate-600 text-xs sm:text-sm max-w-xl">
            Choose from 5 artisan bases, 5 gourmet sauces, gourmet melting cheeses, and endless fresh vegetable combinations.
          </p>
        </div>

        <button
          onClick={onNavigateToBuilder}
          className="shrink-0 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold px-6 py-3.5 rounded-xl text-sm shadow-lg transition-all active:scale-95 flex items-center space-x-2"
        >
          <span>Open 4-Step Builder</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
