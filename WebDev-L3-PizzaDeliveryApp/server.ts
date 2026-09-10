import "dotenv/config";
import path from "node:path";
import dns from "node:dns";
import dotenv from "dotenv";

// Fallback configuration check in case executed from workspace parent directory
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), "WebDev-L3-PizzaDeliveryApp", ".env") });
}
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
}

// Configure public DNS servers for Node.js / c-ares SRV queries
try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch {
  // Continue if custom DNS set is restricted
}

import { createServer as createViteServer } from "vite";
import { createExpressApp } from "./server/app.js";
import { connectDB } from "./server/config/db.js";
import { initCronService } from "./server/services/cronService.js";

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    console.log("✅ Environment configuration loaded");

    // 1. Validate MONGODB_URI and connect to MongoDB Atlas
    console.log("🔄 Connecting to MongoDB Atlas...");
    await connectDB();

    // 2. Start scheduled low-stock inventory monitoring
    initCronService();
    console.log("✅ node-cron background inventory monitor initialized");

    // 3. Create Express application with all backend routes
    const app = createExpressApp();

    // 4. Configure Vite for development
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
        },
        appType: "spa",
      });

      app.use(vite.middlewares);
    } else {
      // 5. Serve production frontend
      const distPath = path.join(process.cwd(), "dist");
      const express = (await import("express")).default;
      app.use(express.static(distPath));

      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    // 6. Start server
    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `🚀 PizzaCraft Full-Stack Application running at http://localhost:${PORT}`
      );
    });
  } catch (error: any) {
    console.error("❌ Fatal server startup error:", error?.message || error);
    process.exit(1);
  }
}

startServer();
