import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import Joi from 'joi';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { validatePasswordStrength } from '../utils/passwordValidation';

// Validation schemas
const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  fullName: Joi.string().min(2).max(100).required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'VIEWER').required(),
  permissions: Joi.array().items(Joi.string()).default([])
});

const updateUserSchema = Joi.object({
  email: Joi.string().email(),
  fullName: Joi.string().min(2).max(100),
  password: Joi.string().min(8),
  role: Joi.string().valid('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'VIEWER'),
  permissions: Joi.array().items(Joi.string())
});

const systemSettingSchema = Joi.object({
  key: Joi.string().required(),
  value: Joi.string().required(),
  description: Joi.string().allow(''),
  category: Joi.string().default('general')
});

// Check if user has permission
const hasPermission = (admin: any, requiredPermission: string): boolean => {
  if (!admin) return false;
  if (admin.role === 'SUPER_ADMIN') return true;
  return admin.permissions?.includes(requiredPermission) || false;
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    // Check permission
    if (!hasPermission(req.admin, 'manage_users')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to manage users'
        },
        timestamp: new Date().toISOString()
      });
    }

    const users = await prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        createdBy: true,
        createdByAdmin: {
          select: {
            fullName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: users,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch users'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    // Skip permission check for SUPER_ADMIN
    if (req.admin?.role !== 'SUPER_ADMIN') {
      if (!hasPermission(req.admin, 'manage_users')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to create users'
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    // Validate request body
    const { error, value } = createUserSchema.validate(req.body);
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

    const { email, fullName, password, role, permissions } = value;

    // Check if user already exists
    const existingUser = await prisma.admin.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'A user with this email already exists'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password does not meet security requirements',
          details: passwordValidation.errors
        },
        timestamp: new Date().toISOString()
      });
    }

    // Only SUPER_ADMIN can create other SUPER_ADMINs
    if (role === 'SUPER_ADMIN' && req.admin?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only Super Admins can create other Super Admins'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Set password expiry (90 days from now)
    const now = new Date();
    const passwordExpiresAt = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

    // Create user
    const newUser = await prisma.admin.create({
      data: {
        email,
        fullName,
        password: hashedPassword,
        role: role as any,
        permissions,
        createdBy: req.admin!.id,
        passwordChangedAt: now,
        passwordExpiresAt: passwordExpiresAt,
        mustChangePassword: true // Force new users to change password on first login
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      data: newUser,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create user'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check permission
    if (!hasPermission(req.admin, 'manage_users')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to update users'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate request body
    const { error, value } = updateUserSchema.validate(req.body);
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

    const { email, fullName, password, role, permissions } = value;

    // Check if user exists
    const existingUser = await prisma.admin.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Prevent users from modifying their own role (except SUPER_ADMIN)
    if (existingUser.id === req.admin!.id && role && req.admin?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CANNOT_MODIFY_OWN_ROLE',
          message: 'You cannot modify your own role'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Only SUPER_ADMIN can modify SUPER_ADMIN roles
    if ((existingUser.role === 'SUPER_ADMIN' || role === 'SUPER_ADMIN') && req.admin?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only Super Admins can modify Super Admin accounts'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Prepare update data
    const updateData: any = {};
    if (email) updateData.email = email;
    if (fullName) updateData.fullName = fullName;
    if (role) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;

    // Handle password update
    if (password) {
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'WEAK_PASSWORD',
            message: 'Password does not meet security requirements',
            details: passwordValidation.errors
          },
          timestamp: new Date().toISOString()
        });
      }

      const saltRounds = 12;
      updateData.password = await bcrypt.hash(password, saltRounds);
    }

    // Update user
    const updatedUser = await prisma.admin.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        permissions: true,
        isActive: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: updatedUser,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update user'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const toggleUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Check permission
    if (!hasPermission(req.admin, 'manage_users')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to modify user status'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if user exists
    const existingUser = await prisma.admin.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Prevent users from deactivating themselves
    if (existingUser.id === req.admin!.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CANNOT_MODIFY_OWN_STATUS',
          message: 'You cannot modify your own account status'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Only SUPER_ADMIN can modify other SUPER_ADMIN status
    if (existingUser.role === 'SUPER_ADMIN' && req.admin?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only Super Admins can modify Super Admin accounts'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Update user status
    const updatedUser = await prisma.admin.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true
      }
    });

    res.json({
      success: true,
      data: updatedUser,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update user status'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getSystemSettings = async (req: AuthRequest, res: Response) => {
  try {
    // Skip permission check for SUPER_ADMIN
    if (req.admin?.role !== 'SUPER_ADMIN') {
      if (!hasPermission(req.admin, 'system_settings')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to view system settings'
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    const settings = await prisma.systemSettings.findMany({
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: settings,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch system settings'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const createSystemSetting = async (req: AuthRequest, res: Response) => {
  try {
    // Check permission
    if (!hasPermission(req.admin, 'system_settings')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to create system settings'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate request body
    const { error, value } = systemSettingSchema.validate(req.body);
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

    const { key, value: settingValue, description, category } = value;

    // Check if setting already exists
    const existingSetting = await prisma.systemSettings.findUnique({
      where: { key }
    });

    if (existingSetting) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SETTING_ALREADY_EXISTS',
          message: 'A setting with this key already exists'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Create setting
    const newSetting = await prisma.systemSettings.create({
      data: {
        key,
        value: settingValue,
        description,
        category,
        updatedBy: req.admin!.id
      }
    });

    res.status(201).json({
      success: true,
      data: newSetting,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create system setting error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create system setting'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const updateSystemSetting = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check permission
    if (!hasPermission(req.admin, 'system_settings')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to update system settings'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate request body
    const { error, value } = systemSettingSchema.validate(req.body);
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

    const { value: settingValue, description, category } = value;

    // Update setting
    const updatedSetting = await prisma.systemSettings.update({
      where: { id },
      data: {
        value: settingValue,
        description,
        category,
        updatedBy: req.admin!.id
      }
    });

    res.json({
      success: true,
      data: updatedSetting,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update system setting error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update system setting'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const deleteSystemSetting = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check permission
    if (!hasPermission(req.admin, 'system_settings')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to delete system settings'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Delete setting
    await prisma.systemSettings.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'System setting deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete system setting error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete system setting'
      },
      timestamp: new Date().toISOString()
    });
  }
};

// Category Management Functions
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    // Skip permission check for SUPER_ADMIN
    if (req.admin?.role !== 'SUPER_ADMIN') {
      if (!hasPermission(req.admin, 'system_settings')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to view categories'
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    const categories = await prisma.category.findMany({
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: categories,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch categories'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    // Skip permission check for SUPER_ADMIN
    if (req.admin?.role !== 'SUPER_ADMIN') {
      if (!hasPermission(req.admin, 'system_settings')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to create categories'
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    const { name, type, description } = req.body;

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name and type are required'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate type
    const validTypes = ['POSITION', 'DEPARTMENT', 'JOB_TYPE', 'ISSUE_CATEGORY'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: 'Invalid category type'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if category already exists
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        type
      }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CATEGORY_ALREADY_EXISTS',
          message: 'A category with this name and type already exists'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Create category
    const newCategory = await prisma.category.create({
      data: {
        name: name.trim(),
        type,
        description: description?.trim() || null
      }
    });

    res.status(201).json({
      success: true,
      data: newCategory,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create category'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Check permission
    if (!hasPermission(req.admin, 'system_settings')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to update categories'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name is required'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check for duplicate name within the same type
    const duplicateCategory = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        type: existingCategory.type,
        id: { not: id }
      }
    });

    if (duplicateCategory) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CATEGORY_ALREADY_EXISTS',
          message: 'A category with this name already exists for this type'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null
      }
    });

    res.json({
      success: true,
      data: updatedCategory,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update category'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const toggleCategoryStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Check permission
    if (!hasPermission(req.admin, 'system_settings')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to modify category status'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Update category status
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { isActive }
    });

    res.json({
      success: true,
      data: updatedCategory,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Toggle category status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update category status'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check permission
    if (!hasPermission(req.admin, 'system_settings')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to delete categories'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if category is being used
    const categoryUsage = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            staffPositions: true,
            staffDepartments: true,
            staffJobTypes: true,
            issues: true
          }
        }
      }
    });

    if (!categoryUsage) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Prevent deletion if category is in use
    const totalUsage = categoryUsage._count.staffPositions + 
                      categoryUsage._count.staffDepartments + 
                      categoryUsage._count.staffJobTypes + 
                      categoryUsage._count.issues;
    
    if (totalUsage > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CATEGORY_IN_USE',
          message: 'Cannot delete category as it is currently being used'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Delete category
    await prisma.category.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Category deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete category'
      },
      timestamp: new Date().toISOString()
    });
  }
};