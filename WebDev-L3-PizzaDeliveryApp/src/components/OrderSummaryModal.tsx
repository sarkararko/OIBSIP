import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Phone, 
  User as UserIcon, 
  FileText, 
  ShieldCheck, 
  CreditCard, 
  Lock, 
  ChevronRight, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface OrderSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInitiateRazorpay: (orderData: any) => void;
}

export const OrderSummaryModal: React.FC<OrderSummaryModalProps> = ({
  isOpen,
  onClose,
  onInitiateRazorpay
}) => {
  const { items, subtotal, discount, deliveryAddress, setDeliveryAddress } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [addressForm, setAddressForm] = useState({
    street: deliveryAddress.street || user?.address || 'Flat 402, Sunset Heights, Baker Street',
    city: deliveryAddress.city || 'Mumbai',
    pincode: deliveryAddress.pincode || '400001',
    phone: deliveryAddress.phone || user?.phone || '+91 99887 76655',
    notes: deliveryAddress.notes || 'Please leave at door if call goes unanswered'
  });

  React.useEffect(() => {
    if (isOpen && user) {
      setAddressForm(prev => ({
        ...prev,
        phone: deliveryAddress.phone || user.phone || prev.phone,
        street: deliveryAddress.street || user.address || prev.street
      }));
    }
  }, [isOpen, user]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const deliveryFee = subtotal > 500 ? 0 : 40;
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Math.round(taxableAmount * 0.05 * 100) / 100;
  const grandTotal = Math.round((taxableAmount + tax + deliveryFee) * 100) / 100;

  const handleProceedToPayment = async () => {
    if (!addressForm.street || !addressForm.city || !addressForm.pincode || !addressForm.phone) {
      setErrorMsg('Please complete your full delivery address and contact phone.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      // Sync address
      setDeliveryAddress(addressForm);

      const token = localStorage.getItem('pizzacraft_token');

      // Call backend to create Razorpay Order
      const res = await fetch('/api/orders/create-razorpay-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items,
          deliveryAddress: addressForm,
          discount
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to initiate order.');
        if (data.details && Array.isArray(data.details)) {
          setErrorMsg(data.details.join('\n'));
        }
        setIsSubmitting(false);
        return;
      }

      // Pass initialized order details to Razorpay Modal
      onInitiateRazorpay({
        ...data,
        items,
        deliveryAddress: addressForm,
        subtotal,
        discount,
        tax,
        deliveryFee,
        total: grandTotal
      });

    } catch (err: any) {
      setErrorMsg(err.message || 'Payment server connection error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white text-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-amber-100/80 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-900 text-white flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Step 2: Review & Pay
              </span>
              <span className="text-xs text-slate-400 flex items-center space-x-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Est. Delivery: 25-30 Mins</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display">Order Summary & Delivery Details</h2>
          </div>

          <button
            id="order-summary-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-2xl flex items-start space-x-2 whitespace-pre-line">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Delivery Address Section */}
          <div className="space-y-3 bg-amber-50/60 p-4 sm:p-5 rounded-2xl border border-amber-100">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm font-display">
              <MapPin className="w-4 h-4 text-amber-600" />
              <span>Delivery Destination & Contact</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Street Address, Flat / House No.</label>
                <input
                  type="text"
                  value={addressForm.street}
                  onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                  placeholder="e.g. 402, Sunset Heights, Baker Street"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">City / Locality</label>
                <input
                  type="text"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  placeholder="e.g. Mumbai"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Postal PIN Code</label>
                <input
                  type="text"
                  value={addressForm.pincode}
                  onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                  placeholder="e.g. 400001"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number for Rider</label>
                <input
                  type="text"
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  placeholder="+91 99887 76655"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delivery Instructions (Optional)</label>
                <input
                  type="text"
                  value={addressForm.notes}
                  onChange={(e) => setAddressForm({ ...addressForm, notes: e.target.value })}
                  placeholder="e.g. Ring bell, leave with security..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white"
                />
              </div>
            </div>
          </div>

          {/* Itemized Order Table */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 font-display">
              Ordered Items ({items.length})
            </h4>

            <div className="border border-amber-100 rounded-2xl overflow-hidden divide-y divide-amber-50 bg-white">
              {items.map(item => (
                <div key={item.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-amber-50/40 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-slate-900 font-display">{item.name}</span>
                      <span className="text-slate-400">({item.size})</span>
                    </div>
                    {item.customConfig ? (
                      <p className="text-[11px] text-slate-500">
                        {item.customConfig.base.name} • {item.customConfig.sauce.name} • {item.customConfig.cheese.name}
                        {item.customConfig.vegetables.length > 0 && ` + ${item.customConfig.vegetables.length} veggies`}
                      </p>
                    ) : item.presetPizza ? (
                      <p className="text-[11px] text-slate-500">{item.presetPizza.tagline}</p>
                    ) : null}
                  </div>

                  <div className="text-right">
                    <span className="text-slate-500 font-mono">{item.quantity} × ₹{item.price} = </span>
                    <span className="font-bold text-slate-900 font-mono">₹{item.price * item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Final Billing & Payment Breakdown */}
          <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Items Subtotal:</span>
              <span className="font-mono font-bold">₹{subtotal}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>Coupon Savings:</span>
                <span className="font-mono">-₹{discount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">GST (5% Restaurant Tax):</span>
              <span className="font-mono">₹{tax}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Delivery & Packaging:</span>
              <span className="font-mono">{deliveryFee === 0 ? <span className="text-emerald-400 font-bold">FREE</span> : `₹${deliveryFee}`}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-white pt-2.5 border-t border-slate-800 font-display">
              <span>Total Payable Amount:</span>
              <span className="text-amber-400 font-mono text-lg font-black">₹{grandTotal}</span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-amber-50/40 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-500 text-xs hidden sm:flex">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>256-bit Encrypted Test Payment</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
            >
              Back to Cart
            </button>

            <button
              id="btn-pay-razorpay"
              onClick={handleProceedToPayment}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>{isSubmitting ? 'Initializing Razorpay...' : `Pay ₹${grandTotal} via Razorpay`}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
