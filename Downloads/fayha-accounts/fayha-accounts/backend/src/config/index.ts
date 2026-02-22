// ==========================================
// FAYHA TRANSPORTATION - ACCOUNTING SYSTEM
// Application Configuration
// ==========================================

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // File Upload
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  },

  // Email
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'Fayha Accounts <noreply@fayha-transport.sa>',
  },

  // ZATCA
  zatca: {
    env: process.env.ZATCA_ENV || 'sandbox',
    apiUrl: process.env.ZATCA_API_URL || '',
    complianceCsid: process.env.ZATCA_COMPLIANCE_CSID || '',
    complianceSecret: process.env.ZATCA_COMPLIANCE_SECRET || '',
    productionCsid: process.env.ZATCA_PRODUCTION_CSID || '',
    productionSecret: process.env.ZATCA_PRODUCTION_SECRET || '',
  },

  // Company
  company: {
    name: process.env.COMPANY_NAME || 'Fayha Transportation',
    nameAr: process.env.COMPANY_NAME_AR || 'فيحاء للنقليات',
    crNumber: process.env.COMPANY_CR_NUMBER || '',
    vatNumber: process.env.COMPANY_VAT_NUMBER || '',
    address: process.env.COMPANY_ADDRESS || 'Riyadh, Saudi Arabia',
    phone: process.env.COMPANY_PHONE || '',
    email: process.env.COMPANY_EMAIL || '',
  },

  // Accounting
  accounting: {
    currency: process.env.DEFAULT_CURRENCY || 'SAR',
    fiscalYearStart: process.env.FISCAL_YEAR_START || '01-01',
    vatRate: 0.15, // 15% Saudi VAT
  },

  // Rate Limiting (ERP apps make many parallel API calls per page)
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '2000', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    file: process.env.LOG_FILE || './logs/app.log',
  },
};

// Validate required config
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Warning: ${envVar} is not set in environment variables`);
  }
}

export default config;
