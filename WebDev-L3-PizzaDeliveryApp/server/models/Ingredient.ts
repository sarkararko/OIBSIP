import mongoose, { Schema, Document } from 'mongoose';

export type IngredientCategory = 'base' | 'sauce' | 'cheese' | 'veggie' | 'vegetable';

export interface IIngredient extends Document {
  id: string;
  name: string;
  category: IngredientCategory;
  stock: number;
  threshold: number;
  unit: string;
  price: number;
  isVeg: boolean;
  description: string;
  image?: string;
  badge?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const IngredientSchema = new Schema<IIngredient>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, required: true, enum: ['base', 'sauce', 'cheese', 'veggie', 'vegetable'] },
    stock: { type: Number, required: true, default: 50 },
    threshold: { type: Number, required: true, default: 20 },
    unit: { type: String, default: 'units' },
    price: { type: Number, default: 0 },
    isVeg: { type: Boolean, default: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    badge: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

export const IngredientModel = mongoose.models.Ingredient || mongoose.model<IIngredient>('Ingredient', IngredientSchema);
