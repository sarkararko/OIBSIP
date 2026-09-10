import mongoose from 'mongoose';
import dns from 'node:dns';
import path from 'path';

// Fix for Node.js / c-ares SRV lookup bug (querySrv ECONNREFUSED) on Windows and local routers:
// Local router DNS resolvers often reject SRV queries. Explicitly configuring standard public resolvers
// allows Node to resolve MongoDB Atlas SRV records smoothly.
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // If setServers is restricted or unavailable, continue gracefully
}

export const DATA_FILE = path.join(process.cwd(), 'server-data.json');

let mongoConnected = false;
let containerPublicIp = '34.34.244.34';
let lastMongoError: string | null = null;
let lastDiagnosedCategory: string | null = null;

// Clean and sanitize Mongo URI (removes accidental whitespace, quotes, or trailing parameters)
export function getSanitizedMongoUri(): string | null {
  const raw = process.env.MONGODB_URI;
  if (!raw) return null;
  let cleaned = raw.trim();

  // Strip surrounding quotes if present
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Remove whitespace
  cleaned = cleaned.replace(/\s+/g, '');

  if (!cleaned.startsWith('mongodb://') && !cleaned.startsWith('mongodb+srv://')) {
    return null;
  }

  return cleaned;
}

// Safely extract cluster host without credentials for logging and UI
export function getClusterHost(): string {
  const uri = getSanitizedMongoUri();
  if (!uri) return 'Not Configured';
  try {
    const afterAt = uri.split('@')[1];
    if (afterAt) {
      return afterAt.split('/')[0].split('?')[0];
    }
  } catch {
    // Fallback
  }
  return 'MongoDB Atlas Cluster';
}

export function isMongoConnected(): boolean {
  return mongoConnected && mongoose.connection.readyState === 1;
}

// Classify connection errors without exposing any secrets or credentials
export function diagnoseMongoError(err: any): { category: string; message: string; hint: string } {
  const rawMsg = (err?.message || String(err)).toLowerCase();

  if (
    rawMsg.includes('querysrv') ||
    rawMsg.includes('econnrefused') ||
    rawMsg.includes('enotfound') ||
    rawMsg.includes('eservfail')
  ) {
    return {
      category: 'DNS_SRV_RESOLUTION_ERROR',
      message: 'Node.js DNS resolver failed to resolve SRV record for MongoDB Atlas cluster.',
      hint: 'Ensure your network allows DNS SRV lookups or set public DNS resolvers (8.8.8.8).',
    };
  }

  if (
    rawMsg.includes('serverselectiontimeout') ||
    rawMsg.includes('could not connect to any servers') ||
    rawMsg.includes('etimedout') ||
    rawMsg.includes('connection timed out')
  ) {
    return {
      category: 'IP_WHITELIST_OR_FIREWALL_ERROR',
      message: 'Cluster unreachable. Current IP address is likely not whitelisted in MongoDB Atlas Network Access.',
      hint: 'In MongoDB Atlas -> Network Access, add your current IP address or 0.0.0.0/0.',
    };
  }

  if (
    rawMsg.includes('bad auth') ||
    rawMsg.includes('authentication failed') ||
    rawMsg.includes('auth error')
  ) {
    return {
      category: 'AUTHENTICATION_FAILURE',
      message: 'MongoDB Atlas rejected database user credentials.',
      hint: 'Check database username and password in MONGODB_URI in .env.',
    };
  }

  if (rawMsg.includes('tlssockerror') || rawMsg.includes('ssl') || rawMsg.includes('certificate')) {
    return {
      category: 'TLS_SSL_HANDSHAKE_ERROR',
      message: 'TLS/SSL handshake with MongoDB Atlas cluster failed.',
      hint: 'Verify system certificate authorities and OpenSSL configuration.',
    };
  }

  return {
    category: 'DATABASE_CONNECTION_ERROR',
    message: 'Unable to establish connection to MongoDB Atlas.',
    hint: 'Check MONGODB_URI format and cluster status.',
  };
}

// Convert mongodb+srv:// to direct replica set URI to bypass local SRV DNS issues
async function resolveMongoSrvToDirectUri(srvUri: string): Promise<string | null> {
  try {
    const match = srvUri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/\?]+)\/?([^\?]*)(\?.*)?$/);
    if (!match) return null;
    const [, username, password, hostname, dbName] = match;

    let shardHosts: string[] = [];
    let replicaSet = 'atlas-yq6og4-shard-0';
    let authSource = 'admin';

    try {
      const addresses = await new Promise<dns.SrvRecord[]>((resolve, reject) => {
        dns.resolveSrv(`_mongodb._tcp.${hostname}`, (err, addrs) => {
          if (err) reject(err);
          else resolve(addrs);
        });
      });
      if (addresses && addresses.length > 0) {
        shardHosts = addresses.map((a) => `${a.name}:${a.port}`);
      }
    } catch {
      // Direct known shard nodes for pizzacraftcluster
      if (hostname.includes('pizzacraftcluster.ixxjdxp.mongodb.net')) {
        shardHosts = [
          'ac-votuwiv-shard-00-00.ixxjdxp.mongodb.net:27017',
          'ac-votuwiv-shard-00-01.ixxjdxp.mongodb.net:27017',
          'ac-votuwiv-shard-00-02.ixxjdxp.mongodb.net:27017',
        ];
      }
    }

    if (shardHosts.length === 0) return null;

    try {
      const txt = await new Promise<string[][]>((resolve, reject) => {
        dns.resolveTxt(hostname, (err, records) => {
          if (err) reject(err);
          else resolve(records);
        });
      });
      if (txt && txt.length > 0) {
        const flat = txt.flat().join('&');
        const params = new URLSearchParams(flat);
        if (params.get('replicaSet')) replicaSet = params.get('replicaSet')!;
        if (params.get('authSource')) authSource = params.get('authSource')!;
      }
    } catch {
      // Keep defaults
    }

    const targetDb = dbName || 'pizzacraft';
    return `mongodb://${username}:${password}@${shardHosts.join(',')}/${targetDb}?ssl=true&replicaSet=${replicaSet}&authSource=${authSource}`;
  } catch {
    return null;
  }
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

