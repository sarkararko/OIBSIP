import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Package, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Minus, 
  Edit3, 
  Save, 
  RefreshCw, 
  Search, 
  Filter, 
  Mail, 
  Clock, 
  DollarSign, 
  TrendingDown, 
  Settings, 
  ChefHat, 
  Bike, 
  Home, 
  RotateCcw,
  Sparkles,
  Info,
  Check
} from 'lucide-react';
import { InventoryItem, Order, OrderStatus, SystemEmail } from '../types';
import { useAuth } from '../context/AuthContext';

export const AdminPortal: React.FC = () => {
  const { user, isAdmin, login } = useAuth();
  
  // Login form state if not authenticated as admin
  const [adminEmail, setAdminEmail] = useState('admin@pizzacraft.com');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin Dashboard Tabs
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'alerts' | 'analytics'>('inventory');

  // Data states
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [emails, setEmails] = useState<SystemEmail[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Controls
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  
  // Editing state for inventory item
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ stock: number; threshold: number; price: number; name: string }>({
    stock: 0,
    threshold: 20,
    price: 0,
    name: ''
  });

  // Action status feedback
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
      // Poll every 3 seconds for new incoming orders and inventory changes
      const interval = setInterval(loadAdminData, 3000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const loadAdminData = async () => {
    try {
      const token = localStorage.getItem('pizzacraft_token');
      if (!token) return;

      const [invRes, ordRes, emailRes] = await Promise.all([
        fetch('/api/admin/inventory', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/emails')
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setInventory(invData.inventory || []);
        setSummaryStats(invData.summary || null);
      }

      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(ordData.orders || []);
      }

      if (emailRes.ok) {
        const emailData = await emailRes.json();
        setEmails(emailData.emails || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Invalid administrator credentials.');
        setIsLoggingIn(false);
        return;
      }

      login(data.token, data.user);
    } catch (err: any) {
      setLoginError(err.message || 'Server connection error.');
      setIsLoggingIn(false);
    }
  };

  // Adjust stock count quickly
  const handleAdjustStock = async (itemId: string, delta: number) => {
    try {
      const token = localStorage.getItem('pizzacraft_token');
      const res = await fetch(`/api/admin/inventory/${itemId}/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ delta })
      });

      if (res.ok) {
        const data = await res.json();
        showFeedback(data.message);
        loadAdminData();
      }
    } catch (err) {
      console.error('Adjust stock error:', err);
    }
  };

  // Save manual edit of item
  const handleSaveItemEdit = async (itemId: string) => {
    try {
      const token = localStorage.getItem('pizzacraft_token');
      const res = await fetch(`/api/admin/inventory/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        setEditingItemId(null);
        showFeedback('Inventory item updated successfully.');
        loadAdminData();
      }
    } catch (err) {
      console.error('Save edit error:', err);
    }
  };

  // Update Order Status (Order Received -> In Kitchen -> Sent to Delivery -> Delivered)
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const token = localStorage.getItem('pizzacraft_token');
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        const data = await res.json();
        showFeedback(`Order #${data.order.orderNumber} status changed to ${newStatus}`);
        loadAdminData();
      }
    } catch (err) {
      console.error('Update order status error:', err);
    }
  };

  // Manually trigger Cron stock monitor
  const handleTriggerCronStockCheck = async () => {
    try {
      const token = localStorage.getItem('pizzacraft_token');
      const res = await fetch('/api/admin/inventory/alerts/trigger-check', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        showFeedback(`Stock Monitor executed. ${data.lowItems.length} low stock items detected & alert email created.`);
        loadAdminData();
      }
    } catch (err) {
      console.error('Trigger cron check error:', err);
    }
  };

  // Reset demo data
  const handleResetDemoData = async () => {
    if (!window.confirm('Reset all inventory and orders to default factory demo state?')) return;
    try {
      const token = localStorage.getItem('pizzacraft_token');
      const res = await fetch('/api/admin/reset-demo-data', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showFeedback('Demo inventory & sample orders restored.');
        loadAdminData();
      }
    } catch (err) {
      console.error('Reset demo data error:', err);
    }
  };

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // ----------------------------------------------------
  // UN-AUTHENTICATED ADMIN LOGIN FORM VIEW
  // ----------------------------------------------------
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 animate-in fade-in duration-200">
        <div className="bg-slate-900 text-white rounded-3xl p-8 border border-slate-800 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold font-display text-white">Administrator Portal</h2>
            <p className="text-xs text-slate-400">
              Restricted management area for live order workflow & automated inventory control.
            </p>
          </div>

          {loginError && (
            <div className="bg-red-950/80 border border-red-500/40 text-red-300 text-xs p-3 rounded-xl flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold font-display">Admin Email</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold font-display">Admin Master Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-amber-400 font-display">Default Demo Admin Credentials:</p>
              <p>Email: <span className="font-mono text-white">admin@pizzacraft.com</span></p>
              <p>Password: <span className="font-mono text-white">admin123</span></p>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-extrabold py-3 rounded-xl shadow-lg transition-all active:scale-95 text-xs sm:text-sm font-display cursor-pointer"
            >
              {isLoggingIn ? 'Authenticating Admin...' : 'Enter Admin Control Center'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // LOGGED-IN ADMIN DASHBOARD
  // ----------------------------------------------------
  const filteredInventory = inventory.filter(item => {
    if (categoryFilter === 'all') return true;
    return item.category === categoryFilter;
  });

  const filteredOrders = orders.filter(order => {
    if (orderStatusFilter !== 'all' && order.status !== orderStatusFilter) return false;
    if (orderSearchQuery) {
      const q = orderSearchQuery.toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.customerEmail.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const lowStockCount = summaryStats?.lowStockCount || inventory.filter(i => i.stock < i.threshold).length;
  const totalRevenue = summaryStats?.revenue || orders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-6 pb-16">
      
      {/* Admin Action Feedback Toast */}
      {actionFeedback && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-amber-300 border border-amber-400 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center space-x-2 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Top Banner & Fast Metric Cards */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-bold border border-red-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Master Administrator Control Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display">
            Kitchen Inventory & Order Pipeline
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Node-Cron background monitor active. Stock automatically decrements with each verified order.
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="admin-btn-trigger-cron"
            onClick={handleTriggerCronStockCheck}
            title="Execute scheduled Node-cron low-stock check immediately"
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow transition-all font-display"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Run Cron Stock Monitor</span>
          </button>

          <button
            onClick={handleResetDemoData}
            title="Reset to factory demo database"
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs border border-slate-700 flex items-center space-x-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo DB</span>
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-display font-medium">
            <span>Total Orders</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black font-mono text-slate-900">{orders.length}</p>
          <p className="text-[11px] text-emerald-600 font-bold">
            {orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length} active in kitchen
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-display font-medium">
            <span>Inventory SKUs</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black font-mono text-slate-900">{inventory.length}</p>
          <p className="text-[11px] text-slate-500">5 Bases, 5 Sauces, 5 Cheeses, 8 Veg</p>
        </div>

        <div className={`p-5 rounded-3xl border shadow-sm space-y-1 ${
          lowStockCount > 0 
            ? 'bg-amber-50/80 border-amber-300 text-amber-950' 
            : 'bg-white border-amber-100 text-slate-900'
        }`}>
          <div className="flex items-center justify-between text-xs font-display font-bold">
            <span>Low Stock Alerts</span>
            <AlertTriangle className={`w-4 h-4 ${lowStockCount > 0 ? 'text-amber-600 animate-bounce' : 'text-slate-400'}`} />
          </div>
          <p className="text-2xl font-black font-mono">{lowStockCount}</p>
          <p className="text-[11px] font-bold text-amber-700">
            {lowStockCount > 0 ? 'Below safety threshold' : 'All stocks optimal'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-display font-medium">
            <span>Gross Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black font-mono text-emerald-700">₹{Math.round(totalRevenue)}</p>
          <p className="text-[11px] text-slate-500">Verified via Razorpay</p>
        </div>

      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-amber-100 pb-2 overflow-x-auto">
        <button
          id="admin-tab-inventory"
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap font-display ${
            activeTab === 'inventory'
              ? 'bg-slate-900 text-amber-300 shadow-sm'
              : 'bg-amber-50 text-slate-700 hover:bg-amber-100/70'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Live Inventory Dashboard ({inventory.length})</span>
          {lowStockCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.2 rounded-full font-mono font-bold">
              {lowStockCount}
            </span>
          )}
        </button>

        <button
          id="admin-tab-orders"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap font-display ${
            activeTab === 'orders'
              ? 'bg-slate-900 text-amber-300 shadow-sm'
              : 'bg-amber-50 text-slate-700 hover:bg-amber-100/70'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Incoming Order Management ({orders.length})</span>
        </button>

        <button
          id="admin-tab-alerts"
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap font-display ${
            activeTab === 'alerts'
              ? 'bg-slate-900 text-amber-300 shadow-sm'
              : 'bg-amber-50 text-slate-700 hover:bg-amber-100/70'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Automated Stock Email Logs ({emails.filter(e => e.type === 'low_stock_alert').length})</span>
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: INVENTORY MANAGEMENT */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'inventory' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Category Filter Pills */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'base', label: 'Pizza Bases (5)' },
                { id: 'sauce', label: 'Sauces (5)' },
                { id: 'cheese', label: 'Cheeses (5)' },
                { id: 'vegetable', label: 'Vegetables (8)' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all font-display ${
                    categoryFilter === cat.id
                      ? 'bg-slate-900 text-amber-300 shadow-sm'
                      : 'bg-amber-50 hover:bg-amber-100 text-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500 flex items-center space-x-2 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              <span>&lt; Threshold (Automated Alert Active)</span>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-3xl border border-amber-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-amber-50/50 text-slate-600 uppercase tracking-wider font-bold border-b border-amber-100 font-display">
                  <tr>
                    <th className="py-4 px-5">Item & Category</th>
                    <th className="py-4 px-5">Current Stock</th>
                    <th className="py-4 px-5">Safety Threshold</th>
                    <th className="py-4 px-5">Add-on Price</th>
                    <th className="py-4 px-5">Stock Status</th>
                    <th className="py-4 px-5 text-right">Quick Stock Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-amber-50 text-slate-700">
                  {filteredInventory.map(item => {
                    const isLow = item.stock < item.threshold;
                    const isOut = item.stock <= 0;
                    const isEditing = editingItemId === item.id;

                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-amber-50/40 transition-colors ${
                          isLow ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        {/* Name & Category */}
                        <td className="py-4 px-5">
                          <div>
                            <span className="font-bold text-slate-900 text-sm block font-display">{item.name}</span>
                            <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.2 rounded-md bg-amber-100/60 text-amber-900">
                              {item.category}
                            </span>
                          </div>
                        </td>

                        {/* Current Stock */}
                        <td className="py-4 px-5">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editForm.stock}
                              onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })}
                              className="w-20 px-2.5 py-1 rounded-lg border border-amber-500 font-mono text-xs font-bold"
                            />
                          ) : (
                            <div className="flex items-center space-x-1.5">
                              <span className={`text-base font-black font-mono ${
                                isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'
                              }`}>
                                {item.stock}
                              </span>
                              <span className="text-slate-400 text-[11px] font-medium">{item.unit}</span>
                            </div>
                          )}
                        </td>

                        {/* Threshold */}
                        <td className="py-4 px-5">
                          {isEditing ? (
                            <input
                              type="number"
                              min="1"
                              value={editForm.threshold}
                              onChange={(e) => setEditForm({ ...editForm, threshold: Number(e.target.value) })}
                              className="w-16 px-2.5 py-1 rounded-lg border border-slate-300 font-mono text-xs"
                            />
                          ) : (
                            <span className="font-mono text-slate-600 font-semibold">{item.threshold} {item.unit}</span>
                          )}
                        </td>

                        {/* Price */}
                        <td className="py-4 px-5">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editForm.price}
                              onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                              className="w-16 px-2.5 py-1 rounded-lg border border-slate-300 font-mono text-xs"
                            />
                          ) : (
                            <span className="font-mono font-bold text-slate-900">
                              {item.price > 0 ? `+₹${item.price}` : 'Free'}
                            </span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-5">
                          {isOut ? (
                            <span className="bg-red-100 text-red-800 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center space-x-1 w-fit">
                              <span>⚠️</span>
                              <span>Out of Stock</span>
                            </span>
                          ) : isLow ? (
                            <span className="bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center space-x-1 w-fit">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Low Stock (&lt;{item.threshold})</span>
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center space-x-1 w-fit">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Sufficient</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => handleSaveItemEdit(item.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </button>
                              <button
                                onClick={() => setEditingItemId(null)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1.5 rounded-xl text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end space-x-1">
                              {/* Quick -5 button */}
                              <button
                                onClick={() => handleAdjustStock(item.id, -5)}
                                title="Subtract 5 units"
                                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>

                              {/* Quick +10 button */}
                              <button
                                onClick={() => handleAdjustStock(item.id, 10)}
                                title="Add 10 units (Restock)"
                                className="px-2.5 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 flex items-center justify-center font-bold text-xs transition-colors"
                              >
                                +10
                              </button>

                              {/* Edit Modal / Row */}
                              <button
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setEditForm({
                                    stock: item.stock,
                                    threshold: item.threshold,
                                    price: item.price,
                                    name: item.name
                                  });
                                }}
                                title="Edit Item & Threshold"
                                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: INCOMING ORDER PIPELINE & STATUS DISPATCH */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'orders' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Order Filters & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-amber-100">
            <div className="flex items-center space-x-2 flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Order # or Customer Name..."
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                className="w-full text-xs bg-transparent focus:outline-none text-slate-900 font-medium"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto">
              {['all', 'Order Received', 'In Kitchen', 'Sent to Delivery', 'Delivered'].map(status => (
                <button
                  key={status}
                  onClick={() => setOrderStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap font-display ${
                    orderStatusFilter === status
                      ? 'bg-slate-900 text-amber-300'
                      : 'bg-amber-50 hover:bg-amber-100 text-slate-700'
                  }`}
                >
                  {status === 'all' ? 'All Orders' : status}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Cards / Table */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-amber-100 text-center space-y-2">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700 font-display">No orders match the filter criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => (
                <div
                  key={order.id}
                  id={`admin-order-card-${order.id}`}
                  className="bg-white rounded-3xl border border-amber-100 p-5 sm:p-6 shadow-sm space-y-4"
                >
                  {/* Order Top Strip */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-50 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-extrabold text-base text-slate-900">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        ({new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-lg text-[10px]">
                        ✓ Razorpay Paid (₹{order.total})
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-500 font-medium">Status:</span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        order.status === 'Delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'Sent to Delivery'
                          ? 'bg-blue-100 text-blue-800 font-extrabold'
                          : 'bg-amber-100 text-amber-900 font-extrabold'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Order Body: Customer & Item Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    
                    {/* Customer */}
                    <div className="bg-amber-50/50 p-3.5 rounded-2xl space-y-1 border border-amber-100/50">
                      <p className="font-bold text-slate-900 font-display">{order.customerName}</p>
                      <p className="text-slate-600">{order.customerPhone}</p>
                      <p className="text-slate-500">{order.deliveryAddress.street}, {order.deliveryAddress.city}</p>
                    </div>

                    {/* Items */}
                    <div className="md:col-span-2 space-y-1.5">
                      <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px] font-display">
                        Ordered Pizzas & Ingredients:
                      </p>
                      <div className="space-y-1">
                        {order.items.map(item => (
                          <div key={item.id} className="flex items-center justify-between text-slate-800 bg-amber-50/40 p-2.5 rounded-xl border border-amber-100/40">
                            <div>
                              <span className="font-bold font-display">{item.quantity}× {item.name}</span>
                              <span className="text-slate-500 text-[11px] ml-1.5">({item.size})</span>
                              {item.customConfig && (
                                <p className="text-[10px] text-slate-500">
                                  {item.customConfig.base.name} • {item.customConfig.sauce.name} • {item.customConfig.cheese.name}
                                </p>
                              )}
                            </div>
                            <span className="font-mono font-bold text-slate-900">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Real-Time Status Transition Stepper Buttons */}
                  <div className="pt-3 border-t border-amber-50 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-display">
                      Advance Kitchen / Delivery State:
                    </span>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'Order Received')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          order.status === 'Order Received' 
                            ? 'bg-amber-500 text-slate-950 font-black shadow' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        1. Order Received
                      </button>

                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'In Kitchen')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          order.status === 'In Kitchen' 
                            ? 'bg-amber-500 text-slate-950 font-black shadow' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        2. In Kitchen (Baking)
                      </button>

                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'Sent to Delivery')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          order.status === 'Sent to Delivery' 
                            ? 'bg-blue-600 text-white font-black shadow' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        3. Sent to Delivery
                      </button>

                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'Delivered')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          order.status === 'Delivered' 
                            ? 'bg-emerald-600 text-white font-black shadow' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        4. Delivered ✓
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: AUTOMATED STOCK EMAIL NOTIFICATION LOGS */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'alerts' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs uppercase tracking-wider font-display">
              <Mail className="w-4 h-4" />
              <span>Node-Cron Automated Alert Dispatch Log</span>
            </div>
            <p className="text-xs text-slate-300">
              When any inventory item (bases, sauces, cheeses, veggies) falls below the threshold (e.g. 20 units), the background scheduler generates an urgent low-stock audit email.
            </p>
          </div>

          <div className="space-y-3">
            {emails.filter(e => e.type === 'low_stock_alert').length === 0 ? (
              <div className="bg-white p-10 rounded-3xl border border-amber-100 text-center text-slate-500 text-xs font-medium">
                No low-stock alert emails generated yet. All inventory is above configured thresholds.
              </div>
            ) : (
              emails.filter(e => e.type === 'low_stock_alert').map(email => (
                <div
                  key={email.id}
                  className="bg-white rounded-3xl border border-amber-100 p-5 sm:p-6 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] bg-red-100 text-red-800 font-black px-2.5 py-0.5 rounded-full uppercase">
                        Automated Stock Warning
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 mt-1 font-display">{email.subject}</h4>
                      <p className="text-xs text-slate-500">Sent to: <span className="font-mono text-slate-800 font-semibold">{email.to}</span></p>
                    </div>

                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(email.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-100 font-mono text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                    {email.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
