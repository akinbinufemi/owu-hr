import { Request, Response } from 'express';
import Joi from 'joi';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Check if user has permission
const hasPermission = (admin: any, requiredPermission: string): boolean => {
  if (!admin) return false;
  // SUPER_ADMIN and ADMIN have all permissions
  if (admin.role === 'SUPER_ADMIN' || admin.role === 'ADMIN') return true;
  return admin.permissions?.includes(requiredPermission) || false;
};

// Validation schemas
const createStaffSchema = Joi.object({
  employeeId: Joi.string().required(),
  fullName: Joi.string().required(),
  dateOfBirth: Joi.date().optional().allow(null, ''),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER').default('MALE'),
  maritalStatus: Joi.string().valid('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED').default('SINGLE'),
  nationality: Joi.string().optional().allow(''),
  address: Joi.string().optional().allow(''),
  personalEmail: Joi.string().email().optional().allow(''),
  workEmail: Joi.string().email().optional().allow(''),
  phoneNumbers: Joi.array().items(Joi.string()).min(1).required(),
  jobTitle: Joi.string().optional().allow(''),
  department: Joi.string().optional().allow(''),
  reportingManagerId: Joi.string().optional().allow(null, ''),
  dateOfJoining: Joi.date().optional().allow(null, ''),
  employmentType: Joi.string().valid('FULL_TIME', 'PART_TIME', 'CONTRACT').optional().allow(''),
  workLocation: Joi.string().optional().allow(''),
  emergencyContactName: Joi.string().optional().allow(''),
  emergencyContactRelationship: Joi.string().optional().allow(''),
  emergencyContactPhone: Joi.string().optional().allow(''),
  isExternallyPaid: Joi.boolean().default(false)
});

const updateStaffSchema = createStaffSchema.fork(['employeeId'], (schema) => schema.optional());