// Connect to MongoDB Atlas
export async function connectDB(throwOnError?: boolean): Promise<boolean> {
  detectContainerIp().catch(() => {});

  const mongoUri = getSanitizedMongoUri();
  const allowFallback = process.env.ALLOW_LOCAL_FALLBACK === 'true';
  const shouldThrow = throwOnError !== undefined ? throwOnError : !allowFallback;

  if (!mongoUri) {
    const errorMsg = 'MONGODB_URI is not defined or is malformed in environment variables.';
    if (!shouldThrow) {
      console.warn(`⚠️ ${errorMsg} Running in temporary local fallback mode.`);
      mongoConnected = false;
      return false;
    }
    console.error(`❌ ${errorMsg}`);
    console.error('❌ Set MONGODB_URI in .env, or set ALLOW_LOCAL_FALLBACK=true for offline local development.');
    throw new Error(errorMsg);
  }

  // Disconnect any stale connection before fresh connect
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }

  try {
    // Primary attempt using configured URI
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
  } catch (primaryErr: any) {
    const diag = diagnoseMongoError(primaryErr);

    // If DNS SRV query failed on local resolver, attempt direct replica set connection
    if (diag.category === 'DNS_SRV_RESOLUTION_ERROR' && mongoUri.startsWith('mongodb+srv://')) {
      console.info('ℹ️ DNS SRV query was refused by local resolver. Attempting direct replica set resolution...');
      const directUri = await resolveMongoSrvToDirectUri(mongoUri);
      if (directUri) {
        try {
          await mongoose.connect(directUri, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
          });
        } catch (directErr: any) {
          primaryErr = directErr;
        }
      }
    }

    if (mongoose.connection.readyState !== 1) {
      mongoConnected = false;
      const finalDiag = diagnoseMongoError(primaryErr);
      lastMongoError = finalDiag.message;
      lastDiagnosedCategory = finalDiag.category;

      if (!shouldThrow) {
        console.warn(`⚠️ MongoDB Atlas connection unsuccessful [${finalDiag.category}].`);
        console.warn(`⚠️ Details: ${finalDiag.message}`);
        console.warn('⚠️ Running in temporary local fallback mode.');
        return false;
      }

      console.error(`❌ Fatal: Failed to connect to MongoDB Atlas [${finalDiag.category}].`);
      console.error(`❌ Diagnostic: ${finalDiag.message}`);
      console.error(`❌ Action Required: ${finalDiag.hint}`);
      console.error('❌ MongoDB Atlas is the required primary database for this application.');
      console.error('❌ (To enable temporary offline development fallback, explicitly set ALLOW_LOCAL_FALLBACK=true in .env)');
      throw new Error(`MongoDB connection failed: ${finalDiag.category} - ${finalDiag.message}`);
    }
  }

  // Verify connection state
  if (mongoose.connection.readyState === 1) {
    mongoConnected = true;
    lastMongoError = null;
    lastDiagnosedCategory = null;
    console.log('✅ MongoDB Atlas connected');

    // Seed master datasets into MongoDB Atlas
    try {
      const { dbService } = await import('../services/dbService.js');
      await dbService.seedInitialMongoData();
    } catch (seedErr: any) {
      console.error('⚠️ Warning: Initial database seed encountered an error:', seedErr?.message || seedErr);
    }

    return true;
  }

  mongoConnected = false;
  return false;
}

export function getDatabaseDiagnostics(): any {
  const connected = isMongoConnected();
  const configured = !!getSanitizedMongoUri();
  const host = getClusterHost();

  return {
    connected,
    configured,
    primaryDatabase: 'MongoDB Atlas',
    activeEngine: connected ? 'MongoDB Atlas (Primary)' : 'In-Memory Fallback (Action Required for Atlas)',
    clusterHost: host,
    containerPublicIp,
    lastMongoError,
    lastDiagnosedCategory,
    note: connected
      ? 'MongoDB Atlas is active as PRIMARY database. All collections, CRUD operations, and queries run directly on MongoDB via Mongoose models.'
      : `MongoDB Atlas is configured (${host}) but not connected. ${lastMongoError || ''}`,
    whitelistInstructions: {
      step1: 'Open MongoDB Atlas (https://cloud.mongodb.com)',
      step2: 'Navigate to Security -> Network Access',
      step3: 'Click "+ ADD IP ADDRESS"',
      step4: `Select "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0) or add current container IP: ${containerPublicIp}/32`,
      step5: 'Click Confirm and wait 30 seconds for Atlas deployment to complete.',
      step6: 'Restart server to verify immediate connection.',
    },
  };
}
