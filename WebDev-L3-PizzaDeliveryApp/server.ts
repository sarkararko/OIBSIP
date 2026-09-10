import "dotenv/config";

import path from "path";
import { createServer as createViteServer } from "vite";
import { createExpressApp } from "./server/app.js";
import { connectDB } from "./server/config/db.js";
import { initCronService } from "./server/services/cronService.js";

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Start scheduled low-stock inventory monitoring
    initCronService();

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
  } catch (error) {
    console.error("❌ Fatal server startup error:", error);
    process.exit(1);
  }
}

startServer();