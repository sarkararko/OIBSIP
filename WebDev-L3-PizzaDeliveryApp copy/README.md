# 🍕 PizzaCraft – Full-Stack Pizza Delivery & Kitchen Inventory Platform

> **Oasis Infobyte Internship Program (OIBSIP)**  
> **Track:** Web Development & Designing  
> **Level:** Level 3 – Advanced Task  
> **Task:** Pizza Delivery Full-Stack Application  
> **Project Name:** PizzaCraft  
> **Live Website URL:** [PizzaCraft](https://pizzacraft-delivery.vercel.app/)  
> **Repository:** [OIBSIP/WebDev-L3-PizzaDeliveryApp](https://github.com/Arkoparno/OIBSIP/tree/main/WebDev-L3-PizzaDeliveryApp)  
> **Developer:** Arkoparno De Sarkar

---

## 📌 Project Overview

**PizzaCraft** is a production-ready, full-stack artisanal pizza ordering and kitchen inventory management platform developed for the **Oasis Infobyte (OIBSIP) Web Development & Designing Level 3 Internship Submission**.

The application delivers an end-to-end e-commerce and operational kitchen management system with dual roles (Customer & Kitchen Admin). Customers can order handcrafted signature stone-fired pizzas or design custom pizzas using an interactive 4-step builder with dynamic visual rendering. The platform features dynamic pricing, promo codes, Razorpay test mode payment integration, live order progress tracking, automated inventory stock decrementing upon payment, automated `node-cron` low-stock background audits, and resilient dual-storage persistence (MongoDB Atlas via Mongoose with an automatic zero-config local JSON engine fallback).

---

## 🚀 Key Features

### 👤 Customer Features & User Functionality
- **Artisanal Pizza Menu**: Curated stone-fired signature pizzas (Margherita Verace D.O.P., Truffle Wild Mushroom, Rustic Veggie Supreme, Quattro Formaggi Cremoso, Paneer Tikka Rustica) with dietary tags, real-time availability badges, and ingredient breakdowns.
- **Interactive 4-Step Custom Pizza Builder**:
  - **Step 1 – Pizza Crust / Base**: Select from 5 artisan doughs (Hand-Tossed, Thin Crust, Sourdough, Multigrain, Molten Cheese Burst).
  - **Step 2 – Gourmet Sauce**: Select from 5 sauces (Classic San Marzano, Spicy Arrabbiata, Basil Pesto, Garlic Butter, Chipotle BBQ).
  - **Step 3 – Cheese Variety**: Choose from 5 cheeses (Fior di Latte Mozzarella, Smoked Cheddar, Parmesan Reggiano, Fresh Ricotta, Artisanal Vegan Cashew) with optional Extra Cheese toggle.
  - **Step 4 – Farm Vegetable Toppings**: Select from 7 farm-fresh toppings (Bell Peppers, Wild Mushrooms, Red Onion, Black Olives, Jalapeños, Sweet Corn, Baby Spinach).
- **Dynamic Visual Pizza Canvas**: Real-time canvas rendering matching chosen dough, sauce color tints, cheese textures, and layered vegetable toppings.
- **Cart & Dynamic Pricing**: Instant subtotal calculation, size scaling (`Regular 8"`: 0.85x, `Medium 10"`: 1.0x, `Large 12"`: 1.35x), promotional discount codes (`PIZZA50`, `FIRSTBITE`, `CHEF100`), 5% GST, and automatic free delivery calculation (orders ≥ ₹500).
- **Razorpay Test Payment Gateway**: Simulated Razorpay test mode checkout with card and UPI options, generating verifiable payment IDs and transaction records.
- **Live Real-Time Order Tracking**: 5-stage kitchen progress tracker (`Order Received` ➔ `In Kitchen Prep` ➔ `Woodfire Oven Baking` ➔ `Out for Delivery` ➔ `Delivered`) complete with delivery agent details and address summary.
- **Customer Authentication**: JWT authentication with bcrypt password hashing, account creation, email verification token simulation, login, and forgot/reset password workflows.
- **System Mailbox Viewer**: Built-in modal to preview transactional emails (verification tokens, password reset links, order receipts, and admin stock alerts).

### 🛡️ Kitchen & Admin Portal Functionality
- **Executive Kitchen Dashboard**: Real-time overview of total revenue, active orders, total volume, and critical low-stock warnings.
- **Real-Time Inventory Control**: SKU tracking across all 22 ingredients (bases, sauces, cheeses, vegetables) with live quantities, unit costs, safety thresholds, and quick restock controls.
- **Live Kitchen Order Dispatcher**: Advance order stages in real time with instant status updates. Orders marked as `Cancelled` automatically restock their ingredients back into kitchen inventory.
- **Automated Low-Stock Monitoring (`node-cron`)**: 30-minute background cron schedule that audits inventory levels against configured safety thresholds and sends automated alert notifications.
- **Manual Stock Audit Trigger**: On-demand button to run safety audits instantly.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + TypeScript |
| **Styling & UI** | Tailwind CSS v4 + Lucide React + Motion |
| **Bundler & Tooling** | Vite 6 + ESBuild + TSX |
| **Backend Server** | Node.js + Express 4 (TypeScript) |
| **Primary Database** | MongoDB Atlas via Mongoose 9 |
| **Fallback Persistence** | Auto-synchronizing file-based JSON DataStore (`server-data.json`) |
| **Authentication** | JSON Web Tokens (JWT) + BCrypt.js Password Hashing |
| **Background Scheduler**| Node-Cron (Automated 30-minute inventory stock checks) |
| **Payment Integration**| Razorpay API (Test Mode Sandbox) |

---

## 📁 Project Structure

```text
OIBSIP/
└── WebDev-L3-PizzaDeliveryApp/
    ├── docs/
    │   ├── ARCHITECTURE.md             # Dual-storage architecture and data flow
    │   ├── API_DOCUMENTATION.md        # Comprehensive REST API reference
    │   ├── DEMO_VIDEO_GUIDE.md         # Video demonstration recording script
    │   └── FINAL_SUBMISSION_CHECKLIST.md # Step-by-step submission checklist
    ├── public/
    │   ├── favicon.svg                 # PizzaCraft vector favicon
    │   └── robots.txt                  # Web crawler rules
    ├── screenshots/                    # Application screenshots for GitHub showcase
    ├── server/
    │   ├── config/                     # MongoDB connection & status
    │   ├── middleware/                 # JWT auth & admin guards
    │   ├── models/                     # Mongoose schemas (User, Admin, Order, Ingredient, Pizza, Tokens)
    │   ├── routes/                     # Express REST routes (auth, menu, pizzas, orders, inventory, admin)
    │   └── services/                   # Unified dbService, cronService, razorpayService, emailService
    ├── src/
    │   ├── components/                 # UI components (Builder, Menu, Cart, Tracker, Admin, Auth, Razorpay)
    │   ├── context/                    # AuthContext, CartContext
    │   ├── types.ts                    # Global TypeScript interfaces
    │   ├── App.tsx                     # Main router and view orchestrator
    │   ├── main.tsx                    # React application entry point
    │   └── index.css                   # Global Tailwind CSS entry
    ├── .env.example                    # Environment configuration template
    ├── .gitignore                      # Git ignore patterns
    ├── index.html                      # HTML entry template
    ├── package.json                    # Project dependencies and npm scripts
    ├── server-data.json                # Resilient fallback database engine
    ├── server.ts                       # Express + Vite development and production server
    ├── tsconfig.json                   # TypeScript compiler configuration
    ├── vercel.json                     # Vercel deployment configuration
    ├── vite.config.ts                  # Vite build configuration
    └── README.md                       # Project documentation
```

---

## 🔑 Default Credentials

### 👨‍🍳 Kitchen Administrator
- **Email:** `admin@pizzacraft.com`
- **Password:** `admin123`
- **Role:** Administrator (Full Kitchen & Inventory Privileges)

### 🧑‍💼 Customer Account
- **Email:** `user@example.com`
- **Password:** `password123`
- **Role:** Verified Customer

---

## ⚙️ Installation & Setup Instructions

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- *(Optional)* **MongoDB URI**: MongoDB Atlas connection string. If omitted, the application will automatically run using its built-in resilient JSON storage engine.

### 2. Clone the Repository
```bash
git clone https://github.com/Arkoparno/OIBSIP.git
cd OIBSIP/WebDev-L3-PizzaDeliveryApp
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Create a local `.env` file from the provided template:
```bash
cp .env.example .env
```

Update your `.env` with your configuration:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=pizzacraft_jwt_secret_key_2026
ADMIN_EMAIL=admin@pizzacraft.com
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/pizzacraft?retryWrites=true&w=majority
RAZORPAY_KEY_ID=rzp_test_pizzacraft2026
RAZORPAY_KEY_SECRET=secret_test_key_2026
```
*(Note: All secrets remain in your local `.env`, which is permanently ignored by `.gitignore`.)*

---

## 💻 How to Run Frontend & Backend

### Development Mode (Concurrent Vite + Express Server)
```bash
npm run dev
```
The application will launch on `http://localhost:3000` with hot TypeScript reloading and Vite frontend serving.

### Type-Check & Linting
```bash
npm run lint
```

### Production Build
```bash
npm run build
```
This compiles the Vite frontend into `dist/` and bundles the Express server into `dist/server.cjs`.

### Production Start
```bash
npm start
```

---

## 📸 Screenshots Showcase

The `screenshots/` directory is prepared for project visuals:

| Screenshot | Description |
|---|---|
| `01-home-dashboard.png` | Signature Artisanal Pizza Menu with dietary tags & ratings |
| `02-authentication.png` | Customer & Admin Dual Authentication Modal |
| `03-custom-pizza-builder.png` | 4-Step Custom Pizza Builder with dynamic visual dough/sauce rendering |
| `04-order-summary.png` | Shopping Cart Drawer with dynamic pricing, GST & promo discounts |
| `05-razorpay-payment.png` | Razorpay Sandbox Test Payment Gateway |
| `06-order-tracking.png` | Real-time 5-Stage Kitchen Order Progress Tracker |
| `07-admin-login.png` | Kitchen Portal Administrator Login |
| `08-admin-inventory.png` | Real-time Ingredient Stock Table with Low-Stock Alerts |
| `09-admin-orders.png` | Kitchen Live Order Dispatcher & Status Manager |

---

## 🌐 Demo & Deployment

- **Live Website URL:**  [PizzaCraft](https://pizzacraft-delivery.vercel.app/)  
- **Deployment Platform:** Cloud Run / Vercel / Node.js
- **Walkthrough Video Guide:** See [docs/DEMO_VIDEO_GUIDE.md](docs/DEMO_VIDEO_GUIDE.md)

---

## 🔗 GitHub & Submission Information

- **GitHub Repository:** `OIBSIP`
- **Submission Task Directory:** `WebDev-L3-PizzaDeliveryApp`
- **Internship Organization:** Oasis Infobyte
- **Program:** Oasis Infobyte Internship Program (OIBSIP)
- **Track:** Web Development & Designing
- **Level:** Level 3 – Advanced Task
- **Author:** Arkoparno De Sarkar
- **LinkedIn:** [Arkoparno De Sarkar](https://www.linkedin.com/)

---

*Crafted with passion for the Oasis Infobyte Internship Program.*
