import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import Joi from 'joi';
import prisma from '../config/database';
import { generateToken, AuthRequest } from '../middleware/auth';
import { validatePasswordStrength, isCommonWeakPassword } from '../utils/passwordValidation';
import { getDaysUntilExpiry, isPasswordExpired } from '../utils/passwordExpiry';

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  fullName: Joi.string().min(2).max(100).required(),
});

export const login = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details: error.details
        },
        timestamp: new Date().toISOString()
      });
    }

    const { email, password } = value;

    // Find admin by email
    const admin = await prisma.admin.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        fullName: true,
        role: true,
        permissions: true,
        isActive: true,
        passwordExpiresAt: true,
        mustChangePassword: true
      }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        },
        timestamp: new Date().toISOString()
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Account has been disabled'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if password has expired
    const now = new Date();
    const isPasswordExpired = admin.passwordExpiresAt && admin.passwordExpiresAt < now;
    const mustChangePassword = admin.mustChangePassword || isPasswordExpired;

    if (mustChangePassword) {
      return res.status(200).json({
        success: true,
        data: {
          requiresPasswordChange: true,
          message: isPasswordExpired 
            ? 'Your password has expired. Please change your password to continue.' 
            : 'You must change your password before continuing.',
          admin: {
            id: admin.id,
            email: admin.email,
            fullName: admin.fullName
          }
        },
        timestamp: new Date().toISOString()
      });
    }

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() }
    });

    // Generate JWT token
    const token = generateToken(admin.id);

    // Calculate days until password expires
    const daysUntilExpiry = admin.passwordExpiresAt 
      ? Math.ceil((admin.passwordExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Return success response
    res.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          fullName: admin.fullName,
          role: admin.role,
          permissions: admin.permissions
        },
        passwordInfo: {
          daysUntilExpiry,
          showExpiryWarning: daysUntilExpiry !== null && daysUntilExpiry <= 7
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Login failed'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    // In a more complex system, you might want to blacklist the token
    // For now, we'll just return a success response
    res.json({
      success: true,
      data: {
        message: 'Logged out successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Logout failed'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const verifyToken = async (req: AuthRequest, res: Response) => {
  try {
    // If we reach here, the token is valid (middleware already verified it)
    res.json({
      success: true,
      data: {
        admin: req.admin,
        valid: true
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Token verification failed'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const refreshToken = async (req: AuthRequest, res: Response) => {
  try {
    // Generate new token for the authenticated admin
    const newToken = generateToken(req.admin!.id);

    res.json({
      success: true,
      data: {
        token: newToken,
        admin: req.admin
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Token refresh failed'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const register = async (req: Request, res: Response) => {
  // SECURITY: Public registration disabled for production security
  // Only SUPER_ADMIN users can create new admin accounts through the admin panel
  return res.status(403).json({
    success: false,
    error: {
      code: 'REGISTRATION_DISABLED',
      message: 'Public admin registration is disabled for security reasons. Contact your system administrator to create new admin accounts.'
    },
    timestamp: new Date().toISOString()
  });
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const changePasswordSchema = Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().min(8).required(),
    });

    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details: error.details
        },
        timestamp: new Date().toISOString()
      });
    }

    const { currentPassword, newPassword } = value;

    // Get current admin with password
    const admin = await prisma.admin.findUnique({
      where: { id: req.admin!.id },
      select: {
        id: true,
        password: true
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ADMIN_NOT_FOUND',
          message: 'Admin not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'Current password is incorrect'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'New password does not meet security requirements',
          details: passwordValidation.errors
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if new password is the same as current
    const isSamePassword = await bcrypt.compare(newPassword, admin.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SAME_PASSWORD',
          message: 'New password must be different from current password'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and reset expiry
    const now = new Date();
    const passwordExpiresAt = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 days from now

    await prisma.admin.update({
      where: { id: req.admin!.id },
      data: { 
        password: hashedNewPassword,
        passwordChangedAt: now,
        passwordExpiresAt: passwordExpiresAt,
        mustChangePassword: false
      }
    });

    res.json({
      success: true,
      data: {
        message: 'Password changed successfully'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Password change failed'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getPasswordInfo = async (req: AuthRequest, res: Response) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.admin!.id },
      select: {
        passwordExpiresAt: true,
        passwordChangedAt: true,
        mustChangePassword: true
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ADMIN_NOT_FOUND',
          message: 'Admin not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    const daysUntilExpiry = getDaysUntilExpiry(admin.passwordExpiresAt);
    const expired = isPasswordExpired(admin.passwordExpiresAt);

    res.json({
      success: true,
      data: {
        passwordChangedAt: admin.passwordChangedAt,
        passwordExpiresAt: admin.passwordExpiresAt,
        daysUntilExpiry,
        isExpired: expired,
        mustChangePassword: admin.mustChangePassword,
        showExpiryWarning: daysUntilExpiry !== null && daysUntilExpiry <= 7
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get password info error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get password information'
      },
      timestamp: new Date().toISOString()
    });
  }
};