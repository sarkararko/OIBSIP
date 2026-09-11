import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  Smartphone, 
  Building2, 
  Wallet, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Lock,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCart } from '../context/CartContext';
import { apiUrl } from '../config/api';

interface RazorpayModalProps {
  isOpen: boolean;
  orderData: any;
  onClose: () => void;
  onPaymentSuccess: (confirmedOrder: any) => void;
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  isOpen,
  orderData,
  onClose,
  onPaymentSuccess
}) => {
  const { clearCart } = useCart();
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'upi' | 'netbanking'>('card');
  const [processing, setProcessing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  if (!isOpen || !orderData) return null;

  const handleSimulatePayment = async (status: 'success' | 'failure') => {
    if (status === 'failure') {
      setErrorStatus('Simulated Payment Declined by User Bank. No charges were made.');
      return;
    }

    setErrorStatus(null);
    setProcessing(true);

    try {
      const token = localStorage.getItem('pizzacraft_token');

      // Call backend to confirm order and automatically decrement stock
      const res = await fetch(apiUrl('/api/orders/confirm'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items: orderData.items,
          deliveryAddress: orderData.deliveryAddress,
          subtotal: orderData.subtotal,
          discount: orderData.discount,
          tax: orderData.tax,
          deliveryFee: orderData.deliveryFee,
          total: orderData.total,
          paymentDetails: {
            method: 'razorpay',
            razorpay_payment_id: `pay_rzp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            razorpay_order_id: orderData.razorpayOrderId
          }
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorStatus(data.error || 'Failed to place order.');
        setProcessing(false);
        return;
      }

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }

      clearCart();
      onPaymentSuccess(data.order);

    } catch (err: any) {
      setErrorStatus(err.message || 'Payment verification failed.');
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      
      {/* Razorpay Popup Card */}
      <div className="bg-white text-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-amber-100">
        
        {/* Razorpay Top Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between relative border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
              <span className="font-display text-lg tracking-tight">RZ</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-white font-display">PizzaCraft Artisanal Bar</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-2 py-0.2 rounded font-mono font-bold">
                  TEST MODE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">Order: {orderData.razorpayOrderId}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block font-medium">Amount to Pay</span>
            <span className="text-2xl font-black font-mono text-amber-300">₹{orderData.amountInRupees || orderData.total}</span>
          </div>
        </div>

        {/* Test Notice Banner */}
        <div className="bg-amber-50 border-b border-amber-100 px-5 py-2.5 text-[11px] text-amber-900 flex items-center justify-between font-medium">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Razorpay Sandbox Checkout — Test Mode Active</span>
          </div>
          <span className="font-bold font-mono text-amber-950">INR</span>
        </div>

        {/* Main Body */}
        <div className="p-6 space-y-5">
          
          {errorStatus && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-2xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorStatus}</span>
            </div>
          )}

          {/* Payment Method Selector Tabs */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => setSelectedMethod('card')}
              className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all font-display ${
                selectedMethod === 'card'
                  ? 'border-amber-400 bg-amber-50 text-slate-950 shadow-sm font-bold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-5 h-5 text-amber-600" />
              <span className="text-xs font-bold">Cards</span>
            </button>

            <button
              onClick={() => setSelectedMethod('upi')}
              className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all font-display ${
                selectedMethod === 'upi'
                  ? 'border-amber-400 bg-amber-50 text-slate-950 shadow-sm font-bold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Smartphone className="w-5 h-5 text-amber-600" />
              <span className="text-xs font-bold">UPI / QR</span>
            </button>

            <button
              onClick={() => setSelectedMethod('netbanking')}
              className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all font-display ${
                selectedMethod === 'netbanking'
                  ? 'border-amber-400 bg-amber-50 text-slate-950 shadow-sm font-bold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-5 h-5 text-amber-600" />
              <span className="text-xs font-bold">NetBanking</span>
            </button>
          </div>

          {/* Method Content */}
          <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 space-y-3 text-xs">
            {selectedMethod === 'card' && (
              <div className="space-y-2">
                <p className="font-bold text-slate-800 font-display">Pre-filled Test Card</p>
                <div className="bg-white p-3 rounded-xl border border-amber-100 font-mono text-xs flex justify-between items-center shadow-sm">
                  <span className="font-bold text-slate-900">4111 •••• •••• 1111</span>
                  <span className="text-slate-500">12/28 • CVV 123</span>
                </div>
                <p className="text-[11px] text-slate-500">Visa, Mastercard, RuPay & Amex test tokens supported.</p>
              </div>
            )}

            {selectedMethod === 'upi' && (
              <div className="space-y-2">
                <p className="font-bold text-slate-800 font-display">Instant UPI Test ID</p>
                <div className="bg-white p-3 rounded-xl border border-amber-100 font-mono text-xs text-blue-700 font-bold shadow-sm">
                  pizzacraft@razorpay
                </div>
                <p className="text-[11px] text-slate-500">Supports GPay, PhonePe, Paytm, and BHIM UPI.</p>
              </div>
            )}

            {selectedMethod === 'netbanking' && (
              <div className="space-y-2">
                <p className="font-bold text-slate-800 font-display">Popular Test Banks</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-white rounded-xl border border-amber-100 text-center font-bold text-slate-800 shadow-sm">HDFC Bank (Test)</div>
                  <div className="p-2.5 bg-white rounded-xl border border-amber-100 text-center font-bold text-slate-800 shadow-sm">ICICI Bank (Test)</div>
                  <div className="p-2.5 bg-white rounded-xl border border-amber-100 text-center font-bold text-slate-800 shadow-sm">SBI (Test)</div>
                  <div className="p-2.5 bg-white rounded-xl border border-amber-100 text-center font-bold text-slate-800 shadow-sm">Axis Bank (Test)</div>
                </div>
              </div>
            )}
          </div>

          {/* Test Simulation Controls */}
          <div className="space-y-3 pt-1">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider text-center font-display">
              Razorpay Sandbox Simulation
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-razorpay-simulate-success"
                onClick={() => handleSimulatePayment('success')}
                disabled={processing}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2 font-display cursor-pointer"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Simulate Success</span>
                  </>
                )}
              </button>

              <button
                id="btn-razorpay-simulate-failure"
                onClick={() => handleSimulatePayment('failure')}
                disabled={processing}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-2xl text-xs transition-colors flex items-center justify-center space-x-1.5 font-display cursor-pointer"
              >
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>Simulate Failure</span>
              </button>
            </div>
          </div>

        </div>

        {/* Razorpay Footer */}
        <div className="bg-amber-50/50 p-4 border-t border-amber-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Secured by Razorpay Payments</span>
          </div>

          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer font-display"
          >
            Cancel & Return
          </button>
        </div>

      </div>

    </div>
  );
};
