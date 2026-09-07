# 🍕 PizzaCraft – Full-Stack Pizza Delivery & Kitchen Inventory Platform

> **Oasis Infobyte Internship Program (OIBSIP)**  
> **Track:** Web Development & Designing  
> **Level:** Level 3 – Advanced Task  
> **Project:** Pizza Delivery Full-Stack Application  
> **Repository:** `OIBSIP/WebDev-L3-PizzaDeliveryApp`  
> **Developer:** Arkoparno De Sarkar

---

## 📌 Project Overview

**PizzaCraft** is an end-to-end, production-grade artisanal pizza ordering and kitchen inventory management platform designed and built for the **Oasis Infobyte (OIBSIP) Web Development & Designing Level 3 Internship Submission**.

The application features dual user roles (Customer & Admin), an interactive 4-step custom pizza builder with dynamic visual dough/sauce/cheese rendering, signature stone-fired pizza presets, real-time live kitchen status tracking with step-by-step progress, Razorpay test mode payment integration, automated `node-cron` low-stock background audits, and dual-layer database persistence (MongoDB via Mongoose with an automatic local JSON storage fallback).

---

## 📁 Repository Structure

```text
OIBSIP/
└── WebDev-L3-PizzaDeliveryApp/
    ├── src/                          # Frontend React 19 + TypeScript + Tailwind CSS
    │   ├── components/               # Modular UI Components (Navbar, Builder, Menu, Cart, Tracker, Admin)
    │   ├── context/                  # AuthContext, CartContext
    │   ├── types.ts                  # Shared TypeScript interfaces & types
    │   ├── App.tsx                   # Main App Router & View Controller
    │   ├── main.tsx                  # React Entry Point
    │   └── index.css                 # Global Tailwind CSS Entry Point
    ├── server/                       # Backend Express + TypeScript Server
    │   ├── config/                   # MongoDB Mongoose connection & status checker
    │   ├── middleware/               # JWT authentication & admin authorization guards
    │   ├── models/                   # Mongoose schemas (User, Admin, Order, Ingredient, Pizza, Tokens)
    │   ├── routes/                   # REST API routes (auth, menu, pizzas, orders, inventory, admin)
    │   └── services/                 # Unified dbService, cronService, razorpayService, emailService
    ├── public/                       # Static assets, SVG icons, and illustrations
    ├── docs/                         # Architecture specification & full REST API documentation
    │   ├── ARCHITECTURE.md           # Dual-storage architecture and schema definitions
    │   └── API_DOCUMENTATION.md      # Comprehensive REST API reference with payload schemas
    ├── screenshots/                  # High-resolution screenshots & UI mockups
    ├── package.json                  # Root dependencies & build scripts
    ├── tsconfig.json                 # TypeScript compiler configuration
    ├── vite.config.ts                # Vite build configuration with Tailwind CSS
    ├── server.ts                     # Express + Vite development and production server
    ├── server-data.json              # Local fallback file storage engine
    └── .env.example                  # Environment configuration template
```

---

## 🌟 Key Features

### 👤 Customer Experience
- **Artisanal Menu**: Browse curated stone-fired signature pizzas (Margherita, Truffle Wild Mushroom, Rustic Veggie Supreme, Quattro Formaggi, Paneer Tikka).
- **Interactive 4-Step Custom Pizza Builder**:
  - **Step 1 – Pizza Base**: 5 hand-crafted doughs (Hand-Tossed, Thin Crust, Sourdough, Multigrain, Cheese Burst).
  - **Step 2 – Sauce**: 5 artisanal sauces (Classic San Marzano, Spicy Arrabbiata, Basil Pesto, Garlic Butter, Chipotle BBQ).
  - **Step 3 – Cheese Type**: 5 premium cheeses (Fior di Latte Mozzarella, Smoked Cheddar, Parmesan Reggiano, Fresh Ricotta, Artisanal Vegan).
  - **Step 4 – Farm Vegetables**: 7 fresh farm toppings (Bell Peppers, Button Mushrooms, Red Onion, Black Olives, Jalapeños, Sweet Corn, Baby Spinach).
- **Visual Dynamic Pizza Canvas**: Live optical canvas reflecting selected dough, sauce colors, cheese textures, and layered vegetable toppings.
- **Cart & Dynamic Pricing**: Real-time subtotal, size multipliers (`Regular 8"`, `Medium 10"`, `Large 12"`), promo coupons (`PIZZA50`, `FIRSTBITE`, `CHEF100`), 5% GST, and free delivery thresholds.
- **Razorpay Test Checkout**: Secure checkout with test card / UPI support and instantaneous payment verification.
- **Live Kitchen Order Tracker**: Real-time visual progress through order lifecycle (`Order Placed` ➔ `In Kitchen Prep` ➔ `Stone-Fired Oven` ➔ `Out for Delivery` ➔ `Delivered`).
- **Authentication**: JWT-based customer registration, email verification links/tokens, secure login, and password reset flows.

