import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  admin?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    permissions: string[];
    isActive: boolean;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required'
        },
        timestamp: new Date().toISOString()
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Verify admin still exists and is active
    const admin = await prisma.admin.findFirst({
      where: {
        id: decoded.adminId,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        permissions: true,
        isActive: true
      }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token'
        },
        timestamp: new Date().toISOString()
      });
    }

    req.admin = {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
      permissions: admin.permissions,
      isActive: admin.isActive
    };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token'
        },
        timestamp: new Date().toISOString()
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired'
        },
        timestamp: new Date().toISOString()
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Authentication failed'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const generateToken = (adminId: string): string => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    { adminId },
    jwtSecret,
    { expiresIn: '24h' }
  );
};