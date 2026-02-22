// FAYHA TRANSPORTATION - Auth Controller
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../config/database';
import { AuthRequest } from '../types';

export const authController = {
  // POST /api/v1/auth/login
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.isActive) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn } as any
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn } as any
      );

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      const { password: _, ...userData } = user;

      res.json({
        success: true,
        data: {
          user: userData,
          token,
          refreshToken,
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/v1/auth/register
  async register(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: role || 'VIEWER',
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true }
      });

      res.status(201).json({ success: true, data: user });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/v1/auth/me
  async getProfile(req: AuthRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, phone: true, avatar: true, lastLoginAt: true, createdAt: true
        }
      });

      res.json({ success: true, data: user });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/v1/auth/refresh
  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;

      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user || !user.isActive) {
        return res.status(401).json({ success: false, error: 'Invalid refresh token' });
      }

      const newToken = jwt.sign(
        { userId: user.id, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn } as any
      );

      res.json({ success: true, data: { token: newToken } });
    } catch (error: any) {
      res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }
  }
};
