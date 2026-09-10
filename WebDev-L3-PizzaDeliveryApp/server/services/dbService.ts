import bcrypt from 'bcryptjs';
import { DataStore, INITIAL_INVENTORY, INITIAL_PIZZAS } from '../models/index.js';
import { isMongoConnected } from '../config/db.js';
import { IngredientModel } from '../models/Ingredient.js';
import { PizzaModel } from '../models/Pizza.js';
import { OrderModel } from '../models/Order.js';
import { UserModel } from '../models/User.js';
import { AdminModel } from '../models/Admin.js';
import { VerificationTokenModel } from '../models/VerificationToken.js';
import { PasswordResetTokenModel } from '../models/PasswordResetToken.js';

class DatabaseService {
  private static instance: DatabaseService;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Sync / Seed initial data into MongoDB if connected
  public async seedInitialMongoData(): Promise<void> {
    if (!isMongoConnected()) return;

    try {
      console.log('🔄 Checking and syncing MongoDB with PizzaCraft master dataset...');
      // 1. Seed Ingredients
      const ingredientCount = await (IngredientModel as any).countDocuments();
      if (ingredientCount === 0) {
        console.log(`🌱 Seeding ${INITIAL_INVENTORY.length} ingredients to MongoDB...`);
        for (const item of INITIAL_INVENTORY) {
          await (IngredientModel as any).findOneAndUpdate(
            { id: item.id },
            { ...item },
            { upsert: true, new: true }
          );
        }
      } else {
        // Ensure all 17 Oasis ingredients exist in MongoDB
        for (const item of INITIAL_INVENTORY) {
          const exists = await (IngredientModel as any).findOne({ id: item.id });
          if (!exists) {
            await (IngredientModel as any).create(item);
          }
        }
      }

      // 2. Seed Pizzas
      const pizzaCount = await (PizzaModel as any).countDocuments();
      if (pizzaCount === 0) {
        console.log(`🌱 Seeding ${INITIAL_PIZZAS.length} preset pizzas to MongoDB...`);
        for (const p of INITIAL_PIZZAS) {
          await (PizzaModel as any).findOneAndUpdate(
            { id: p.id },
            { ...p },
            { upsert: true, new: true }
          );
        }
      } else {
        for (const p of INITIAL_PIZZAS) {
          const exists = await (PizzaModel as any).findOne({ id: p.id });
          if (!exists) {
            await (PizzaModel as any).create(p);
          }
        }
      }

      // 3. Seed Demo Admin
      const adminEmail = (process.env.ADMIN_EMAIL || 'admin@pizzacraft.com').toLowerCase();
      const existingAdmin = await (AdminModel as any).findOne({ email: adminEmail });
      if (!existingAdmin) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('admin123', salt);
        await (AdminModel as any).create({
          id: 'adm_master_01',
          name: 'Executive Chef Mario',
          email: adminEmail,
          passwordHash: hash,
          role: 'admin',
          permissions: ['all'],
        });
        console.log('🌱 Seeded default admin in MongoDB (admin@pizzacraft.com)');
      }

      // 4. Seed Demo Customer
      const demoUserEmail = 'user@example.com';
      const existingUser = await (UserModel as any).findOne({ email: demoUserEmail });
      if (!existingUser) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('password123', salt);
        await (UserModel as any).create({
          id: 'usr_demo_01',
          name: 'Marco Rossi',
          email: demoUserEmail,
          passwordHash: hash,
          phone: '+91 98765 43210',
          isVerified: true,
          role: 'customer',
          addresses: [
            {
              street: '42 Artisanal Way, Gourmet Boulevard',
              city: 'Mumbai',
              pincode: '400050',
              notes: 'Ring bell twice',
            },
          ],
        });
        console.log('🌱 Seeded default user in MongoDB (user@example.com)');
      }
    } catch (err) {
      console.error('Failed seeding MongoDB:', err);
    }
  }

  // --- INVENTORY METHODS ---
  public async getInventory(): Promise<any[]> {
    if (isMongoConnected()) {
      try {
        const items = await (IngredientModel as any).find().lean();
        if (items && items.length > 0) {
          return items.map((i: any) => ({
            id: i.id,
            name: i.name,
            category: i.category === 'veggie' ? 'vegetable' : i.category,
            stock: i.stock,
            threshold: i.threshold,
            unit: i.unit,
            price: i.price,
            isVeg: i.isVeg,
            description: i.description,
            image: i.image,
            badge: i.badge,
          }));
        }
      } catch (err) {
        console.error('Error fetching inventory from MongoDB, falling back to DataStore:', err);
      }
    }
    return DataStore.getData().inventory;
  }

  public async getInventoryItem(id: string): Promise<any | null> {
    if (isMongoConnected()) {
      try {
        const item = await (IngredientModel as any).findOne({ id }).lean();
        if (item) return item;
      } catch (err) {
        console.error('Error fetching item from MongoDB:', err);
      }
    }
    return DataStore.getData().inventory.find((i) => i.id === id) || null;
  }

  public async updateInventoryItem(id: string, updates: Partial<any>): Promise<any | null> {
    // Update local DataStore
    const localStore = DataStore.getData();
    const localIndex = localStore.inventory.findIndex((i) => i.id === id);
    let updatedLocal = null;
    if (localIndex !== -1) {
      localStore.inventory[localIndex] = { ...localStore.inventory[localIndex], ...updates };
      DataStore.saveToDisk();
      updatedLocal = localStore.inventory[localIndex];
    }

    if (isMongoConnected()) {
      try {
        const updated = await (IngredientModel as any).findOneAndUpdate(
          { id },
          { $set: updates },
          { new: true }
        ).lean();
        return updated || updatedLocal;
      } catch (err) {
        console.error('Error updating ingredient in MongoDB:', err);
      }
    }

    return updatedLocal;
  }

  public async adjustInventoryStock(id: string, delta: number): Promise<any | null> {
    // Update local DataStore
    const localStore = DataStore.getData();
    const localItem = localStore.inventory.find((i) => i.id === id);
    if (localItem) {
      localItem.stock = Math.max(0, localItem.stock + delta);
      DataStore.saveToDisk();
    }

    if (isMongoConnected()) {
      try {
        const updated = await (IngredientModel as any).findOneAndUpdate(
          { id },
          { $inc: { stock: delta } },
          { new: true }
        ).lean();
        if (updated && updated.stock < 0) {
          await (IngredientModel as any).updateOne({ id }, { $set: { stock: 0 } });
          updated.stock = 0;
        }
        return updated || localItem;
      } catch (err) {
        console.error('Error adjusting inventory stock in MongoDB:', err);
      }
    }

    return localItem;
  }

  // --- PIZZA METHODS ---
  public async getPizzas(): Promise<any[]> {
    if (isMongoConnected()) {
      try {
        const pizzas = await (PizzaModel as any).find().lean();
        if (pizzas && pizzas.length > 0) {
          return pizzas;
        }
      } catch (err) {
        console.error('Error fetching pizzas from MongoDB:', err);
      }
    }
    return DataStore.getData().pizzas;
  }

  public async getPizzaById(id: string): Promise<any | null> {
    if (isMongoConnected()) {
      try {
        const pizza = await (PizzaModel as any).findOne({ id }).lean();
        if (pizza) return pizza;
      } catch (err) {
        console.error('Error fetching pizza by id from MongoDB:', err);
      }
    }
    return DataStore.getData().pizzas.find((p) => p.id === id) || null;
  }

  // --- ORDER METHODS ---
  public async getOrders(): Promise<any[]> {
    if (isMongoConnected()) {
      try {
        const orders = await (OrderModel as any).find().sort({ createdAt: -1 }).lean();
        if (orders) return orders;
      } catch (err) {
        console.error('Error fetching orders from MongoDB:', err);
      }
    }
    return DataStore.getData().orders;
  }

  public async getUserOrders(userId?: string, email?: string): Promise<any[]> {
    if (isMongoConnected()) {
      try {
        const query: any = {};
        if (userId && email) {
          query.$or = [{ userId }, { customerEmail: email.toLowerCase() }];
        } else if (userId) {
          query.userId = userId;
        } else if (email) {
          query.customerEmail = email.toLowerCase();
        }

        const orders = await (OrderModel as any).find(query).sort({ createdAt: -1 }).lean();
        if (orders) return orders;
      } catch (err) {
        console.error('Error fetching user orders from MongoDB:', err);
      }
    }

    const db = DataStore.getData();
    return db.orders.filter((o) => {
      if (userId && o.userId === userId) return true;
      if (email && o.customerEmail.toLowerCase() === email.toLowerCase()) return true;
      return false;
    });
  }

  public async getOrderById(idOrNumber: string): Promise<any | null> {
    if (isMongoConnected()) {
      try {
        const order = await (OrderModel as any).findOne({
          $or: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
        }).lean();
        if (order) return order;
      } catch (err) {
        console.error('Error fetching order from MongoDB:', err);
      }
    }
    return (
      DataStore.getData().orders.find(
        (o) => o.id === idOrNumber || o.orderNumber === idOrNumber
      ) || null
    );
  }

  public async createOrder(orderData: any): Promise<any> {
    // Save to local DataStore
    const db = DataStore.getData();
    db.orders.unshift(orderData);
    DataStore.saveToDisk();

    if (isMongoConnected()) {
      try {
        const newOrder = await (OrderModel as any).create(orderData);
        return newOrder.toObject ? newOrder.toObject() : newOrder;
      } catch (err) {
        console.error('Error creating order in MongoDB:', err);
      }
    }

    return orderData;
  }

  public async updateOrderStatus(
    orderId: string,
    status: string,
    note?: string
  ): Promise<any | null> {
    let previousStatus = '';
    const db = DataStore.getData();
    const localOrder = db.orders.find((o) => o.id === orderId || o.orderNumber === orderId);

    if (localOrder) {
      previousStatus = localOrder.status;
      localOrder.status = status as any;
      if (!localOrder.timeline) localOrder.timeline = [];
      localOrder.timeline.push({
        status: status as any,
        timestamp: new Date().toISOString(),
        note: note || `Order marked as ${status}`,
      });
      DataStore.saveToDisk();

      // Check if order was cancelled or uncancelled
      if (status === 'Cancelled' && previousStatus !== 'Cancelled') {
        await this.restoreOrderInventory(localOrder);
      } else if (previousStatus === 'Cancelled' && status !== 'Cancelled') {
        await this.deductOrderInventory(localOrder);
      }
    }

    if (isMongoConnected()) {
      try {
        const timelineEvent = {
          status,
          timestamp: new Date().toISOString(),
          note: note || `Order marked as ${status}`,
        };
        const updated = await (OrderModel as any).findOneAndUpdate(
          { $or: [{ id: orderId }, { orderNumber: orderId }] },
          {
            $set: { status },
            $push: { timeline: timelineEvent },
          },
          { new: true }
        ).lean();

        return updated || localOrder;
      } catch (err) {
        console.error('Error updating order status in MongoDB:', err);
      }
    }

    return localOrder;
  }

  // Inventory adjustment for orders
  public async deductOrderInventory(orderOrItems: any): Promise<void> {
    const items = Array.isArray(orderOrItems) ? orderOrItems : orderOrItems?.items;
    if (!items || !Array.isArray(items)) return;
    const requiredStock = this.calculateOrderStock(items);
    for (const [ingredientId, qty] of Object.entries(requiredStock)) {
      await this.adjustInventoryStock(ingredientId, -Number(qty));
    }
  }

  public async restoreOrderInventory(orderOrItems: any): Promise<void> {
    const items = Array.isArray(orderOrItems) ? orderOrItems : orderOrItems?.items;
    if (!items || !Array.isArray(items)) return;
    const requiredStock = this.calculateOrderStock(items);
    for (const [ingredientId, qty] of Object.entries(requiredStock)) {
      await this.adjustInventoryStock(ingredientId, Number(qty));
    }
  }

  public calculateOrderStock(items: any[]): Record<string, number> {
    const required: Record<string, number> = {};
    const add = (id: string, qty: number) => {
      if (!id) return;
      required[id] = (required[id] || 0) + qty;
    };

    const db = DataStore.getData();

    items.forEach((item) => {
      const quantity = Number(item.quantity) || 1;
      if (item.type === 'custom' || item.isCustom || item.customConfig) {
        const config = item.customConfig || {};
        if (config.base?.id) add(config.base.id, quantity);
        if (config.sauce?.id) add(config.sauce.id, quantity);
        if (config.cheese?.id) add(config.cheese.id, quantity);

        const vegList = config.vegetables || config.veggies || [];
        if (Array.isArray(vegList)) {
          vegList.forEach((v: any) => {
            const vId = typeof v === 'string' ? v : v?.id;
            if (vId) add(vId, quantity);
          });
        }
      } else {
        // Preset pizza
        const preset = db.pizzas.find((p) => p.id === item.id || p.id === item.presetPizza?.id) || item.presetPizza;
        if (preset) {
          const crustId = preset.base || preset.defaultCrust || 'base_hand_tossed';
          const sauceId = preset.sauce || preset.defaultSauce || 'sauce_classic_tomato';
          const cheeseId = preset.cheese || preset.defaultCheese || 'cheese_mozzarella';
          const veggies = preset.vegetables || preset.defaultVeggies || [];

          add(crustId, quantity);
          add(sauceId, quantity);
          add(cheeseId, quantity);
          if (Array.isArray(veggies)) {
            veggies.forEach((vId: string) => add(vId, quantity));
          }
        }
      }
    });

    return required;
  }

  // --- USER METHODS ---
  public async findUserByEmail(email: string): Promise<any | null> {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();

    if (isMongoConnected()) {
      try {
        const user = await (UserModel as any).findOne({ email: cleanEmail }).lean();
        if (user) return user;
      } catch (err) {
        console.error('Error finding user in MongoDB:', err);
      }
    }

    const localUser = DataStore.getData().users.find((u) => u.email.toLowerCase() === cleanEmail);
    return localUser || null;
  }

  public async findUserById(id: string): Promise<any | null> {
    if (!id) return null;

    if (isMongoConnected()) {
      try {
        const user = await (UserModel as any).findOne({ id }).lean();
        if (user) return user;
      } catch (err) {
        console.error('Error finding user by ID in MongoDB:', err);
      }
    }

    const localUser = DataStore.getData().users.find((u) => u.id === id);
    return localUser || null;
  }

  public async createUser(userData: any): Promise<any> {
    const db = DataStore.getData();
    db.users.push(userData);
    DataStore.saveToDisk();

    if (isMongoConnected()) {
      try {
        const newUser = await (UserModel as any).create(userData);
        return newUser.toObject ? newUser.toObject() : newUser;
      } catch (err) {
        console.error('Error creating user in MongoDB:', err);
      }
    }

    return userData;
  }

  public async updateUser(id: string, updates: Partial<any>): Promise<any | null> {
    const db = DataStore.getData();
    const userIndex = db.users.findIndex((u) => u.id === id || u.email === updates.email);
    let updatedLocal = null;

    if (userIndex !== -1) {
      db.users[userIndex] = { ...db.users[userIndex], ...updates };
      DataStore.saveToDisk();
      updatedLocal = db.users[userIndex];
    }

    if (isMongoConnected()) {
      try {
        const updated = await (UserModel as any).findOneAndUpdate(
          { $or: [{ id }, { email: updates.email?.toLowerCase() }] },
          { $set: updates },
          { new: true }
        ).lean();
        return updated || updatedLocal;
      } catch (err) {
        console.error('Error updating user in MongoDB:', err);
      }
    }

    return updatedLocal;
  }

  public async findAdminByEmail(email: string): Promise<any | null> {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();

    if (isMongoConnected()) {
      try {
        const admin = await (AdminModel as any).findOne({ email: cleanEmail }).lean();
        if (admin) return admin;
      } catch (err) {
        console.error('Error finding admin in MongoDB:', err);
      }
    }

    const localAdmin = DataStore.getData().admins.find((a) => a.email.toLowerCase() === cleanEmail);
    return localAdmin || null;
  }

  // --- TOKENS & EMAILS ---
  public async createVerificationToken(tokenData: any): Promise<void> {
    const db = DataStore.getData();
    db.verificationTokens.push(tokenData);
    DataStore.saveToDisk();

    if (isMongoConnected()) {
      try {
        await (VerificationTokenModel as any).create(tokenData);
      } catch (err) {
        console.error('Error creating verification token in MongoDB:', err);
      }
    }
  }

  public async verifyToken(token: string): Promise<boolean> {
    let verified = false;
    const db = DataStore.getData();
    const localToken = db.verificationTokens.find((t) => t.token === token && !t.used);

    if (localToken) {
      localToken.used = true;
      const user = db.users.find(
        (u) => u.id === localToken.userId || u.email.toLowerCase() === localToken.email.toLowerCase()
      );
      if (user) {
        user.isVerified = true;
      }
      DataStore.saveToDisk();
      verified = true;
    }

    if (isMongoConnected()) {
      try {
        const mongoToken = await (VerificationTokenModel as any).findOneAndUpdate(
          { token, used: false },
          { $set: { used: true } },
          { new: true }
        );
        if (mongoToken) {
          await (UserModel as any).updateOne(
            { $or: [{ id: mongoToken.userId }, { email: mongoToken.email.toLowerCase() }] },
            { $set: { isVerified: true } }
          );
          verified = true;
        }
      } catch (err) {
        console.error('Error verifying token in MongoDB:', err);
      }
    }

    return verified;
  }

  public async createPasswordResetToken(tokenData: any): Promise<void> {
    const db = DataStore.getData();
    db.passwordResetTokens.push(tokenData);
    DataStore.saveToDisk();

    if (isMongoConnected()) {
      try {
        await (PasswordResetTokenModel as any).create(tokenData);
      } catch (err) {
        console.error('Error creating password reset token in MongoDB:', err);
      }
    }
  }

  public async findPasswordResetToken(token: string): Promise<any | null> {
    if (isMongoConnected()) {
      try {
        const mongoToken = await (PasswordResetTokenModel as any).findOne({ token, used: false }).lean();
        if (mongoToken) return mongoToken;
      } catch (err) {
        console.error('Error finding password reset token in MongoDB:', err);
      }
    }

    const localToken = DataStore.getData().passwordResetTokens.find(
      (t) => t.token === token && !t.used
    );
    return localToken || null;
  }

  public async markPasswordResetTokenUsed(token: string): Promise<void> {
    const db = DataStore.getData();
    const localToken = db.passwordResetTokens.find((t) => t.token === token);
    if (localToken) {
      localToken.used = true;
      DataStore.saveToDisk();
    }

    if (isMongoConnected()) {
      try {
        await (PasswordResetTokenModel as any).updateOne({ token }, { $set: { used: true } });
      } catch (err) {
        console.error('Error marking password reset token used in MongoDB:', err);
      }
    }
  }

  // System Emails
  public addEmail(emailData: any): void {
    const db = DataStore.getData();
    db.emails.unshift(emailData);
    DataStore.saveToDisk();
  }

  public getEmails(): any[] {
    return DataStore.getData().emails;
  }
}

export const dbService = DatabaseService.getInstance();
