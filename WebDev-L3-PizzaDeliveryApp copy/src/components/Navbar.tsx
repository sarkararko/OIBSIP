import React, { useState, useEffect } from 'react';
import { 
  Pizza, 
  Sparkles, 
  ShoppingBag, 
  Clock, 
  User as UserIcon, 
  ShieldCheck, 
  Mail, 
  LogOut, 
  ChevronDown, 
  Menu, 
  X,
  AlertTriangle,
  Flame
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, data?: any) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenAdminLogin: () => void;
  onOpenCart: () => void;
  onOpenEmailInbox?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenAuth,
  onOpenAdminLogin,
  onOpenCart,
}) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-amber-900/20 text-slate-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('menu')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-red-950/50 text-white">
              <Pizza className="w-6 h-6 transform -rotate-12" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white font-display">PizzaCraft</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  Artisanal
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-none">Stone-Fired Delivery & Bar</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              id="nav-btn-menu"
              onClick={() => onNavigate('menu')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 ${
                currentView === 'menu'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Pizza className="w-4 h-4" />
              <span>Pizza Menu</span>
            </button>

            <button
              id="nav-btn-builder"
              onClick={() => onNavigate('builder')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 relative ${
                currentView === 'builder'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${currentView === 'builder' ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>Custom Builder</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                currentView === 'builder' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-red-500/20 text-red-300 border border-red-500/40'
              }`}>
                4-Step
              </span>
            </button>

            <button
              id="nav-btn-tracking"
              onClick={() => onNavigate('orders')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 ${
                currentView === 'orders' || currentView === 'tracking'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Live Order Tracker</span>
            </button>

            {isAdmin && (
              <button
                id="nav-btn-admin-portal"
                onClick={() => onNavigate('admin')}
                className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-1.5 ${
                  currentView === 'admin'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'bg-slate-800 text-amber-300 hover:bg-slate-750 border border-amber-500/30'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Admin Dashboard</span>
              </button>
            )}
          </nav>

          {/* Right Action Icons & Auth */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            
            {/* Cart Trigger */}
            <button
              id="btn-open-cart"
              onClick={onOpenCart}
              className="relative flex items-center space-x-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-bold text-sm px-3.5 py-2 rounded-xl shadow-lg shadow-amber-900/30 transition-all active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline font-semibold">Cart</span>
              {itemCount > 0 && (
                <span className="bg-slate-950 text-amber-400 text-xs px-1.5 py-0.5 rounded-full font-bold border border-amber-400/40">
                  {itemCount}
                </span>
              )}
            </button>

            {/* User Account / Auth */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  id="user-menu-dropdown-toggle"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 p-1.5 pr-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 transition-colors border border-slate-700"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-slate-200 hidden lg:inline max-w-[90px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2.5 border-b border-slate-800">
                      <p className="text-xs text-slate-400">Signed in as</p>
                      <p className="text-sm font-bold text-white truncate font-display">{user.name}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      <div className="mt-1.5 flex items-center space-x-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                          user.isVerified ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {user.isVerified ? '✓ Email Verified' : '⚠️ Pending Verification'}
                        </span>
                        {user.role === 'admin' && (
                          <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                            ADMIN
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => onNavigate('orders')}
                        className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 flex items-center space-x-2.5"
                      >
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Order History & Live Status</span>
                      </button>

                      {user.role === 'admin' && (
                        <button
                          onClick={() => onNavigate('admin')}
                          className="w-full text-left px-4 py-2 text-sm text-amber-300 hover:bg-slate-800 flex items-center space-x-2.5 font-medium"
                        >
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          <span>Admin Control Center</span>
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-800 pt-1">
                      <button
                        onClick={() => logout()}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-950/40 flex items-center space-x-2.5 font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <button
                  id="btn-login-user"
                  onClick={() => onOpenAuth('login')}
                  className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Sign In
                </button>
                <button
                  id="btn-register-user"
                  onClick={() => onOpenAuth('register')}
                  className="hidden sm:inline-flex px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 shadow transition-all"
                >
                  Register
                </button>
                <button
                  id="btn-admin-login-nav"
                  onClick={onOpenAdminLogin}
                  title="Dedicated Admin Login"
                  className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile menu hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 md:hidden"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pt-2 pb-4 space-y-2">
          <button
            onClick={() => { onNavigate('menu'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center space-x-2 ${
              currentView === 'menu' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-300'
            }`}
          >
            <Pizza className="w-4 h-4" />
            <span>Pizza Menu</span>
          </button>
          <button
            onClick={() => { onNavigate('builder'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center space-x-2 ${
              currentView === 'builder' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Custom Pizza Builder</span>
          </button>
          <button
            onClick={() => { onNavigate('orders'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center space-x-2 ${
              currentView === 'orders' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Live Tracker & History</span>
          </button>

          <div className="border-t border-slate-800 pt-2 flex flex-col space-y-2">
            <button
              onClick={() => { onOpenAdminLogin(); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-amber-300 bg-slate-800 flex items-center space-x-2"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Admin Portal Login</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