export const getAllStaff = async (req: AuthRequest, res: Response) => {
  try {
    // Check permission
    if (!hasPermission(req.admin, 'manage_staff')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to view staff members'
        },
        timestamp: new Date().toISOString()
      });
    }

    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      department = '', 
      employmentType = '',
      isActive = '',
      sortBy = 'fullName',
      sortOrder = 'asc'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { fullName: { contains: search as string, mode: 'insensitive' } },
        { employeeId: { contains: search as string, mode: 'insensitive' } },
        { workEmail: { contains: search as string, mode: 'insensitive' } },
        { jobTitle: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (department) {
      where.department = department;
    }

    if (employmentType) {
      where.employmentType = employmentType;
    }

    if (isActive !== '') {
      where.isActive = isActive === 'true';
    }

    // Get staff with pagination
    const [staff, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy as string]: sortOrder as 'asc' | 'desc'
        },
        include: {
          reportingManager: {
            select: {
              id: true,
              fullName: true,
              employeeId: true
            }
          },
          _count: {
            select: {
              subordinates: true
            }
          }
        }
      }),
      prisma.staff.count({ where })
    ]);

    const totalPages = Math.ceil(total / take);

    res.json({
      success: true,
      data: {
        staff,
        pagination: {
          page: Number(page),
          limit: take,
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get all staff error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch staff'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getStaffById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        reportingManager: {
          select: {
            id: true,
            fullName: true,
            employeeId: true
          }
        },
        subordinates: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            jobTitle: true
          }
        },
        salaryStructures: {
          where: { isActive: true },
          take: 1
        },
        loans: {
          where: { status: { in: ['PENDING', 'APPROVED'] } }
        },
        documents: true
      }
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'STAFF_NOT_FOUND',
          message: 'Staff member not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: staff,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get staff by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch staff member'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const createStaff = async (req: AuthRequest, res: Response) => {
  try {
    // Check permission
    if (!hasPermission(req.admin, 'manage_staff')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to create staff members'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate request body
    const { error, value } = createStaffSchema.validate(req.body);
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

    // Check if employee ID already exists
    const existingStaff = await prisma.staff.findUnique({
      where: { employeeId: value.employeeId }
    });

    if (existingStaff) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMPLOYEE_ID_EXISTS',
          message: 'Employee ID already exists'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if reporting manager exists (if provided)
    if (value.reportingManagerId) {
      const manager = await prisma.staff.findUnique({
        where: { id: value.reportingManagerId }
      });

      if (!manager) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MANAGER_NOT_FOUND',
            message: 'Reporting manager not found'
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    // Create staff member
    const staff = await prisma.staff.create({
      data: {
        ...value,
        reportingManagerId: value.reportingManagerId || null,
        dateOfBirth: value.dateOfBirth ? new Date(value.dateOfBirth) : null,
        dateOfJoining: value.dateOfJoining ? new Date(value.dateOfJoining) : null
      },
      include: {
        reportingManager: {
          select: {
            id: true,
            fullName: true,
            employeeId: true
          }
        }
      }
    });

    // Create audit trail
    await prisma.auditTrail.create({
      data: {
        entityType: 'STAFF',
        entityId: staff.id,
        action: 'CREATE',
        changes: { created: { old: null, new: staff } },
        performedBy: req.admin!.id
      }
    });

    res.status(201).json({
      success: true,
      data: staff,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create staff member'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const updateStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = updateStaffSchema.validate(req.body);
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

    // Check if staff exists
    const existingStaff = await prisma.staff.findUnique({
      where: { id }
    });

    if (!existingStaff) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'STAFF_NOT_FOUND',
          message: 'Staff member not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if employee ID already exists (if being updated)
    if (value.employeeId && value.employeeId !== existingStaff.employeeId) {
      const duplicateStaff = await prisma.staff.findUnique({
        where: { employeeId: value.employeeId }
      });

      if (duplicateStaff) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EMPLOYEE_ID_EXISTS',
            message: 'Employee ID already exists'
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check if reporting manager exists (if provided)
    if (value.reportingManagerId) {
      const manager = await prisma.staff.findUnique({
        where: { id: value.reportingManagerId }
      });

      if (!manager) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MANAGER_NOT_FOUND',
            message: 'Reporting manager not found'
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    // Prepare update data
    const updateData: any = { ...value };
    if (value.dateOfBirth) {
      updateData.dateOfBirth = new Date(value.dateOfBirth);
    }
    if (value.dateOfJoining) {
      updateData.dateOfJoining = new Date(value.dateOfJoining);
    }
    if (value.reportingManagerId === '') {
      updateData.reportingManagerId = null;
    }

    // Update staff member
    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: updateData,
      include: {
        reportingManager: {
          select: {
            id: true,
            fullName: true,
            employeeId: true
          }
        }
      }
    });

    // Create audit trail
    const changes: any = {};
    Object.keys(value).forEach(key => {
      if (value[key] !== (existingStaff as any)[key]) {
        changes[key] = {
          old: (existingStaff as any)[key],
          new: value[key]
        };
      }
    });

    if (Object.keys(changes).length > 0) {
      await prisma.auditTrail.create({
        data: {
          entityType: 'STAFF',
          entityId: id,
          action: 'UPDATE',
          changes,
          performedBy: req.admin!.id
        }
      });
    }

    res.json({
      success: true,
      data: updatedStaff,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update staff member'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const deleteStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if staff exists
    const existingStaff = await prisma.staff.findUnique({
      where: { id },
      include: {
        subordinates: true
      }
    });

    if (!existingStaff) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'STAFF_NOT_FOUND',
          message: 'Staff member not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if staff has subordinates
    if (existingStaff.subordinates.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'HAS_SUBORDINATES',
          message: 'Cannot delete staff member with subordinates. Please reassign subordinates first.'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Soft delete (set isActive to false)
    const deletedStaff = await prisma.staff.update({
      where: { id },
      data: { isActive: false }
    });

    // Create audit trail
    await prisma.auditTrail.create({
      data: {
        entityType: 'STAFF',
        entityId: id,
        action: 'DELETE',
        changes: { deleted: { old: true, new: false } },
        performedBy: req.admin!.id
      }
    });

    res.json({
      success: true,
      data: { message: 'Staff member deactivated successfully' },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete staff member'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getStaffAuditTrail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const auditTrail = await prisma.auditTrail.findMany({
      where: {
        entityType: 'STAFF',
        entityId: id
      },
      include: {
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    res.json({
      success: true,
      data: auditTrail,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get staff audit trail error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch audit trail'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getStaffOptions = async (req: AuthRequest, res: Response) => {
  try {
    // Get all active staff for dropdown options
    const staff = await prisma.staff.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        employeeId: true,
        jobTitle: true,
        department: true
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    // Get unique departments
    const departments = await prisma.staff.groupBy({
      by: ['department'],
      where: { isActive: true }
    });

    res.json({
      success: true,
      data: {
        staff,
        departments: departments.map(d => d.department)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get staff options error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch staff options'
      },
      timestamp: new Date().toISOString()
    });
  }
};