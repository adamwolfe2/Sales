/**
 * Server Configuration
 * Centralizes environment variables and security settings
 */

import 'dotenv/config';

// Validate required environment variables
function requireEnv(name, defaultValue = null) {
  const value = process.env[name];
  if (!value && defaultValue === null) {
    console.error(`FATAL: Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value || defaultValue;
}

// Security: JWT_SECRET must be set in production
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = isProduction
  ? requireEnv('JWT_SECRET')
  : (process.env.JWT_SECRET || 'dev-secret-change-in-production');

if (!isProduction && !process.env.JWT_SECRET) {
  console.warn('WARNING: Using default JWT_SECRET. Set JWT_SECRET environment variable in production!');
}

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,

  // Security
  jwtSecret: JWT_SECRET,
  jwtExpiresIn: '7d',

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // CORS
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5173', 'file://'],

  // Admin defaults (for seeding)
  adminEmail: process.env.ADMIN_EMAIL || 'admin@vendingpreneurs.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'changeme123',

  // Invite codes
  inviteCodeLength: 12, // Increased from 8 for better entropy
  inviteExpiryDays: 30
};

export default config;
