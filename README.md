🍕 Pizza Delivery Full-Stack Application

A full-stack Pizza Delivery Application developed as part of the Full Stack Web Development Internship at Oasis Infobyte – Level 3.

🚀 Features

User Features

User registration and authentication

JWT-based login

Email verification

Forgot/reset password

Pizza dashboard and menu

Custom pizza builder

Multiple bases and sauces

Cheese and vegetable selection

Cart and order summary

Razorpay Test Mode payment

Order tracking and status updates

Admin Features

Separate admin authentication

Inventory management

Manage pizza ingredients

Automatic stock reduction after orders

Manual stock updates

Low-stock monitoring/alerts

Order management

Order status updates

🧰 Technologies Used

Frontend: React, TypeScript, Vite

Backend: Node.js, Express.js

Database: MongoDB

Authentication: JWT

Payment: Razorpay Test Mode

API: REST APIs

Version Control: Git & GitHub

📁 Project Structure

WebDev-L3-PizzaDeliveryApp/
├── public/
├── screenshots/
├── src/
├── server/
├── package.json
├── README.md
└── .env.example

⚙️ Installation & Setup

1. Clone the repository

git clone YOUR_OIBSIP_GITHUB_REPOSITORY_URL
cd OIBSIP/WebDev-L3-PizzaDeliveryApp

2. Install dependencies

npm install

3. Configure environment variables

Create a .env file based on .env.example.

Example:

MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_test_key
RAZORPAY_KEY_SECRET=your_razorpay_test_secret

Never commit .env or secret credentials to GitHub.

4. Run the application

Use the scripts defined in package.json.

npm run dev

If frontend and backend use separate processes, start them according to the project's configured scripts.

💳 Razorpay Test Mode

The application uses Razorpay Test Mode for payment testing. Test credentials must be stored in environment variables and must not be committed to the repository.

🗄️ Database

MongoDB is used for application data including users, pizza ingredients, inventory, orders and order statuses.

🔐 Security

Sensitive information such as database connection strings, JWT secrets, Razorpay secrets, email credentials and admin credentials should be stored in environment variables and excluded from GitHub.

📸 Screenshots

The screenshots/ directory contains screenshots demonstrating the application's major user and admin features.

🎥 Demo Video

The project demo video demonstrates the application working end-to-end for the Oasis Infobyte Full Stack Web Development Internship – Level 3 submission.

🎓 Internship

Organization: Oasis Infobyte
Track: Full Stack Web Development
Level: Level 3
Project: Pizza Delivery Application

👨‍💻 Developer

Arkoparno De Sarkar

GitHub: https://github.com/sarkararko

Portfolio: https://arkoparno.vercel.app/

⭐ Developed as an internship project to strengthen practical skills in full-stack web development, authentication, database management, REST APIs, frontend-backend integration and payment integration.
