import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
import dotenv from "dotenv";

// Explicitly locate and load .env with override: true so active credentials always take effect
const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "WebDev-L3-PizzaDeliveryApp", ".env"),
];

let envLoaded = false;
for (const cand of envCandidates) {
  if (fs.existsSync(cand)) {
    dotenv.config({ path: cand, override: true });
    envLoaded = true;
    break;
  }
}
if (!envLoaded) {
  dotenv.config({ override: true });
}

// Configure standard public DNS resolvers for Node.js / c-ares SRV lookups
try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch {
  // Continue if custom DNS set is restricted
}

import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { createExpressApp } from "./server/app.js";
import { connectDB, getSafeMongoDetails, startAutoReconnect } from "./server/config/db.js";
import { initCronService } from "./server/services/cronService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname;

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    console.log("✅ Environment configuration loaded");

    // Safe startup diagnostic printing only host, dbName, and username (never the password)
    const mongoDetails = getSafeMongoDetails();
    if (mongoDetails) {
      console.log(`📊 Target MongoDB Host: ${mongoDetails.host}`);
      console.log(`📊 Target Database: ${mongoDetails.dbName}`);
      console.log(`📊 Database User: ${mongoDetails.username}`);
    }

    // 1. Start scheduled low-stock inventory monitoring
    initCronService();
    console.log("✅ node-cron background inventory monitor initialized");

    // 2. Create Express application with all backend routes
    const app = createExpressApp();

    // 3. Configure Vite for development
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        root: projectRoot,
        server: {
          middlewareMode: true,
        },
        appType: "spa",
      });

      app.use(vite.middlewares);
    } else {
      // 4. Serve production frontend
      const distPath = path.join(projectRoot, "dist");
      const express = (await import("express")).default;
      app.use(express.static(distPath));

      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    // 5. Start HTTP server binding immediately to 0.0.0.0:PORT
    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `🚀 PizzaCraft Full-Stack Application running at http://localhost:${PORT}`
      );
    });

    // 6. Connect to MongoDB Atlas asynchronously without blocking dev server startup
    console.log("🔄 Initiating MongoDB Atlas connection...");
    connectDB(false).catch((err) => {
      console.warn("⚠️ Initial database connection deferred:", err?.message || err);
    });
    startAutoReconnect();
  } catch (error: any) {
    console.error("❌ Fatal server startup error:", error?.message || error);
  }
}

startServer();
