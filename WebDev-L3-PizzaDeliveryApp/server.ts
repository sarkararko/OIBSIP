import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createExpressApp } from './server/app.js';
import { connectDB } from './server/config/db.js';
import { initCronService } from './server/services/cronService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;

async function startServer() {
  // 1. Initialize MongoDB connection (with automatic fallback to local persistence)
  await connectDB();

  // 2. Initialize Node-Cron background low-stock inventory monitor
  initCronService();

  // 3. Create Express application with all backend routes
  const app = createExpressApp();

  // 4. Vite middleware for frontend development & production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      root: __dirname,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use((await import('express')).default.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 5. Start listening on container standard port 3000
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PizzaCraft Full-Stack Application running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
