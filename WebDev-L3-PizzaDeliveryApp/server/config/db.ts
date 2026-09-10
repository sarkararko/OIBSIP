import mongoose from 'mongoose';
import path from 'path';

export const DATA_FILE = path.join(process.cwd(), 'server-data.json');

let mongoConnected = false;
let containerPublicIp = '34.34.244.34';
let lastMongoError: string | null = null;
let retryInterval: NodeJS.Timeout | null = null;

// Clean and validate Mongo URI (handles accidental whitespace in env vars)
export function getSanitizedMongoUri(): string | null {
  const raw = process.env.MONGODB_URI;
  if (!raw) return null;
  const cleaned = raw.trim().replace(/\s+/g, '');
  return cleaned.startsWith('mongodb') ? cleaned : null;
}

export function getClusterHost(): string {
  const uri = getSanitizedMongoUri();
  if (!uri) return 'Not Configured';
  try {
    const afterAt = uri.split('@')[1];
    if (afterAt) {
      return afterAt.split('/')[0].split('?')[0];
    }
  } catch {}
  return 'MongoDB Atlas Cluster';
}

export function isMongoConnected(): boolean {
  return mongoConnected && mongoose.connection.readyState === 1;
}

// Detect container outbound public IP for Atlas whitelisting
async function detectContainerIp(): Promise<void> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data?.ip) {
        containerPublicIp = data.ip;
      }
    }
  } catch {
    // Keep default detected container IP
  }
}

export async function connectDB(isRetry = false): Promise<boolean> {
  const mongoUri = getSanitizedMongoUri();

  if (!containerPublicIp || containerPublicIp === '34.34.244.34') {
    detectContainerIp().catch(() => {});
  }

  if (mongoUri) {
    try {
      // Disconnect any existing stale connection
      if (mongoose.connection.readyState !== 0 && !isRetry) {
        try {
          await mongoose.disconnect();
        } catch {}
      }

      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 3500,
        connectTimeoutMS: 3500,
      });

      mongoConnected = true;
      lastMongoError = null;
      console.log('✅ Connected to MongoDB Atlas cluster via Mongoose:', getClusterHost());

      // Clear retry loop on success
      if (retryInterval) {
        clearInterval(retryInterval);
        retryInterval = null;
      }

      // Seed initial data to MongoDB
      import('../services/dbService.js')
        .then(({ dbService }) => {
          dbService.seedInitialMongoData().catch((err) => {
            console.error('Error seeding MongoDB after connection:', err);
          });
        })
        .catch(() => {});

      return true;
    } catch (err: any) {
      mongoConnected = false;
      lastMongoError = err.message || 'Connection timeout / IP not whitelisted';

      if (!isRetry) {
        console.info('ℹ️ MongoDB Atlas Cluster Notice: Connection attempt failed. Reason:', lastMongoError);
        console.info(`ℹ️ Container IP: ${containerPublicIp}. To enable Atlas access, add 0.0.0.0/0 to Atlas Network Access.`);
        console.info('ℹ️ Running in memory fallback mode until Atlas whitelist takes effect. Retrying connection in background...');

        // Start background retry interval if not already running
        if (!retryInterval) {
          retryInterval = setInterval(async () => {
            if (!isMongoConnected()) {
              await connectDB(true);
            } else if (retryInterval) {
              clearInterval(retryInterval);
              retryInterval = null;
            }
          }, 20000);
        }
      }
      return false;
    }
  } else {
    console.info('ℹ️ MONGODB_URI not provided. Running with in-memory store.');
    return false;
  }
}

export function getDatabaseDiagnostics(): any {
  const connected = isMongoConnected();
  const configured = !!getSanitizedMongoUri();
  const host = getClusterHost();

  return {
    connected,
    configured,
    primaryDatabase: 'MongoDB Atlas',
    activeEngine: connected ? 'MongoDB Atlas (Primary)' : 'In-Memory Store (Action Required for Atlas)',
    clusterHost: host,
    containerPublicIp,
    lastMongoError,
    note: connected
      ? 'MongoDB Atlas is active as PRIMARY database. All collections, CRUD operations, and queries run directly on MongoDB via Mongoose models.'
      : `MongoDB Atlas is configured (${host}) but blocked by Atlas Network Access. Add 0.0.0.0/0 to Atlas whitelist to activate MongoDB as Primary.`,
    whitelistInstructions: {
      step1: 'Open MongoDB Atlas (https://cloud.mongodb.com)',
      step2: 'Navigate to Security -> Network Access',
      step3: 'Click "+ ADD IP ADDRESS"',
      step4: `Select "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0) or add current container IP: ${containerPublicIp}/32`,
      step5: 'Click Confirm and wait 30 seconds for Atlas deployment to complete.',
      step6: 'Click "Test & Reconnect MongoDB" in the PizzaCraft Admin Portal to verify immediate connection.',
    },
  };
}