### 🛡️ Kitchen & Admin Portal
- **Executive Kitchen Dashboard**: Real-time stats for revenue, order volumes, active orders, and low-stock alerts.
- **Inventory Stock Control**: Live tracking of 22 ingredient SKUs with real-time stock deductions upon order placement, instant stock restock controls, safety threshold adjustments, and unit pricing.
- **Live Order Management**: Real-time status advancement (`Pending` ➔ `Kitchen Prep` ➔ `Oven Baking` ➔ `Out for Delivery` ➔ `Delivered` / `Cancelled`) with automated inventory restock if an order is cancelled.
- **Automated Node-Cron Background Audits**: 30-minute scheduled background health audits detecting SKUs below safety thresholds and dispatching alert notifications.
- **Email Dispatch Center**: In-app simulated email inbox verifying activation codes, reset links, and low-stock alerts.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + TypeScript |
| **Styling & UI** | Tailwind CSS v4 + Lucide React + Motion |
| **Bundler & Tooling** | Vite 6 + ESBuild + TSX |
| **Backend Server** | Node.js + Express 4 (TypeScript) |
| **Primary Database** | MongoDB Atlas via Mongoose 9 |
| **Fallback Storage Engine** | Auto-syncing file-based JSON DataStore (`server-data.json`) |
| **Authentication** | JSON Web Tokens (JWT) + BCrypt Password Hashing |
| **Task Scheduling** | Node-Cron (Automated 30-minute inventory audits) |
| **Payments** | Razorpay (Test Mode API with Order Intent Generation) |

---

## 🔑 Default Credentials

### 👨‍🍳 Admin Portal
- **Email:** `admin@pizzacraft.com`
- **Password:** `admin123`
- **Role:** Administrator (Full Kitchen & Inventory Access)

### 🧑‍💼 Customer Account
- **Email:** `user@example.com`
- **Password:** `password123`
- **Role:** Verified Customer

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- Optional: MongoDB Connection String (fallback storage runs automatically if omitted)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Arkoparno/OIBSIP.git
cd OIBSIP/WebDev-L3-PizzaDeliveryApp

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env` file in the project root:
```bash
cp .env.example .env
```

Configure your environment variables:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=pizzacraft_super_secret_jwt_key_2026
ADMIN_EMAIL=admin@pizzacraft.com
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/pizzacraft?retryWrites=true&w=majority
RAZORPAY_KEY_ID=rzp_test_pizzacraft2026
RAZORPAY_KEY_SECRET=secret_test_key_2026
```
*(Note: If `MONGODB_URI` is not provided, PizzaCraft will seamlessly operate using the internal resilient JSON database.)*

### 4. Run Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000` with hot TypeScript execution and Vite asset bundling.

### 5. Production Build
```bash
# Compile both frontend client and server
npm run build

# Start production server
npm start
```

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new customer account | No |
| `POST` | `/api/auth/login` | Sign in with email & password | No |
| `POST` | `/api/auth/admin-login` | Sign in as Kitchen Administrator | No |
| `POST` | `/api/auth/verify-email` | Verify email with security token | No |
| `POST` | `/api/auth/forgot-password` | Request password reset token | No |
| `POST` | `/api/auth/reset-password` | Set new account password | No |
| `GET`  | `/api/menu/pizzas` | List preset signature pizzas | No |
| `GET`  | `/api/menu/options` | List customizer bases, sauces, cheeses, veggies | No |
| `POST` | `/api/pizzas/calculate-price` | Dynamic server-side pizza price computation | No |
| `GET`  | `/api/inventory` | Fetch live inventory stock & safety thresholds | No |
| `POST` | `/api/inventory/check-availability` | Pre-flight stock check for cart items | No |
| `POST` | `/api/orders/create-razorpay-order` | Validate inventory & create Razorpay order | Optional |
| `POST` | `/api/orders/verify-payment` | Verify payment, deduct stock & confirm order | Optional |
| `GET`  | `/api/orders/:id` | Fetch live order details & status timeline | Optional |
| `GET`  | `/api/admin/dashboard-stats` | Fetch real-time metrics & financial analytics | Admin JWT |
| `POST` | `/api/admin/orders/:id/status` | Advance kitchen order status | Admin JWT |
| `POST` | `/api/admin/inventory/adjust` | Manual restock or deduction of ingredient SKU | Admin JWT |
| `POST` | `/api/inventory/trigger-cron` | Manually run 30-min node-cron low-stock audit | No |

---

## 📜 Submission Details

- **Internship Organization**: Oasis Infobyte
- **Program**: Oasis Infobyte Internship Program (OIBSIP)
- **Track**: Web Development & Designing
- **Level**: Level 3
- **Submission Project**: Pizza Delivery Full-Stack Application (PizzaCraft)

---

Developed with ❤️ by **Arkoparno De Sarkar** for **Oasis Infobyte**.
