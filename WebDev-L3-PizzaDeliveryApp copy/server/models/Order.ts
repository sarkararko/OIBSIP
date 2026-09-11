import mongoose, { Schema, Document } from 'mongoose';

export type OrderStatus = 'Order Received' | 'In Kitchen' | 'Sent to Delivery' | 'Delivered' | 'Cancelled';

export interface IOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size: 'Regular (10")' | 'Medium (12")' | 'Large (14")';
  image?: string;
  isCustom?: boolean;
  customConfig?: {
    base: { id: string; name: string; price: number };
    sauce: { id: string; name: string; price: number };
    cheese: { id: string; name: string; price: number };
    veggies: Array<{ id: string; name: string; price: number }>;
  };
}

export interface IOrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  note: string;
}

export interface IOrder extends Document {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: IOrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  deliveryAddress: {
    street: string;
    city: string;
    pincode: string;
    notes?: string;
  };
  status: OrderStatus;
  paymentMethod: 'razorpay' | 'cod';
  paymentStatus: 'pending' | 'paid' | 'failed';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  timeline: IOrderTimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = new Schema<IOrder>(
  {
    id: { type: String, required: true, unique: true },
    orderNumber: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    items: [
      {
        id: String,
        name: String,
        price: Number,
        quantity: Number,
        size: String,
        image: String,
        isCustom: Boolean,
        customConfig: Schema.Types.Mixed,
      },
    ],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    deliveryAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      pincode: { type: String, required: true },
      notes: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['Order Received', 'In Kitchen', 'Sent to Delivery', 'Delivered', 'Cancelled'],
      default: 'Order Received',
    },
    paymentMethod: { type: String, default: 'razorpay' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'paid' },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    timeline: [
      {
        status: String,
        timestamp: String,
        note: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const OrderModel = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
