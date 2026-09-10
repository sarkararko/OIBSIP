# 🎥 Oasis Infobyte (OIBSIP) - Level 3 Video Demonstration Guide

This guide outlines the recommended 2-to-3 minute video demonstration script for presenting your **PizzaCraft** Level 3 Pizza Delivery Full-Stack Application for final submission and evaluation.

---

## 📌 Video Overview & Submission Details

- **Internship Organization:** Oasis Infobyte
- **Track:** Web Development & Designing
- **Level:** Level 3 – Advanced
- **Task:** Pizza Delivery Full-Stack Application
- **Project Name:** PizzaCraft
- **Target Video Duration:** 2 to 3 minutes
- **Recommended Tools:** Loom, OBS Studio, or Clipchamp (Upload as Unlisted on YouTube or Google Drive with public view access)

---

## 🎬 Step-by-Step Demonstration Flow

### 1. Introduction (0:00 - 0:25)
- **Visual:** Open browser to the PizzaCraft homepage.
- **Talking Points:**
  - State your full name and your role as an Oasis Infobyte Web Development Intern.
  - Introduce the project: *"This is PizzaCraft, an end-to-end full-stack pizza ordering and inventory management platform built with React, TypeScript, Tailwind CSS, Express, and dual-layer persistence (MongoDB + resilient fallback engine)."*
  - Mention key capabilities: 4-step custom pizza builder, real-time inventory tracking, Razorpay test payment integration, automated stock background audits, and customer/admin portals.

### 2. User Authentication & Browsing (0:25 - 0:50)
- **Visual:** Click "Sign In", showcase the login modal, and log in as customer (`user@example.com` / `password123`) or create a new account.
- **Talking Points:**
  - Highlight JWT-based authentication with bcrypt password hashing.
  - Note the built-in email verification and password reset capability.
  - Show the stone-fired signature pizza menu with real-time stock availability badges.

### 3. Interactive 4-Step Custom Pizza Builder (0:50 - 1:25)
- **Visual:** Navigate to "Custom Builder".
- **Action Steps:**
  - **Step 1:** Select a pizza base (e.g., Sourdough Crust).
  - **Step 2:** Select a gourmet sauce (e.g., Basil Pesto).
  - **Step 3:** Select a cheese type (e.g., Fresh Mozzarella).
  - **Step 4:** Select farm vegetable toppings (e.g., Bell Peppers, Mushrooms, Olives).
- **Talking Points:**
  - Highlight the live dynamic visual pizza canvas that renders chosen crust, sauce tint, and toppings.
  - Show the live dynamic pricing calculation that updates instantaneously based on size multiplier and selected ingredients.
  - Click "Add to Cart".

### 4. Cart, Promo Code & Razorpay Checkout (1:25 - 1:55)
- **Visual:** Open Cart Drawer.
- **Action Steps:**
  - Apply coupon code `PIZZA50` to show dynamic discount calculation.
  - Review 5% GST and delivery fee calculation.
  - Click "Proceed to Secure Payment".
  - Complete the test transaction using the Razorpay payment modal.
- **Talking Points:**
  - Mention pre-flight kitchen stock validation that prevents ordering out-of-stock items.
  - Complete payment and transition immediately to live order tracking.

### 5. Real-Time Order Tracking & Kitchen Inventory Deduction (1:55 - 2:30)
- **Visual:** Show the live tracking timeline (`Order Received` ➔ `In Kitchen` ➔ `In Oven` ➔ `Out for Delivery`).
- **Talking Points:**
  - Point out the active status tracker with delivery partner details and address summary.

### 6. Admin Portal & Automated Stock Audits (2:30 - 3:00)
- **Visual:** Switch to Kitchen Admin Portal (`admin@pizzacraft.com` / `admin123`).
- **Action Steps:**
  - Show the Executive Kitchen Dashboard metrics (revenue, orders, active items).
  - Show the real-time inventory table: demonstrate how the order just placed deducted the exact raw ingredient stock.
  - Demonstrate the quick restock controls and safety threshold alerts.
  - Advance the order status to demonstrate real-time kitchen workflow.
  - Mention the `node-cron` background job running every 30 minutes for automated low-stock detection and notification.

### 7. Conclusion (3:00 - 3:15)
- Conclude by thanking Oasis Infobyte for the internship opportunity and referencing the repository structure in `OIBSIP/WebDev-L3-PizzaDeliveryApp`.
