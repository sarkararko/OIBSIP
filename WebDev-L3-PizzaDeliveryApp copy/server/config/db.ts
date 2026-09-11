import mongoose from 'mongoose';
import dns from 'node:dns';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

// Ensure dotenv is loaded with override: true so active credentials in .env are always picked up
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'WebDev-L3-PizzaDeliveryApp', '.env'),
];
for (const cand of envCandidates) {
  if (fs.existsSync(cand)) {
    dotenv.config({ path: cand, override: true });
    break;
  }
}

// Configure standard public DNS resolvers for Node.js / c-ares SRV lookups
// Use the operating system's DNS resolver.
// Windows can resolve MongoDB Atlas SRV records correctly.
export const DATA_FILE = path.join(process.cwd(), 'server-data.json');

let mongoConnected = false;
let containerPublicIp = '34.34.244.34';
let lastMongoError: string | null = null;
let lastDiagnosedCategory: string | null = null;

export interface SafeMongoDetails {
  host: string;
  dbName: string;
  username: string;
}

// Parses and sanitizes the MongoDB URI from environment variables.
// Safely handles special characters in the password (RFC 3986 encoding),
// ensures the database name is "pizzacraft", and sets authSource to "admin".
export function parseAndSanitizeMongoUri(rawUri?: string | null): {
  uri: string;
  host: string;
  dbName: string;
  username: string;
} | null {
  const raw = rawUri || process.env.MONGODB_URI;
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

  const protoMatch = cleaned.match(/^(mongodb(?:\+srv)?:\/\/)/);
  if (!protoMatch) return null;
  const proto = protoMatch[1];
  const rest = cleaned.slice(proto.length);

  // Use the last '@' before host/database so passwords containing '@' do not break parsing
  const lastAtIndex = rest.lastIndexOf('@');
  if (lastAtIndex === -1) return null;

  const authPart = rest.slice(0, lastAtIndex);
  const hostAndDbPart = rest.slice(lastAtIndex + 1);

  // Split username and password on the first ':' in the auth portion
  const colonIndex = authPart.indexOf(':');
  if (colonIndex === -1) return null;

  const rawUser = authPart.slice(0, colonIndex);
  const rawPass = authPart.slice(colonIndex + 1);

  // Decode first to avoid double-encoding, then properly encode special characters for the driver
  const decodedUser = decodeURIComponent(rawUser);
  const decodedPass = decodeURIComponent(rawPass);

  const safeUser = encodeURIComponent(decodedUser);
  const safePass = encodeURIComponent(decodedPass);

  // Parse host and database name
  let host = hostAndDbPart;
  let dbName = 'pizzacraft';
  let query = '';

  const slashIndex = hostAndDbPart.indexOf('/');
  const qIndex = hostAndDbPart.indexOf('?');

  if (slashIndex !== -1) {
    host = hostAndDbPart.slice(0, slashIndex);
    const afterSlash = hostAndDbPart.slice(slashIndex + 1);
    const qInAfter = afterSlash.indexOf('?');
    if (qInAfter !== -1) {
      dbName = afterSlash.slice(0, qInAfter) || 'pizzacraft';
      query = afterSlash.slice(qInAfter + 1);
    } else {
      dbName = afterSlash || 'pizzacraft';
    }
  } else if (qIndex !== -1) {
    host = hostAndDbPart.slice(0, qIndex);
    query = hostAndDbPart.slice(qIndex + 1);
  }

  // Ensure query parameters include authSource=admin for Atlas authentication
  const searchParams = new URLSearchParams(query);
  if (!searchParams.has('authSource')) {
    searchParams.set('authSource', 'admin');
  }

  const queryString = searchParams.toString() ? '?' + searchParams.toString() : '';
  const finalUri = `${proto}${safeUser}:${safePass}@${host}/${dbName}${queryString}`;

  return {
    uri: finalUri,
    host,
    dbName,
    username: decodedUser,
  };
}

// Clean and sanitize Mongo URI string for Mongoose connection
export function getSanitizedMongoUri(): string | null {
  const parsed = parseAndSanitizeMongoUri();
  return parsed ? parsed.uri : null;
}

// Safely extract MongoDB host, database name, and username without ever exposing the password
export function getSafeMongoDetails(): SafeMongoDetails | null {
  const parsed = parseAndSanitizeMongoUri();
  if (!parsed) return null;
  return {
    host: parsed.host,
    dbName: parsed.dbName,
    username: parsed.username,
  };
}

// Safely extract cluster host for UI and logging
export function getClusterHost(): string {
  const details = getSafeMongoDetails();
  return details ? details.host : 'MongoDB Atlas Cluster';
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

let reconnectInterval: NodeJS.Timeout | null = null;

// Periodically attempt reconnection in the background without blocking server operations
export function startAutoReconnect(): void {
  if (reconnectInterval) return;
  reconnectInterval = setInterval(async () => {
    if (!isMongoConnected()) {
      console.log('🔄 Attempting background connection to MongoDB Atlas...');
      await connectDB(false);
    }
  }, 15000);
}

// Connect to MongoDB Atlas (Single active connection configuration)
export async function connectDB(throwOnError: boolean = false): Promise<boolean> {
  if (mongoose.connection.readyState === 1 && mongoConnected) {
    return true;
  }

  detectContainerIp().catch(() => {});

  const parsed = parseAndSanitizeMongoUri();
  if (!parsed) {
    const errorMsg = 'MONGODB_URI is not defined or is malformed in environment variables.';
    console.error(`❌ ${errorMsg}`);
    console.error('❌ Set a valid MONGODB_URI in .env.');
    if (throwOnError) {
      throw new Error(errorMsg);
    }
    return false;
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
    // Single active connection to MongoDB Atlas using sanitized URI and standard Mongoose configuration
    await mongoose.connect(parsed.uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      dbName: 'pizzacraft',
      authSource: 'admin',
    });
  } catch (err: any) {
    mongoConnected = false;
    const diag = diagnoseMongoError(err);
    lastMongoError = diag.message;
    lastDiagnosedCategory = diag.category;

    console.warn(`⚠️ Warning: MongoDB Atlas connection pending [${diag.category}].`);
    console.warn(`⚠️ Diagnostic: ${diag.message}`);
    console.warn(`⚠️ Action Required: ${diag.hint}`);

    if (throwOnError) {
      throw new Error(`MongoDB connection failed: ${diag.category} - ${diag.message}`);
    }
    return false;
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
  if (throwOnError) {
    throw new Error('MongoDB connection verification failed (connection state !== 1)');
  }
  return false;
}

export function getDatabaseDiagnostics(): any {
  const connected = isMongoConnected();
  const configured = !!getSanitizedMongoUri();
  const host = getClusterHost();
  const details = getSafeMongoDetails();

  return {
    connected,
    configured,
    primaryDatabase: 'MongoDB Atlas',
    activeEngine: connected ? 'MongoDB Atlas (Primary)' : 'Disconnected (MongoDB Atlas Required)',
    clusterHost: host,
    databaseName: details?.dbName || 'pizzacraft',
    username: details?.username || 'Not Available',
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
      step4: `Select "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0) or add your current IP address.`,
      step5: 'Click Confirm and wait 30 seconds for Atlas deployment to complete.',
      step6: 'Restart server to verify immediate connection.',
    },
  };
}
