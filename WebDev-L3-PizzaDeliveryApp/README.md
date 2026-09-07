# PizzaCraft - Artisanal Stone-Fired Pizza Delivery Platform

PizzaCraft is an end-to-end full-stack pizza ordering, customization, and real-time kitchen inventory management platform. Built with modern web technologies, it features an interactive layered custom pizza builder, secure customer and administrator authentication with JSON Web Tokens (JWT), seamless Razorpay test-mode payment gateway integration, live order tracking with kitchen milestones, and an automated background low-stock inventory auditing engine.

Developed as the **Level 3 Final Project** for the **Oasis Infobyte Internship in Web Development & Designing**.

---

## Internship Details

- **Organization:** Oasis Infobyte
- **Track:** Web Development & Designing
- **Level:** Level 3
- **Task:** Pizza Delivery Full-Stack Application
- **Project Name:** PizzaCraft
- **Developer:** Arkoparno De Sarkar

---

## Features

### User Side (Customer Experience)
- **Signature Stone-Fired Menu:** Browse a curated catalog of artisanal woodfire pizzas with high-resolution imagery, dietary tags (*Chef Signature*, *Bestseller*, *Spicy ★★★*), and rating chips.
- **Interactive Custom Pizza Builder:** Build your own pizza step-by-step with real-time visual stack previews:
  - **Crust Selection:** Sourdough, Neapolitan Thin, Cheese Burst, Pan Deep Dish, and Gluten-Free Cauliflower.
  - **Gourmet Sauces:** San Marzano Marinara, Creamy Garlic Alfredo, Spicy Arrabbiata, Genovese Basil Pesto, and Truffle Balsamic Glaze.
  - **Artisanal Cheeses:** Fior di Latte Mozzarella, Smoked Scamorza, Gorgonzola Dolce, Burrata Heart, and Plant-Based Cashew Mozzarella.
  - **Garden Veggie Toppings:** Sun-ripened Cherry Tomatoes, Kalamata Olives, Balsamic Caramelized Onions, Truffle Wild Mushrooms, Charred Tricolor Peppers, Escabeche Jalapeños, Marinated Artichokes, and Organic Baby Spinach.
  - **Size Variants:** Regular (8"), Medium (10"), and Large (12") with dynamic price scaling.
- **Dynamic Price Engine:** Server-validated pricing recalculates accurately as toppings and sizes are toggled.
- **Cart Management:** Slide-out cart drawer with instant quantity adjustments, promotional discount calculations, GST (5%), and free delivery threshold logic (orders ≥ ₹500).
- **Secure Customer Authentication:**
  - Registration with automatic verification email generation.
  - User login issuing signed JWT tokens.
  - Complete forgot password and password reset workflow with security tokens.
- **Razorpay Checkout Gateway:** Realistic Razorpay modal sandbox accepting test card, UPI, and net banking payments.
- **Live Order Tracking:** Real-time visual timeline showing kitchen preparation stages:
  - *Order Received* → *Dough & Prep* → *In Woodfire Oven* → *Quality Inspection* → *Out for Delivery* → *Delivered*.
- **In-App Transactional Mail Center:** Integrated system mail simulator enabling evaluators and users to view dispatched verification links, password reset tokens, and order confirmation emails without external SMTP dependencies.

### Admin Side (Executive Kitchen Management)
- **Separate Admin Access:** Dedicated administrator portal protected by master credentials and role-based route middleware.
- **Real-Time Kitchen Inventory Management:** Full inventory dashboard tracking 23 raw ingredient SKUs across crusts, sauces, cheeses, and vegetables.
- **Automatic Stock Deduction:** Raw inventory is decremented in real-time when an order is confirmed.
- **Inventory Stock Guard:** Checks ingredient availability prior to order placement, preventing orders for out-of-stock ingredients.
- **Manual Stock Adjustments:** Quick `+` and `-` quantity steppers and inline editing for stock amounts, minimum threshold levels, and pricing.
- **Automated Low-Stock Monitoring (Node-Cron):** Background cron job running every 10 minutes to audit stock against configured thresholds and dispatch urgent chef notification emails.
- **Live Order Status Management:** Kitchen dispatchers can advance order statuses (`Dough & Prep`, `In Woodfire Oven`, etc.) which reflect immediately on the customer's tracking view.

---

## Technology Stack

- **Frontend:**
  - React 19
  - TypeScript
  - Tailwind CSS 4
  - Motion (Framer Motion)
  - Lucide React Icons
  - Canvas Confetti
- **Backend:**
  - Node.js & Express.js
  - TypeScript (with `tsx` for development and `esbuild` for production bundling)
  - MongoDB & Mongoose ODM (with seamless JSON file persistence fallback)
  - JSON Web Tokens (`jsonwebtoken`)
  - Bcrypt.js (`bcryptjs`)
  - Node-Cron (`node-cron`) for automated stock audits
- **Build & Tools:**
  - Vite 6
  - ESLint / TypeScript Compiler (`tsc`)

---

## Project Structure

```
OIBSIP/
│
└── WebDev-L3-PizzaDeliveryApp/
    │
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.tsx                # Main responsive navigation bar
    │   │   ├── PizzaMenu.tsx             # Signature pizza showcase
    │   │   ├── CustomPizzaBuilder.tsx    # Interactive layered pizza builder
    │   │   ├── CartDrawer.tsx            # Slide-out shopping cart drawer
    │   │   ├── OrderSummaryModal.tsx     # Delivery address & order summary
    │   │   ├── RazorpayModal.tsx         # Razorpay checkout simulation
    │   │   ├── OrderTrackingView.tsx     # Real-time kitchen progress tracker
    │   │   ├── AdminPortal.tsx           # Inventory & order kitchen management
    │   │   ├── AuthModal.tsx             # Customer & Admin authentication modal
    │   │   └── SystemEmailInboxModal.tsx # In-app transactional email viewer
    │   ├── context/
    │   │   ├── AuthContext.tsx           # Authentication state & JWT handling
    │   │   └── CartContext.tsx           # Cart state & item management
    │   ├── types.ts                      # Shared TypeScript data models
    │   ├── App.tsx                       # Main application component & routing
    │   ├── main.tsx                      # Frontend React DOM entrypoint
    │   └── index.css                     # Tailwind CSS entrypoint
    │
    ├── server/
    │   ├── config/
    │   │   └── db.ts                     # MongoDB Atlas & local file persistence connector
    │   ├── middleware/
    │   │   └── auth.ts                   # JWT verification & RBAC middleware
    │   ├── models/
    │   │   ├── index.ts                  # Master data store & schemas
    │   │   ├── Pizza.ts                  # Pizza catalog schema
    │   │   ├── Ingredient.ts             # Inventory ingredient schema
    │   │   ├── Order.ts                  # Customer order & timeline schema
    │   │   ├── User.ts                   # Customer user schema
    │   │   ├── Admin.ts                  # Admin user schema
    │   │   ├── VerificationToken.ts      # Email verification token schema
    │   │   └── PasswordResetToken.ts     # Password reset token schema
    │   ├── routes/
    │   │   ├── authRoutes.ts             # Login, register, verify, forgot-password
    │   │   ├── menuRoutes.ts             # Signature pizzas & builder options
    │   │   ├── pizzaRoutes.ts            # Pizza catalog & pricing calculation
    │   │   ├── orderRoutes.ts            # Order intent, payment confirmation & tracking
    │   │   ├── inventoryRoutes.ts        # Inventory queries & adjustments
    │   │   ├── adminRoutes.ts            # Admin inventory & kitchen order controls
    │   │   ├── paymentRoutes.ts          # Razorpay order generation & verification
    │   │   └── emailRoutes.ts            # System transactional email queries
    │   ├── services/
    │   │   ├── cronService.ts            # Node-Cron automated inventory auditor
    │   │   └── razorpayService.ts        # Razorpay payment helpers
    │   └── app.ts                        # Express application instance & middleware
    │
    ├── public/
    │   ├── favicon.svg                   # Artisanal pizza slice SVG favicon
    │   └── robots.txt                    # Web crawler directive
    │
    ├── docs/
    │   ├── API_DOCUMENTATION.md          # Complete REST API specification
    │   └── ARCHITECTURE.md               # Engineering design & data flow blueprints
    │
    ├── screenshots/
    │   └── README.md                     # Application visual walkthrough guide
    │
    ├── index.html                        # Application HTML shell
    ├── package.json                      # Project dependencies and build scripts
    ├── tsconfig.json                     # TypeScript compiler options
    ├── vite.config.ts                    # Vite build configuration
    ├── server.ts                         # Unified full-stack server entrypoint
    ├── server-data.json                  # Local persistent datastore
    ├── vercel.json                       # Vercel deployment configuration
    ├── .env.example                      # Environment variables template
    ├── .gitignore                        # Git exclusion rules
    └── README.md                         # Project documentation
```

---

## Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Arkoparno/OIBSIP.git
cd OIBSIP/WebDev-L3-PizzaDeliveryApp
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the `WebDev-L3-PizzaDeliveryApp` directory by copying the example template:
```bash
cp .env.example .env
```

Edit `.env` with your preferred configuration:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/pizzacraft
JWT_SECRET=your_jwt_secret_key_here
ADMIN_EMAIL=admin@pizzacraft.com
ADMIN_PASSWORD=admin123
LOW_STOCK_THRESHOLD=15
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```
*(Note: If a MongoDB connection string is not provided or the network IP is not whitelisted, PizzaCraft automatically falls back to its robust local file datastore `server-data.json` without interruptions).*

### 4. Run the Application in Development Mode
```bash
npm run dev
```
Open your browser at `http://localhost:3000` to interact with PizzaCraft.

### 5. Build for Production
```bash
npm run build
```

### 6. Run Production Server
```bash
npm start
```

---

## Environment Variables Reference

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Port for the backend Express server | `3000` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |
| `MONGODB_URI` | MongoDB Atlas / Local connection string | `mongodb://localhost:27017/pizzacraft` |
| `JWT_SECRET` | Secret key used for signing JWT auth tokens | `your_secret_key` |
| `ADMIN_EMAIL` | Default administrator account email | `admin@pizzacraft.com` |
| `ADMIN_PASSWORD` | Default administrator account password | `admin123` |
| `LOW_STOCK_THRESHOLD`| Stock count threshold for low-stock alerts | `15` |
| `RAZORPAY_KEY_ID` | Razorpay API Key ID for payment modal | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET`| Razorpay API Key Secret | `your_razorpay_secret` |
| `APP_URL` | Public domain URL of the deployed application | `http://localhost:3000` |

---

## Deployment Instructions

### Vercel Deployment
1. Import the repository into your Vercel account.
2. In the project settings, set the **Root Directory** to:
   ```
   WebDev-L3-PizzaDeliveryApp
   ```
3. Set the Framework Preset to **Vite**.
4. Configure Build and Output settings:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add your environment variables in the Vercel Dashboard under **Settings → Environment Variables**.
6. Click **Deploy**. The included `vercel.json` file handles SPA routing automatically.

### Render / Railway / Cloud Run Deployment
1. Set the Root Directory to `WebDev-L3-PizzaDeliveryApp`.
2. Build Command: `npm install && npm run build`
3. Start Command: `npm start`
4. Set Environment Variable: `PORT=3000` (or leave default port assigned by platform).

---

## Screenshots

Please see [`screenshots/README.md`](./screenshots/README.md) for detailed descriptions and visual references of the user journey, custom pizza builder, kitchen order tracking, and inventory control dashboard.

---

## Developer

**Arkoparno De Sarkar**  
Intern at Oasis Infobyte (OIBSIP)  
Track: Web Development & Designing — Level 3
