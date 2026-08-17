import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function optionalNumber(key: string, defaultValue: number): number {
  const val = process.env[key];
  if (!val) return defaultValue;
  const num = parseInt(val, 10);
  if (isNaN(num)) throw new Error(`Environment variable ${key} must be a number`);
  return num;
}

export const config = {
  env: optional('NODE_ENV', 'development'),
  port: optionalNumber('PORT', 3000),
  apiBaseUrl: optional('API_BASE_URL', 'http://localhost:3000'),

  db: {
    host: optional('MYSQL_HOST', 'localhost'),
    port: optionalNumber('MYSQL_PORT', 3306),
    database: optional('MYSQL_DATABASE', 'pinglayer'),
    user: optional('MYSQL_USER', 'root'),
    password: optional('MYSQL_PASSWORD', ''),
    connectionLimit: optionalNumber('MYSQL_CONNECTION_LIMIT', 10),
  },

  crypto: {
    // 32-byte hex string (64 hex chars) for AES-256
    credentialEncryptionKey: optional('CREDENTIAL_ENCRYPTION_KEY', ''),
  },

  meta: {
    graphApiVersion: optional('META_GRAPH_API_VERSION', 'v19.0'),
    appSecret: optional('META_APP_SECRET', ''),
    webhookVerifyToken: optional('META_WEBHOOK_VERIFY_TOKEN', ''),
  },

  admin: {
    authSecret: optional('ADMIN_AUTH_SECRET', ''),
  },

  rateLimit: {
    windowMs: optionalNumber('RATE_LIMIT_WINDOW_MS', 60_000),
    // per-product limit on /api/v1 (keyed by product id, not IP)
    maxRequests: optionalNumber('RATE_LIMIT_MAX_REQUESTS', 300),
    // per-IP limit on /admin (stricter, human-facing)
    adminMaxRequests: optionalNumber('RATE_LIMIT_ADMIN_MAX_REQUESTS', 60),
  },

  logging: {
    level: optional('LOG_LEVEL', 'info'),
    format: optional('LOG_FORMAT', 'json'),
  },

  isDev: () => config.env === 'development',
  isTest: () => config.env === 'test',
  isProd: () => config.env === 'production',
};

export function validateConfig(): void {
  if (!config.isTest()) {
    if (!config.crypto.credentialEncryptionKey) {
      throw new Error('CREDENTIAL_ENCRYPTION_KEY must be set');
    }
    if (config.crypto.credentialEncryptionKey.length !== 64) {
      throw new Error('CREDENTIAL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
  }
}
