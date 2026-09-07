# PizzaCraft - System Architecture & Engineering Design

This document details the architectural blueprint, data model, security mechanisms, and synchronization patterns of the PizzaCraft Full-Stack Pizza Delivery platform.

---

## 1. High-Level Architecture Overview

PizzaCraft utilizes a unified modern full-stack architecture combining a Vite-powered React 19 Single Page Application with an Express.js backend on Node.js.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER (React 19)                       │
│  - Pizza Menu Showcase             - Interactive 3D/Visual Builder     │
│  - Slide-out Cart Drawer           - Razorpay Checkout Modal           │
│  - Real-time Order Tracking        - Executive Admin Portal            │
│  - In-App Mailbox Simulator        - Customer & Admin Auth Modal       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                               REST Calls (fetch / JSON)
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    API GATEWAY & BACKEND (Express 4)                   │
│  - JWT Middleware                  - Menu & Custom Price Engine        │
│  - Razorpay Order Lifecycle        - Real-Time Inventory Decrementer   │
│  - Node-Cron Low-Stock Monitor     - Transactional Email Engine        │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
            (Active Connection)             (Fallback Engine)
                    ▼                                ▼
       ┌────────────────────────┐       ┌────────────────────────┐
       │   MongoDB Atlas Cluster│       │ server-data.json Engine│
       │   (Mongoose ODM)       │       │ (Atomic File Sync)     │
       └────────────────────────┘       └────────────────────────┘
```

---

## 2. Key Modules & Data Flow

### 2.1 Custom Pizza Builder & Dynamic Pricing Engine
1. Client fetches all available dough bases, sauces, cheeses, and vegetable toppings from `/api/menu/options`.
2. As the user selects or changes toppings, sizes, or dough types, the client dynamically computes pricing and previews the pizza visually with stacked interactive layers.
3. Upon checkout, the backend recalculates the price from first principles (`/api/pizzas/calculate-price` or during order creation) to prevent any client-side tampering.

### 2.2 Inventory Stock Guard & Real-Time Deduction
1. When checkout is initiated (`/api/orders/create-razorpay-order`), the server traverses every cart item (both custom pizzas and preset signature pizzas) and aggregates all required raw ingredients (crust, sauce, cheese portions, and individual vegetable portions).
2. If any ingredient is insufficient, checkout is blocked with a descriptive error message explaining which ingredient is out of stock.
3. Upon successful payment verification (`/api/orders/confirm`), stock levels are automatically decremented, and the order is committed.

### 2.3 Automated Low-Stock Monitoring (Node-Cron)
1. A background cron job runs every 10 minutes (`*/10 * * * *`).
2. The audit scans every SKU in the inventory against its configured threshold limit (default: 15–20 units).
3. If an SKU drops below threshold:
   - An alert flag is set.
   - A critical notification email is generated and delivered to the Executive Kitchen inbox.
4. Admins can also trigger manual stock audits on-demand via the Admin Portal.

---

## 3. Security & Data Protection

- **Password Hashing:** Passwords are never stored in plaintext. They are salted and hashed using `bcryptjs` (salt rounds: 10).
- **JWT Authorization:** Session state is signed using `jsonwebtoken` with HMAC-SHA256 and configurable expiration (`7d`).
- **Role-Based Access Control (RBAC):** Admin endpoints are protected with strict role verification (`role === 'admin'`). Customers cannot access inventory manipulation routes.
- **Payment Signature Verification:** Razorpay order verification strictly confirms payment signatures before fulfillment.
- **Zero Committed Secrets:** All database URIs, secret keys, and credentials are read strictly from environment variables via `.env`, which is permanently excluded via `.gitignore`.
