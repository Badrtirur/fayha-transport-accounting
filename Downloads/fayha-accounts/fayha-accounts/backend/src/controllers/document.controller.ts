// ==========================================
// FAYHA TRANSPORTATION - Document Controller
// Manages stored PDF documents with download endpoints
// ==========================================

import { Request, Response } from 'express';
import prisma from '../config/database';
import fs from 'fs';
import path from 'path';
import { PDF_DIR } from '../utils/pdf-generator';

export const documentController = {
  /**
   * GET /documents/entity/:entityType/:entityId
   * Get all documents for a given entity (e.g., SalesInvoice)
   */
  async getByEntity(req: Request, res: Response) {
    try {
      const { entityType, entityId } = req.params;
      const documents = await prisma.document.findMany({
        where: { entityType, entityId },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: documents });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /documents/:id/download
   * Stream a document file to the client for download
   */
  async download(req: Request, res: Response) {
    try {
      const document = await prisma.document.findUnique({
        where: { id: req.params.id },
      });
      if (!document) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      const absPath = path.resolve(document.filePath);
      if (!fs.existsSync(absPath)) {
        return res.status(404).json({ success: false, error: 'File not found on disk' });
      }

      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
      res.setHeader('Content-Length', document.fileSize);

      const readStream = fs.createReadStream(absPath);
      readStream.pipe(res);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
};
