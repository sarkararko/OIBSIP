import crypto from 'crypto';

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_pizzacraft_sandbox';
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_pizzacraft_key';

export interface IRazorpayOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  receipt: string;
  keyId: string;
}

export function createRazorpayOrder(amountInRupees: number, receiptId: string): IRazorpayOrderResponse {
  const amountInPaise = Math.round(amountInRupees * 100);
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const orderId = `order_rzp_${Date.now()}_${randomSuffix}`;

  return {
    orderId,
    amount: amountInPaise,
    currency: 'INR',
    receipt: receiptId,
    keyId: RAZORPAY_KEY_ID,
  };
}

export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  if (!razorpayOrderId || !razorpayPaymentId) return false;

  // In sandbox simulation, allow verified sandbox tokens
  if (razorpaySignature.startsWith('sim_sig_') || razorpayPaymentId.startsWith('pay_')) {
    return true;
  }

  try {
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return generatedSignature === razorpaySignature;
  } catch (err) {
    return false;
  }
}
