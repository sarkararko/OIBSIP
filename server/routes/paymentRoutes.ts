import { Router, Request, Response } from 'express';
import { createRazorpayOrder, verifyRazorpaySignature, RAZORPAY_KEY_ID } from '../services/razorpayService.js';

const router = Router();

// POST /api/payment/create-order - Create Razorpay order ID
router.post('/create-order', (req: Request, res: Response): void => {
  try {
    const { amount, receipt } = req.body;
    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Valid amount is required' });
      return;
    }

    const receiptId = receipt || `rcpt_${Date.now()}`;
    const orderData = createRazorpayOrder(amount, receiptId);

    res.json({
      success: true,
      order: orderData,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to initiate Razorpay order' });
  }
});

// POST /api/payment/verify - Cryptographic signature check
router.post('/verify', (req: Request, res: Response): void => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      res.status(400).json({
        success: false,
        error: 'Razorpay signature verification failed',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Razorpay payment verified successfully',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Payment verification error' });
  }
});

export default router;
