import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { PizzaMenu } from './components/PizzaMenu';
import { CustomPizzaBuilder } from './components/CustomPizzaBuilder';
import { CartDrawer } from './components/CartDrawer';
import { OrderSummaryModal } from './components/OrderSummaryModal';
import { RazorpayModal } from './components/RazorpayModal';
import { OrderTrackingView } from './components/OrderTrackingView';
import { AdminPortal } from './components/AdminPortal';
import { AuthModal } from './components/AuthModal';
import { SystemEmailInboxModal } from './components/SystemEmailInboxModal';
import { PresetPizza, Order } from './types';
import { Sparkles, Pizza, ShieldCheck, Heart, Mail } from 'lucide-react';

function MainAppContent() {
  const { user, isAuthenticated, isAdmin } = useAuth();

  // Navigation State
  const [currentView, setCurrentView] = useState<'menu' | 'builder' | 'orders' | 'admin'>('menu');
  const [selectedPresetForCustomizer, setSelectedPresetForCustomizer] = useState<PresetPizza | null>(null);
  const [activeTrackOrderId, setActiveTrackOrderId] = useState<string | null>(null);

  // Modal States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState(false);
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);
  const [razorpayOrderData, setRazorpayOrderData] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [isEmailInboxOpen, setIsEmailInboxOpen] = useState(false);

  // Handlers
  const handleNavigate = (view: string, data?: any) => {
    if (view === 'menu' || view === 'builder' || view === 'orders' || view === 'admin') {
      setCurrentView(view);
      if (view === 'orders' && data?.orderId) {
        setActiveTrackOrderId(data.orderId);
      }
    }
  };

  const handleCustomizePreset = (preset: PresetPizza) => {
    setSelectedPresetForCustomizer(preset);
    setCurrentView('builder');
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleOpenAdminLogin = () => {
    setCurrentView('admin');
  };

  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      handleOpenAuth('login');
      return;
    }
    setIsOrderSummaryOpen(true);
  };

  const handleInitiateRazorpay = (orderData: any) => {
    setIsOrderSummaryOpen(false);
    setRazorpayOrderData(orderData);
    setIsRazorpayOpen(true);
  };

  const handlePaymentSuccess = (confirmedOrder: Order) => {
    setIsRazorpayOpen(false);
    setActiveTrackOrderId(confirmedOrder.id);
    setCurrentView('orders');
  };

  return (
    <div className="min-h-screen bg-[#FFF9F2] text-slate-900 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      
      {/* Navigation Bar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
        onOpenAdminLogin={handleOpenAdminLogin}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenEmailInbox={() => setIsEmailInboxOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        
        {/* VIEW 1: PIZZA MENU */}
        {currentView === 'menu' && (
          <PizzaMenu
            onCustomizePreset={handleCustomizePreset}
            onNavigateToBuilder={() => {
              setSelectedPresetForCustomizer(null);
              setCurrentView('builder');
            }}
            onOpenCart={() => setIsCartOpen(true)}
          />
        )}

        {/* VIEW 2: 4-STEP CUSTOM PIZZA BUILDER */}
        {currentView === 'builder' && (
          <CustomPizzaBuilder
            initialPreset={selectedPresetForCustomizer}
            onAddedToCart={() => setIsCartOpen(true)}
            onOpenCart={() => setIsCartOpen(true)}
          />
        )}

        {/* VIEW 3: LIVE ORDER TRACKING & HISTORY */}
        {currentView === 'orders' && (
          <OrderTrackingView
            initialOrderId={activeTrackOrderId}
            onNavigateToMenu={() => setCurrentView('menu')}
            onNavigateToBuilder={() => {
              setSelectedPresetForCustomizer(null);
              setCurrentView('builder');
            }}
          />
        )}

        {/* VIEW 4: MASTER ADMIN PORTAL */}
        {currentView === 'admin' && (
          <AdminPortal />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-amber-900/30 py-8 mt-14 text-xs shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-red-900/40">
              <Pizza className="w-4 h-4 transform -rotate-12" />
            </div>
            <span className="font-bold text-white tracking-tight font-display">PizzaCraft Artisanal Bar & Live Kitchen</span>
          </div>

          <div className="flex items-center space-x-4 text-slate-400">
            <button
              onClick={() => setIsEmailInboxOpen(true)}
              className="hover:text-amber-400 transition-colors flex items-center space-x-1.5 font-medium"
            >
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>System Mailbox</span>
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => setCurrentView('admin')}
              className="hover:text-amber-400 transition-colors flex items-center space-x-1.5 font-medium"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Portal</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            Stone-Fired Pizza Delivery & Inventory Engine • 2026
          </p>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={handleProceedToCheckout}
        onOpenBuilder={() => {
          setSelectedPresetForCustomizer(null);
          setCurrentView('builder');
        }}
      />

      <OrderSummaryModal
        isOpen={isOrderSummaryOpen}
        onClose={() => setIsOrderSummaryOpen(false)}
        onInitiateRazorpay={handleInitiateRazorpay}
      />

      <RazorpayModal
        isOpen={isRazorpayOpen}
        orderData={razorpayOrderData}
        onClose={() => setIsRazorpayOpen(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authMode}
        onClose={() => setIsAuthOpen(false)}
        onOpenEmailInbox={() => setIsEmailInboxOpen(true)}
      />

      <SystemEmailInboxModal
        isOpen={isEmailInboxOpen}
        onClose={() => setIsEmailInboxOpen(false)}
        onNavigateToView={handleNavigate}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <MainAppContent />
      </CartProvider>
    </AuthProvider>
  );
}
