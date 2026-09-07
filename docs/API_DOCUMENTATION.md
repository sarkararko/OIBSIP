# PizzaCraft - Backend RESTful API Specification

Comprehensive documentation of all REST API endpoints implemented in the PizzaCraft full-stack pizza delivery and kitchen management platform.

Base URL: `http://localhost:3000/api` (or deployed domain)

---

## 1. Authentication Endpoints (`/api/auth`)

### 1.1 Customer Registration
- **Route:** `POST /api/auth/register`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "name": "Arkoparno De Sarkar",
    "email": "arkoparno@example.com",
    "password": "password123",
    "phone": "+91 98765 43210",
    "address": "42 Baker Street, Mumbai"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "message": "Registration successful! Verification email sent.",
    "user": {
      "id": "usr_1725740123_abc",
      "name": "Arkoparno De Sarkar",
      "email": "arkoparno@example.com",
      "phone": "+91 98765 43210",
      "isVerified": false,
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "verificationToken": "vtok_123456_789"
  }
  ```

### 1.2 Customer Login
- **Route:** `POST /api/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "arkoparno@example.com",
    "password": "password123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": "usr_...",
      "name": "Arkoparno De Sarkar",
      "email": "arkoparno@example.com",
      "isVerified": true,
      "role": "user"
    }
  }
  ```

### 1.3 Administrator Login
- **Route:** `POST /api/auth/admin-login` (or `/api/auth/admin/login`)
- **Access:** Admin Credentials
- **Request Body:**
  ```json
  {
    "email": "admin@pizzacraft.com",
    "password": "admin123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Admin access authorized",
    "token": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": "adm_master_01",
      "name": "Executive Chef Mario",
      "email": "admin@pizzacraft.com",
      "role": "admin",
      "permissions": ["all"]
    }
  }
  ```

### 1.4 Email Verification
- **Route:** `POST /api/auth/verify-email`
- **Access:** Public
- **Request Body:** `{ "token": "vtok_..." }` or `{ "email": "user@example.com" }`
- **Response (200 OK):** Confirmation and verified user record.

### 1.5 Forgot Password Request
- **Route:** `POST /api/auth/forgot-password`
- **Access:** Public
- **Request Body:** `{ "email": "user@example.com" }`
- **Response (200 OK):** Dispatches simulation email with reset token.

### 1.6 Reset Password
- **Route:** `POST /api/auth/reset-password`
- **Access:** Public
- **Request Body:** `{ "token": "rst_...", "newPassword": "newSecretPassword123" }`
- **Response (200 OK):** Updates password hash in database.

---

## 2. Menu & Custom Builder (`/api/menu` and `/api/pizzas`)

### 2.1 Get Signature Pizzas
- **Route:** `GET /api/menu/pizzas`
- **Access:** Public
- **Description:** Returns all 6 curated stone-fired signature pizzas with images, ratings, badges, and default ingredient setups.

### 2.2 Get Pizza Builder Options
- **Route:** `GET /api/menu/options`
- **Access:** Public
- **Description:** Returns inventory ingredients partitioned into:
  - `bases` (5 artisanal doughs: Sourdough, Neapolitan Thin, Cheese Burst, Pan Deep Dish, Gluten-Free Cauliflower)
  - `sauces` (5 gourmet sauces: San Marzano Marinara, White Garlic Alfredo, Spicy Arrabbiata, Basil Pesto, Truffle Glaze)
  - `cheeses` (5 varieties: Fior di Latte Mozzarella, Smoked Scamorza, Gorgonzola Dolce, Burrata, Plant-Based Cashew)
  - `vegetables` (8 fresh toppings: Blistered Cherry Tomatoes, Kalamata Olives, Caramelized Onions, Wild Mushrooms, Tricolor Peppers, Escabeche Jalapeños, Artichoke Hearts, Baby Spinach)
  - `pricingRules`: Base price (₹299) and size multipliers (Regular 0.85x, Medium 1.0x, Large 1.35x).

### 2.3 Calculate Pizza Price
- **Route:** `POST /api/pizzas/calculate-price`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "size": "Large (12\")",
    "baseId": "base_sourdough",
    "sauceId": "sauce_san_marzano",
    "cheeseId": "cheese_mozzarella",
    "veggieIds": ["veg_cherry_tomatoes", "veg_wild_mushrooms"]
  }
  ```

---

## 3. Orders & Payment (`/api/orders` and `/api/payment`)

### 3.1 Create Razorpay Order Intent
- **Route:** `POST /api/orders/create-razorpay-order`
- **Description:** Validates real-time kitchen ingredient inventory before accepting checkout, calculates subtotal, GST (5%), and delivery fees. Returns Razorpay Order ID and credentials for frontend payment modal.

### 3.2 Confirm & Finalize Order
- **Route:** `POST /api/orders/confirm`
- **Description:** Verifies payment details, decrements raw ingredient inventory in real-time, generates unique order tracking number (`PZ-XXXXXX`), appends kitchen timeline entry, sends order confirmation email, and triggers low-stock monitor.

### 3.3 Track Order
- **Route:** `GET /api/orders/track/:id`
- **Description:** Fetches active status and timeline of an order using either internal ID or public `PZ-XXXXXX` tracking number.

---

## 4. Kitchen Inventory Management (`/api/admin` and `/api/inventory`)

### 4.1 Get Full Inventory
- **Route:** `GET /api/admin/inventory`
- **Description:** Lists all 23 SKUs with real-time stock levels, threshold limits, units, pricing, and health summaries.

### 4.2 Adjust Stock (Increment/Decrement)
- **Route:** `POST /api/admin/inventory/:itemId/adjust`
- **Request Body:** `{ "delta": -5 }` or `{ "delta": 20 }`

### 4.3 Update Inventory Item
- **Route:** `PUT /api/admin/inventory/:itemId`
- **Request Body:** `{ "stock": 50, "threshold": 15, "price": 49 }`

### 4.4 Update Order Status
- **Route:** `PATCH /api/admin/orders/:orderId/status`
- **Request Body:**
  ```json
  {
    "status": "In Woodfire Oven",
    "note": "Baking at 450°C on oak embers"
  }
  ```
- **Statuses Supported:** `Order Received` → `Dough & Prep` → `In Woodfire Oven` → `Quality Inspection` → `Out for Delivery` → `Delivered`.

### 4.5 Trigger Stock Audit
- **Route:** `POST /api/admin/inventory/alerts/trigger-check`
- **Description:** Triggers immediate execution of the background inventory audit algorithm.

---

## 5. System Notifications (`/api/emails`)

### 5.1 Get Dispatched Emails
- **Route:** `GET /api/emails`
- **Description:** Lists all simulated transactional and system emails (verification links, password reset links, order confirmations, and chef low-stock alerts).
