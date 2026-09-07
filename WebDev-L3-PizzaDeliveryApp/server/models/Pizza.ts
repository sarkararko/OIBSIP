import mongoose, { Schema, Document } from 'mongoose';

export interface IPizza extends Document {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  basePrice: number;
  isVeg: boolean;
  image: string;
  rating: number;
  badge?: string;
  defaultCrust: string;
  defaultSauce: string;
  defaultCheese: string;
  defaultVeggies: string[];
}

export const PizzaSchema = new Schema<IPizza>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, default: 'signature' },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    basePrice: { type: Number, required: true },
    isVeg: { type: Boolean, default: true },
    image: { type: String, default: '' },
    rating: { type: Number, default: 4.8 },
    badge: { type: String, default: '' },
    defaultCrust: { type: String, default: 'base_sourdough' },
    defaultSauce: { type: String, default: 'sauce_san_marzano' },
    defaultCheese: { type: String, default: 'cheese_mozzarella' },
    defaultVeggies: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

export const PizzaModel = mongoose.models.Pizza || mongoose.model<IPizza>('Pizza', PizzaSchema);
