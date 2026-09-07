import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Minus, 
  ShoppingBag, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw,
  Flame,
  Info
} from 'lucide-react';
import { InventoryItem, CustomPizzaConfig, PresetPizza } from '../types';
import { useCart } from '../context/CartContext';

interface CustomPizzaBuilderProps {
  initialPreset?: PresetPizza | null;
  onAddedToCart: () => void;
  onOpenCart: () => void;
}

export const CustomPizzaBuilder: React.FC<CustomPizzaBuilderProps> = ({
  initialPreset,
  onAddedToCart,
  onOpenCart
}) => {
  const { addItem } = useCart();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  // Available options loaded from backend inventory
  const [bases, setBases] = useState<InventoryItem[]>([]);
  const [sauces, setSauces] = useState<InventoryItem[]>([]);
  const [cheeses, setCheeses] = useState<InventoryItem[]>([]);
  const [vegetables, setVegetables] = useState<InventoryItem[]>([]);

  // Selections
  const [selectedBase, setSelectedBase] = useState<InventoryItem | null>(null);
  const [selectedSauce, setSelectedSauce] = useState<InventoryItem | null>(null);
  const [selectedCheese, setSelectedCheese] = useState<InventoryItem | null>(null);
  const [selectedVegetables, setSelectedVegetables] = useState<InventoryItem[]>([]);
  const [selectedSize, setSelectedSize] = useState<'Regular (8")' | 'Medium (10")' | 'Large (12")'>('Medium (10")');
  const [extraCheese, setExtraCheese] = useState<boolean>(false);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');

  const BASE_PRICE = 299; // Standard starting price for handcrafted medium pizza

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/menu/options');
      if (res.ok) {
        const data = await res.json();
        setBases(data.bases || []);
        setSauces(data.sauces || []);
        setCheeses(data.cheeses || []);
        setVegetables(data.vegetables || []);

        // Default selections
        if (initialPreset) {
          const matchBase = data.bases.find((b: any) => b.id === initialPreset.base) || data.bases[0];
          const matchSauce = data.sauces.find((s: any) => s.id === initialPreset.sauce) || data.sauces[0];
          const matchCheese = data.cheeses.find((c: any) => c.id === initialPreset.cheese) || data.cheeses[0];
          const matchVegs = data.vegetables.filter((v: any) => initialPreset.vegetables.includes(v.id));

          setSelectedBase(matchBase);
          setSelectedSauce(matchSauce);
          setSelectedCheese(matchCheese);
          setSelectedVegetables(matchVegs);
        } else {
          if (data.bases.length > 0) setSelectedBase(data.bases[0]);
          if (data.sauces.length > 0) setSelectedSauce(data.sauces[0]);
          if (data.cheeses.length > 0) setSelectedCheese(data.cheeses[0]);
          if (data.vegetables.length > 0) setSelectedVegetables([data.vegetables[0], data.vegetables[1]]);
        }
      }
    } catch (err) {
      console.error('Failed to load customizer options:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate Price
  const sizeMultiplier = selectedSize === 'Regular (8")' ? 0.85 : selectedSize === 'Large (12")' ? 1.35 : 1.0;
  const baseCost = selectedBase ? selectedBase.price : 0;
  const sauceCost = selectedSauce ? selectedSauce.price : 0;
  const cheeseCost = (selectedCheese ? selectedCheese.price : 0) + (extraCheese ? 60 : 0);
  const vegCost = selectedVegetables.reduce((sum, v) => sum + v.price, 0);

  const totalPrice = Math.round((BASE_PRICE + baseCost + sauceCost + cheeseCost + vegCost) * sizeMultiplier);

  const toggleVegetable = (veg: InventoryItem) => {
    if (selectedVegetables.some(v => v.id === veg.id)) {
      setSelectedVegetables(selectedVegetables.filter(v => v.id !== veg.id));
    } else {
      setSelectedVegetables([...selectedVegetables, veg]);
    }
  };

  const handleAddToCart = () => {
    if (!selectedBase || !selectedSauce || !selectedCheese) {
      alert('Please complete all 4 steps of your pizza build.');
      return;
    }

    // Check stock for all chosen components
    const outItems: string[] = [];
    if (selectedBase.stock <= 0) outItems.push(selectedBase.name);
    if (selectedSauce.stock <= 0) outItems.push(selectedSauce.name);
    if (selectedCheese.stock <= 0) outItems.push(selectedCheese.name);
    selectedVegetables.forEach(v => {
      if (v.stock <= 0) outItems.push(v.name);
    });

    if (outItems.length > 0) {
      alert(`The following selected ingredients are out of stock: ${outItems.join(', ')}. Please choose alternatives.`);
      return;
    }

    const config: CustomPizzaConfig = {
      base: { id: selectedBase.id, name: selectedBase.name, price: selectedBase.price },
      sauce: { id: selectedSauce.id, name: selectedSauce.name, price: selectedSauce.price },
      cheese: { id: selectedCheese.id, name: selectedCheese.name, price: selectedCheese.price },
      vegetables: selectedVegetables.map(v => ({ id: v.id, name: v.name, price: v.price })),
      size: selectedSize,
      extraCheese
    };

    addItem({
      type: 'custom',
      name: `Custom ${selectedBase.name.replace('Crust', '')} Pizza`,
      price: totalPrice,
      quantity: 1,
      size: selectedSize,
      customConfig: config,
      specialInstructions
    });

    onAddedToCart();
  };

  // Color mappings for visual dynamic pizza rendering
  const getSauceColor = () => {
    if (!selectedSauce) return '#dc2626';
    if (selectedSauce.id.includes('alfredo')) return '#fef08a';
    if (selectedSauce.id.includes('pesto')) return '#4ade80';
    if (selectedSauce.id.includes('bbq') || selectedSauce.id.includes('chipotle')) return '#7f1d1d';
    if (selectedSauce.id.includes('peri')) return '#ea580c';
    return '#dc2626'; // San marzano classic red
  };

  const getCheeseColor = () => {
    if (!selectedCheese) return '#fef9c3';
    if (selectedCheese.id.includes('cheddar')) return '#fde047';
    if (selectedCheese.id.includes('gouda')) return '#fef08a';
    if (selectedCheese.id.includes('vegan')) return '#f5f5f4';
    return '#fffbeb'; // fresh mozzarella
  };

  const steps = [
    { num: 1, title: 'Pizza Base', desc: '5 Artisan Doughs', count: bases.length },
    { num: 2, title: 'Sauce', desc: '5 Gourmet Sauces', count: sauces.length },
    { num: 3, title: 'Cheese Type', desc: 'Aged & Fresh Cheeses', count: cheeses.length },
    { num: 4, title: 'Vegetables', desc: 'Fresh Farm Veggies', count: selectedVegetables.length }
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-stone-200 text-center space-y-4 animate-pulse">
        <div className="w-16 h-16 bg-amber-200 rounded-full mx-auto" />
        <p className="text-stone-600 font-medium">Loading Artisan Pizza Builder...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-amber-900/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/40">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive 4-Step Builder</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
            Custom Stone-Fired Pizza Builder
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl">
            Design your ideal pizza step-by-step. Real-time ingredient stock is live-synced with our kitchen inventory.
          </p>
        </div>

        {/* Live Total & Quick Add */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between md:flex-col md:items-end gap-3 min-w-[200px]">
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Calculated Total</span>
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">₹{totalPrice}</span>
          </div>
          <button
            id="builder-btn-add-cart-top"
            onClick={handleAddToCart}
            className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>

      {/* Step Navigation Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {steps.map(step => (
          <button
            key={step.num}
            id={`step-nav-btn-${step.num}`}
            onClick={() => setCurrentStep(step.num)}
            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
              currentStep === step.num
                ? 'bg-slate-900 border-amber-400 text-white shadow-lg shadow-slate-950/20'
                : currentStep > step.num
                ? 'bg-white border-amber-200 text-slate-900 hover:bg-amber-50/50'
                : 'bg-amber-50/60 border-amber-100/80 text-slate-500 hover:bg-amber-100/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                currentStep === step.num
                  ? 'bg-amber-400 text-slate-950'
                  : currentStep > step.num
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                Step {step.num}
              </span>
              {currentStep > step.num && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>

            <div className="mt-2">
              <p className="font-bold text-xs sm:text-sm truncate font-display">{step.title}</p>
              <p className={`text-[11px] truncate ${
                currentStep === step.num ? 'text-amber-400 font-semibold' : 'text-slate-500'
              }`}>
                {step.num === 1 && selectedBase?.name}
                {step.num === 2 && selectedSauce?.name}
                {step.num === 3 && selectedCheese?.name}
                {step.num === 4 && `${selectedVegetables.length} selected`}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Main Two-Column Layout: Visual Canvas & Step Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Visual Live Pizza Assembly Canvas & Summary */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-200 flex items-center space-x-2 font-display">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Live Oven Preview</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Size: {selectedSize}</span>
            </div>

            {/* Dynamic Interactive SVG/CSS Pizza Visualizer */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto flex items-center justify-center">
              
              {/* Outer Glow / Heat */}
              <div className="absolute inset-0 bg-amber-500/15 rounded-full blur-xl" />

              {/* CRUST LAYER */}
              <div 
                className={`relative rounded-full transition-all duration-500 shadow-2xl flex items-center justify-center border-8 ${
                  selectedBase?.id === 'base_cheese_burst' 
                    ? 'border-amber-400 bg-amber-200 shadow-amber-500/30'
                    : selectedBase?.id === 'base_thin_crust'
                    ? 'border-amber-700 bg-amber-100'
                    : selectedBase?.id === 'base_wheat_sourdough'
                    ? 'border-stone-700 bg-amber-800/40'
                    : selectedBase?.id === 'base_gluten_free'
                    ? 'border-amber-600 bg-amber-50'
                    : 'border-amber-600 bg-amber-100'
                }`}
                style={{
                  width: selectedSize === 'Regular (8")' ? '82%' : selectedSize === 'Large (12")' ? '100%' : '92%',
                  height: selectedSize === 'Regular (8")' ? '82%' : selectedSize === 'Large (12")' ? '100%' : '92%',
                }}
              >
                {/* SAUCE LAYER */}
                <div 
                  className="rounded-full w-[88%] h-[88%] transition-colors duration-500 flex items-center justify-center shadow-inner relative overflow-hidden"
                  style={{ backgroundColor: getSauceColor() }}
                >
                  {/* CHEESE LAYER (Melty textured overlay) */}
                  <div 
                    className="rounded-full w-[90%] h-[90%] transition-colors duration-500 flex items-center justify-center relative opacity-90 shadow-md"
                    style={{ backgroundColor: getCheeseColor() }}
                  >
                    {/* Extra Cheese Indicator dots */}
                    {extraCheese && (
                      <div className="absolute inset-0 bg-yellow-300/30 rounded-full animate-pulse pointer-events-none" />
                    )}

                    {/* VEGETABLES SCATTER OVERLAY */}
                    <div className="absolute inset-0 p-3 pointer-events-none grid grid-cols-4 grid-rows-4 items-center justify-items-center">
                      {selectedVegetables.map((veg) => {
                        const iconMap: Record<string, string> = {
                          veg_black_olives: '⚫',
                          veg_bell_peppers: '🫑',
                          veg_caramelized_onions: '🧅',
                          veg_button_mushrooms: '🍄',
                          veg_jalapeno_slices: '🌶️',
                          veg_sundried_tomatoes: '🍅',
                          veg_baby_spinach: '🍃',
                          veg_sweet_corn: '🌽'
                        };
                        const icon = iconMap[veg.id] || '🌱';

                        return (
                          <React.Fragment key={veg.id}>
                            <span className="text-base sm:text-lg transform rotate-12 drop-shadow-sm select-none">
                              {icon}
                            </span>
                            <span className="text-sm sm:text-base transform -rotate-45 drop-shadow-sm select-none">
                              {icon}
                            </span>
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Center Basil/Herb garnish */}
                    <div className="w-4 h-4 rounded-full bg-emerald-700/60 blur-[1px] opacity-80" />
                  </div>
                </div>
              </div>
            </div>

            {/* Size Selector */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                Select Crust Size
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['Regular (8")', 'Medium (10")', 'Large (12")'] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                      selectedSize === size
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Extra Cheese Addon */}
            <div className="flex items-center justify-between pt-1">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-200 block">Extra Cheese Loaded (+₹60)</span>
                <span className="text-[11px] text-slate-400">Double cheese layer in oven</span>
              </div>
              <button
                onClick={() => setExtraCheese(!extraCheese)}
                className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                  extraCheese ? 'bg-amber-400 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

          </div>

          {/* Current Recipe Summary Card */}
          <div className="bg-white rounded-3xl p-5 border border-amber-100 shadow-sm space-y-3">
            <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider font-display">Custom Recipe Breakdown</h4>
            <div className="space-y-1.5 text-xs text-slate-700 divide-y divide-amber-50">
              <div className="flex justify-between py-1">
                <span className="font-medium text-slate-500">Base Crust:</span>
                <span className="font-bold text-slate-900">{selectedBase?.name} {selectedBase?.price ? `(+₹${selectedBase.price})` : '(Free)'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-medium text-slate-500">Sauce Layer:</span>
                <span className="font-bold text-slate-900">{selectedSauce?.name} {selectedSauce?.price ? `(+₹${selectedSauce.price})` : '(Free)'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-medium text-slate-500">Cheese:</span>
                <span className="font-bold text-slate-900">{selectedCheese?.name} {selectedCheese?.price ? `(+₹${selectedCheese.price})` : '(Free)'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-medium text-slate-500">Vegetables ({selectedVegetables.length}):</span>
                <span className="font-bold text-slate-900 truncate max-w-[200px]">
                  {selectedVegetables.length === 0 ? 'None' : selectedVegetables.map(v => v.name.split(' ')[0]).join(', ')}
                </span>
              </div>
              <div className="flex justify-between py-1.5 font-bold text-slate-900 text-sm">
                <span>Final Price:</span>
                <span className="text-red-600 font-mono font-black">₹{totalPrice}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Step Content Selection Area */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-amber-100/90 p-6 sm:p-8 shadow-sm space-y-6">
          
          {/* STEP 1: CHOOSE BASE */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-amber-50 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    Step 1 of 4
                  </span>
                  <span className="text-xs text-slate-400">Select one option</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display mt-1">
                  Choose Your Pizza Base (5 Artisan Options)
                </h2>
                <p className="text-xs text-slate-500">
                  Each dough is fermented for optimal digestibility and stone-baked with extra virgin olive oil.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {bases.map(base => {
                  const isSelected = selectedBase?.id === base.id;
                  const isLow = base.stock > 0 && base.stock < base.threshold;
                  const isOut = base.stock <= 0;

                  return (
                    <div
                      key={base.id}
                      id={`base-option-${base.id}`}
                      onClick={() => !isOut && setSelectedBase(base)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative ${
                        isOut
                          ? 'opacity-50 border-slate-200 bg-slate-50 cursor-not-allowed'
                          : isSelected
                          ? 'border-amber-500 bg-amber-50/80 shadow-sm'
                          : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-slate-900 text-sm leading-tight font-display">{base.name}</h4>
                          <span className="text-xs font-bold text-amber-800 font-mono">
                            {base.price > 0 ? `+₹${base.price}` : 'Free'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{base.description}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                        <span className={`font-semibold flex items-center space-x-1 ${
                          isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-700'
                        }`}>
                          <span>•</span>
                          <span>{isOut ? 'Out of stock' : `${base.stock} available in kitchen`}</span>
                        </span>

                        {isSelected && (
                          <span className="bg-amber-500 text-slate-950 rounded-full p-0.5 font-bold">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE SAUCE */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-amber-50 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    Step 2 of 4
                  </span>
                  <span className="text-xs text-slate-400">Select one option</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display mt-1">
                  Choose Your Gourmet Sauce (5 Options)
                </h2>
                <p className="text-xs text-slate-500">
                  Simmered in small batches with imported Italian herbs, sea salt, and extra virgin olive oil.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {sauces.map(sauce => {
                  const isSelected = selectedSauce?.id === sauce.id;
                  const isLow = sauce.stock > 0 && sauce.stock < sauce.threshold;
                  const isOut = sauce.stock <= 0;

                  return (
                    <div
                      key={sauce.id}
                      id={`sauce-option-${sauce.id}`}
                      onClick={() => !isOut && setSelectedSauce(sauce)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                        isOut
                          ? 'opacity-50 border-slate-200 bg-slate-50 cursor-not-allowed'
                          : isSelected
                          ? 'border-amber-500 bg-amber-50/80 shadow-sm'
                          : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-slate-900 text-sm leading-tight font-display">{sauce.name}</h4>
                          <span className="text-xs font-bold text-amber-800 font-mono">
                            {sauce.price > 0 ? `+₹${sauce.price}` : 'Free'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{sauce.description}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                        <span className={`font-semibold ${
                          isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-700'
                        }`}>
                          • {isOut ? 'Out of stock' : `${sauce.stock} portions in stock`}
                        </span>

                        {isSelected && (
                          <span className="bg-amber-500 text-slate-950 rounded-full p-0.5 font-bold">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: CHOOSE CHEESE */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-amber-50 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    Step 3 of 4
                  </span>
                  <span className="text-xs text-slate-400">Select one option</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display mt-1">
                  Choose Your Cheese Type
                </h2>
                <p className="text-xs text-slate-500">
                  Artisanal dairy and 100% plant-based varieties for golden caramelization and rich stringiness.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {cheeses.map(cheese => {
                  const isSelected = selectedCheese?.id === cheese.id;
                  const isLow = cheese.stock > 0 && cheese.stock < cheese.threshold;
                  const isOut = cheese.stock <= 0;

                  return (
                    <div
                      key={cheese.id}
                      id={`cheese-option-${cheese.id}`}
                      onClick={() => !isOut && setSelectedCheese(cheese)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                        isOut
                          ? 'opacity-50 border-slate-200 bg-slate-50 cursor-not-allowed'
                          : isSelected
                          ? 'border-amber-500 bg-amber-50/80 shadow-sm'
                          : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-slate-900 text-sm leading-tight font-display">{cheese.name}</h4>
                          <span className="text-xs font-bold text-amber-800 font-mono">
                            {cheese.price > 0 ? `+₹${cheese.price}` : 'Free'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{cheese.description}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                        <span className={`font-semibold ${
                          isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-700'
                        }`}>
                          • {isOut ? 'Out of stock' : `${cheese.stock} portions in stock`}
                        </span>

                        {isSelected && (
                          <span className="bg-amber-500 text-slate-950 rounded-full p-0.5 font-bold">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: CHOOSE VEGETABLES (MULTIPLE SELECT) */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-amber-50 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      Step 4 of 4
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      Multiple select ({selectedVegetables.length} chosen)
                    </span>
                  </div>
                  {selectedVegetables.length > 0 && (
                    <button
                      onClick={() => setSelectedVegetables([])}
                      className="text-xs text-slate-500 hover:text-red-600 transition-colors flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear all</span>
                    </button>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display mt-1">
                  Choose Your Fresh Vegetables
                </h2>
                <p className="text-xs text-slate-500">
                  Select as many farm-fresh toppings as you like. We prepare and season them right before placing them in the oven.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {vegetables.map(veg => {
                  const isSelected = selectedVegetables.some(v => v.id === veg.id);
                  const isLow = veg.stock > 0 && veg.stock < veg.threshold;
                  const isOut = veg.stock <= 0;

                  return (
                    <div
                      key={veg.id}
                      id={`veg-option-${veg.id}`}
                      onClick={() => !isOut && toggleVegetable(veg)}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                        isOut
                          ? 'opacity-50 border-slate-200 bg-slate-50 cursor-not-allowed'
                          : isSelected
                          ? 'border-emerald-600 bg-emerald-50/80 shadow-sm'
                          : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20'
                      }`}
                    >
                      <div className="space-y-0.5 pr-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm font-display">{veg.name}</span>
                          <span className="text-xs font-semibold text-slate-600 font-mono">+₹{veg.price}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{veg.description}</p>
                        <span className={`text-[10px] block font-medium ${
                          isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-500'
                        }`}>
                          {isOut ? 'Out of stock' : `${veg.stock} portions left`}
                        </span>
                      </div>

                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                        isSelected 
                          ? 'bg-emerald-600 border-emerald-600 text-white font-bold' 
                          : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Special Instructions */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kitchen Notes / Special Requests (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Well-done crust, extra crispy edges, cut into 8 slices..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>
            </div>
          )}

          {/* Wizard Navigation Footer Buttons */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                id="builder-btn-prev"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors flex items-center space-x-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Step</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <button
                id="builder-btn-next"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
              >
                <span>Proceed to Step {currentStep + 1}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                id="builder-btn-finish-add"
                onClick={handleAddToCart}
                className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-red-950/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center space-x-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add Complete Pizza to Cart (₹{totalPrice})</span>
              </button>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
