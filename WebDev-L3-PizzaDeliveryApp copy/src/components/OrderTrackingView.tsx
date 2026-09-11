import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  ChefHat, 
  Bike, 
  Home, 
  AlertCircle, 
  RefreshCw, 
  MapPin, 
  Phone, 
  Receipt, 
  ChevronRight,
  Pizza,
  Sparkles
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../config/api';

interface OrderTrackingViewProps {
  initialOrderId?: string | null;
  onNavigateToMenu: () => void;
  onNavigateToBuilder: () => void;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  initialOrderId,
  onNavigateToMenu,
  onNavigateToBuilder
}) => {
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();
    // Real-time polling every 2.5 seconds to capture live kitchen & delivery updates
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 2500);
    return () => clearInterval(interval);
  }, [initialOrderId]);

  const fetchOrders = async (isBackground: boolean = false) => {
    try {
      if (!isBackground) setLoading(true);
      const token = localStorage.getItem('pizzacraft_token');

      let fetchedOrders: Order[] = [];

      if (token) {
        const res = await fetch(apiUrl('/api/orders/my-orders'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          fetchedOrders = data.orders || [];
        }
      }

      // If initialOrderId passed (e.g. from guest checkout or direct link), also fetch it
      if (initialOrderId) {
        const trackRes = await fetch(apiUrl(`/api/orders/track/${encodeURIComponent(initialOrderId)}`));
        if (trackRes.ok) {
          const trackData = await trackRes.json();
          if (trackData.order && !fetchedOrders.some(o => o.id === trackData.order.id)) {
            fetchedOrders = [trackData.order, ...fetchedOrders];
          }
        }
      }

      setOrders(fetchedOrders);

      // Auto-select latest active order or specific tracked order
      if (fetchedOrders.length > 0) {
        if (initialOrderId) {
          const target = fetchedOrders.find(o => o.id === initialOrderId || o.orderNumber === initialOrderId);
          if (target) setSelectedOrder(target);
          else setSelectedOrder(fetchedOrders[0]);
        } else if (!selectedOrder) {
          setSelectedOrder(fetchedOrders[0]);
        } else {
          // Refresh selected order data in place
          const updatedSelected = fetchedOrders.find(o => o.id === selectedOrder.id);
          if (updatedSelected) setSelectedOrder(updatedSelected);
        }
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      if (!isBackground) setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchOrders(false);
  };

  // Status step configuration
  const statusSteps: { key: OrderStatus; label: string; icon: any; desc: string }[] = [
    { key: 'Order Received', label: 'Order Received', icon: Receipt, desc: 'Payment verified & order queued' },
    { key: 'In Kitchen', label: 'In Kitchen', icon: ChefHat, desc: 'Dough stretched & stone-baked' },
    { key: 'Sent to Delivery', label: 'Sent to Delivery', icon: Bike, desc: 'Rider on the road in thermal box' },
    { key: 'Delivered', label: 'Delivered', icon: Home, desc: 'Enjoy your hot artisanal pizza!' }
  ];

  const getStepIndex = (status: OrderStatus) => {
    if (status === 'Order Received') return 0;
    if (status === 'In Kitchen') return 1;
    if (status === 'Sent to Delivery') return 2;
    if (status === 'Delivered') return 3;
    return 0;
  };

  if (loading && orders.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-amber-100 text-center space-y-4 animate-pulse">
        <div className="w-12 h-12 bg-amber-200 rounded-full mx-auto" />
        <p className="text-slate-600 font-medium font-display">Connecting to Kitchen Live Status...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-10 sm:p-14 border border-amber-100 text-center max-w-xl mx-auto space-y-5 shadow-sm">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto text-3xl">
          🍕
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold font-display text-slate-900">No Active Orders Yet</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            Place your first artisanal pizza order to experience real-time stone-oven tracking from kitchen to doorstep.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={onNavigateToMenu}
            className="bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold px-5 py-2.5 rounded-xl text-xs shadow transition-all"
          >
            Browse Pizza Menu
          </button>
          <button
            onClick={onNavigateToBuilder}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow transition-all"
          >
            Launch Custom Builder
          </button>
        </div>
      </div>
    );
  }

  const currentStepIdx = selectedOrder ? getStepIndex(selectedOrder.status) : 0;

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Real-Time Kitchen Sync (Live 2s Polling)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display">Live Order Status Tracker</h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Tracking order <span className="font-mono text-amber-300 font-bold">{selectedOrder?.orderNumber}</span>
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          className="self-start sm:self-auto bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 flex items-center space-x-2 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Main Grid: Live Status Stepper & Order Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT / CENTER: Live Timeline & Stage Details */}
        <div className="lg:col-span-8 space-y-6">
          
          {selectedOrder && (
            <div className="bg-white rounded-3xl border border-amber-100 p-6 sm:p-8 shadow-sm space-y-8">
              
              {/* Status Header Badge & ETA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-50 pb-5">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider font-display">Current Stage</span>
                  <h2 className="text-2xl font-bold text-slate-900 font-display flex items-center space-x-2 mt-0.5">
                    <span>{selectedOrder.status}</span>
                    <span className={`text-xs px-3 py-1 rounded-full font-sans font-bold ${
                      selectedOrder.status === 'Delivered' 
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedOrder.status === 'Sent to Delivery'
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : 'bg-amber-100 text-amber-900 animate-pulse'
                    }`}>
                      {selectedOrder.status === 'Delivered' ? 'Completed' : 'In Progress'}
                    </span>
                  </h2>
                </div>

                <div className="bg-amber-50/60 border border-amber-100 p-3.5 rounded-2xl flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-700 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium block">Estimated Delivery</span>
                    <span className="text-sm font-bold text-slate-900 font-display">
                      {selectedOrder.status === 'Delivered' ? 'Delivered Just Now' : '~20-25 Minutes'}
                    </span>
                  </div>
                </div>
              </div>

              {/* REAL-TIME PROGRESS BAR & 4-STAGE STEPPER */}
              <div className="space-y-4">
                <div className="relative">
                  
                  {/* Background Track Line */}
                  <div className="absolute top-6 left-6 right-6 h-1.5 bg-slate-100 -translate-y-1/2 z-0 hidden sm:block rounded-full" />

                  {/* Active Filled Progress Line */}
                  <div 
                    className="absolute top-6 left-6 h-1.5 bg-gradient-to-r from-amber-500 to-red-600 -translate-y-1/2 z-0 transition-all duration-700 hidden sm:block rounded-full"
                    style={{
                      width: `${(currentStepIdx / 3) * 100}%`
                    }}
                  />

                  {/* 4 Step Nodes */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative z-10">
                    {statusSteps.map((step, idx) => {
                      const isComplete = idx <= currentStepIdx;
                      const isCurrent = idx === currentStepIdx;
                      const Icon = step.icon;

                      return (
                        <div key={step.key} className="flex sm:flex-col items-center sm:text-center space-x-3 sm:space-x-0 space-y-0 sm:space-y-2">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-md ${
                            isCurrent
                              ? 'bg-gradient-to-tr from-amber-500 to-red-600 text-white ring-4 ring-amber-200 scale-110'
                              : isComplete
                              ? 'bg-slate-900 text-amber-300'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>

                          <div className="space-y-0.5">
                            <p className={`text-xs font-bold ${
                              isCurrent ? 'text-amber-800 font-extrabold font-display' : isComplete ? 'text-slate-900 font-display' : 'text-slate-400 font-display'
                            }`}>
                              {step.label}
                            </p>
                            <p className="text-[11px] text-slate-500 line-clamp-2 max-w-[130px] sm:mx-auto">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Real-Time Status Log / Timeline */}
              <div className="pt-6 border-t border-amber-50 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-display">
                  Kitchen & Courier Activity Log
                </h3>

                <div className="space-y-3 bg-amber-50/40 p-4 sm:p-5 rounded-2xl border border-amber-100">
                  {selectedOrder.timeline.map((event, eIdx) => (
                    <div key={eIdx} className="flex items-start space-x-3 text-xs">
                      <div className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                        ✓
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 font-display">{event.status}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-0.5">{event.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Details Card */}
              <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs uppercase tracking-wider font-display">
                  <MapPin className="w-4 h-4" />
                  <span>Delivery Destination</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                  <div>
                    <p className="text-slate-400">Recipient:</p>
                    <p className="font-bold text-white font-display">{selectedOrder.customerName}</p>
                    <p className="text-slate-400">{selectedOrder.customerPhone}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">Address:</p>
                    <p className="font-medium text-white">{selectedOrder.deliveryAddress.street}</p>
                    <p className="text-slate-400">{selectedOrder.deliveryAddress.city} - {selectedOrder.deliveryAddress.pincode}</p>
                  </div>
                </div>

                {selectedOrder.deliveryAddress.notes && (
                  <p className="text-[11px] text-amber-200/90 pt-2 border-t border-slate-800">
                    Note: "{selectedOrder.deliveryAddress.notes}"
                  </p>
                )}
              </div>

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Order Items & Order Selector */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Order Selector Card (if user has multiple orders) */}
          {orders.length > 1 && (
            <div className="bg-white rounded-3xl border border-amber-100 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-display">
                Your Order History ({orders.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {orders.map(order => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`w-full text-left p-3 rounded-2xl border text-xs transition-all flex items-center justify-between ${
                      selectedOrder?.id === order.id
                        ? 'border-amber-400 bg-amber-50 text-slate-900 shadow-sm font-semibold'
                        : 'border-slate-200 hover:bg-amber-50/40 text-slate-600'
                    }`}
                  >
                    <div>
                      <p className="font-bold font-mono text-slate-900">{order.orderNumber}</p>
                      <p className="text-[11px] text-slate-500">{order.items.length} items • ₹{order.total}</p>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                      order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {order.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Itemized Order Receipt */}
          {selectedOrder && (
            <div className="bg-white rounded-3xl border border-amber-100 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-amber-50 pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-1.5 font-display">
                  <Receipt className="w-4 h-4 text-amber-600" />
                  <span>Itemized Receipt</span>
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                  ✓ Paid (Razorpay)
                </span>
              </div>

              {/* Items */}
              <div className="space-y-2.5 text-xs divide-y divide-amber-50">
                {selectedOrder.items.map(item => (
                  <div key={item.id} className="pt-2 first:pt-0 space-y-0.5">
                    <div className="flex justify-between font-bold text-slate-900 font-display">
                      <span>{item.quantity}× {item.name}</span>
                      <span className="font-mono">₹{item.price * item.quantity}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Size: {item.size}</p>
                    {item.customConfig && (
                      <p className="text-[11px] text-slate-500">
                        {item.customConfig.base.name} • {item.customConfig.sauce.name} • {item.customConfig.cheese.name}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Financial summary */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600 font-medium">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono font-bold text-slate-800">₹{selectedOrder.subtotal}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount</span>
                    <span className="font-mono">-₹{selectedOrder.discount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>GST (5%)</span>
                  <span className="font-mono">₹{selectedOrder.tax}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span className="font-mono">{selectedOrder.deliveryFee === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `₹${selectedOrder.deliveryFee}`}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-100 font-display">
                  <span>Total Paid</span>
                  <span className="text-amber-600 font-mono text-base font-black">₹{selectedOrder.total}</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
