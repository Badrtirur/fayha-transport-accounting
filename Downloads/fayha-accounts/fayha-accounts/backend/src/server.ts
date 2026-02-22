// ==========================================
// FAYHA TRANSPORTATION - ACCOUNTING SYSTEM
// Server Entry Point
// ==========================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import routes from './routes';
import prisma from './config/database';

const app = express();

// ==================== MIDDLEWARE ====================

// Security
app.use(helmet());

// CORS - allow any localhost port in development
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
      callback(null, true);
    } else {
      callback(null, config.corsOrigin);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { success: false, error: 'Too many requests, please try again later' },
});
app.use('/api', limiter);

// Static files (uploads)
app.use('/uploads', express.static(config.upload.dir));

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'Fayha Transportation - Accounting System',
    version: '1.0.0',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use(`/api/${config.apiVersion}`, routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🔥 Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: config.env === 'development' ? err.message : 'Internal server error',
  });
});

// ==================== START SERVER ====================

app.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║   🚚  FAYHA TRANSPORTATION                        ║
║       Accounting & Finance System                  ║
║                                                    ║
║   Server:  http://localhost:${config.port}                 ║
║   API:     http://localhost:${config.port}/api/${config.apiVersion}           ║
║   Health:  http://localhost:${config.port}/health             ║
║   Env:     ${config.env}                          ║
║                                                    ║
╚════════════════════════════════════════════════════╝
  `);

  // One-time repair: fix payment entry bank transactions that were incorrectly typed as DEBIT
  (async () => {
    try {
      const wrongTxns = await prisma.bankTransaction.findMany({
        where: { documentType: 'PAYMENT', type: 'DEBIT' },
      });
      let fixed = 0;
      for (const txn of wrongTxns) {
        if (!txn.documentRef) continue;
        const je: any = await prisma.journalEntry.findFirst({
          where: { entryNumber: txn.documentRef, referenceType: 'PAYMENT_ENTRY' },
          include: { lines: true },
        });
        if (!je) continue;
        let meta: any = {};
        try { meta = je.notes ? JSON.parse(je.notes) : {}; } catch { /* */ }
        let bankLine = (je.lines || []).find((l: any) => l.accountId === meta.ledgerAccountId);
        if (!bankLine) {
          bankLine = (je.lines || []).find((l: any) => (l.debitAmount || 0) > 0 && (l.creditAmount || 0) === 0);
        }
        if (bankLine && (bankLine.debitAmount || 0) > (bankLine.creditAmount || 0)) {
          await prisma.bankTransaction.update({ where: { id: txn.id }, data: { type: 'CREDIT' } });
          fixed++;
        }
      }
      if (fixed > 0) {
        // Recalculate bank balances
        const banks = await prisma.bankAccount.findMany({ where: { isActive: true } });
        for (const bank of banks) {
          const txns = await prisma.bankTransaction.findMany({ where: { bankAccountId: bank.id } });
          let balance = bank.openingBalance || 0;
          for (const t of txns) {
            balance += t.type === 'CREDIT' ? t.amount : -t.amount;
          }
          await prisma.bankAccount.update({ where: { id: bank.id }, data: { currentBalance: balance } });
        }
        console.log(`[Startup] Fixed ${fixed} payment bank transactions (DEBIT → CREDIT)`);
      }
    } catch (err) {
      console.error('[Startup] Bank transaction repair failed:', err);
    }
  })();
});

export default app;
