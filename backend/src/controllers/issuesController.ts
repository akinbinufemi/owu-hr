import { Request, Response } from 'express';
import Joi from 'joi';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Validation schemas
const createIssueSchema = Joi.object({
  staffId: Joi.string().optional().allow(null),
  category: Joi.string().valid('WORKPLACE_CONFLICT', 'PAYROLL_DISCREPANCY', 'POLICY_VIOLATION', 'PERFORMANCE_ISSUE', 'ATTENDANCE_ISSUE', 'OTHER').required(),
  title: Joi.string().required().min(5).max(200),
  description: Joi.string().required().min(10).max(2000),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').default('MEDIUM')
});

const updateIssueSchema = Joi.object({
  category: Joi.string().valid('WORKPLACE_CONFLICT', 'PAYROLL_DISCREPANCY', 'POLICY_VIOLATION', 'PERFORMANCE_ISSUE', 'ATTENDANCE_ISSUE', 'OTHER').optional(),
  title: Joi.string().min(5).max(200).optional(),
  description: Joi.string().min(10).max(2000).optional(),
  status: Joi.string().valid('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED').optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
  assignedTo: Joi.string().optional()
});

const createCommentSchema = Joi.object({
  content: Joi.string().required().min(1).max(1000)
});

// Generate unique ticket number
const generateTicketNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `ISS-${currentYear}-`;
  
  // Get the latest ticket number for this year
  const latestIssue = await prisma.issue.findFirst({
    where: {
      ticketNumber: {
        startsWith: prefix
      }
    },
    orderBy: {
      ticketNumber: 'desc'
    }
  });

  let nextNumber = 1;
  if (latestIssue) {
    const lastNumber = parseInt(latestIssue.ticketNumber.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
};

export const getAllIssues = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '',
      category = '',
      priority = '',
      staffId = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { ticketNumber: { contains: search as string, mode: 'insensitive' } },
        { staff: { fullName: { contains: search as string, mode: 'insensitive' } } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    if (priority) {
      where.priority = priority;
    }

    if (staffId) {
      where.staffId = staffId;
    }

    // Get issues with pagination
    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy as string]: sortOrder as 'asc' | 'desc'
        },
        include: {
          staff: {
            select: {
              id: true,
              fullName: true,
              employeeId: true,
              jobTitle: true,
              department: true
            }
          },
          admin: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          comments: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 3,
            select: {
              id: true,
              content: true,
              createdBy: true,
              createdAt: true
            }
          },
          _count: {
            select: {
              comments: true
            }
          }
        }
      }),
      prisma.issue.count({ where })
    ]);

    const totalPages = Math.ceil(total / take);

    res.json({
      success: true,
      data: {
        issues,
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
    console.error('Get all issues error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch issues'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getIssueById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            jobTitle: true,
            department: true,
            workEmail: true,
            phoneNumbers: true
          }
        },
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        comments: {
          orderBy: {
            createdAt: 'asc'
          },
          select: {
            id: true,
            content: true,
            createdBy: true,
            createdAt: true
          }
        }
      }
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ISSUE_NOT_FOUND',
          message: 'Issue not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: issue,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get issue by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch issue'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const createIssue = async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createIssueSchema.validate(req.body);
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

    // Check if staff exists (if staffId is provided)
    if (value.staffId) {
      const staff = await prisma.staff.findUnique({
        where: { id: value.staffId }
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
    }

    // Generate ticket number
    const ticketNumber = await generateTicketNumber();

    // Get the current admin (assigned to the current admin by default)
    const assignedTo = req.admin!.id;

    // Create issue
    const issue = await prisma.issue.create({
      data: {
        ...value,
        ticketNumber,
        assignedTo
      },
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            jobTitle: true,
            department: true
          }
        },
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: issue,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create issue'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const updateIssue = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = updateIssueSchema.validate(req.body);
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

    // Check if issue exists
    const existingIssue = await prisma.issue.findUnique({
      where: { id }
    });

    if (!existingIssue) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ISSUE_NOT_FOUND',
          message: 'Issue not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if assignedTo admin exists (if provided)
    if (value.assignedTo) {
      const admin = await prisma.admin.findUnique({
        where: { id: value.assignedTo }
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ADMIN_NOT_FOUND',
            message: 'Assigned admin not found'
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    // Update issue
    const updatedIssue = await prisma.issue.update({
      where: { id },
      data: value,
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            jobTitle: true,
            department: true
          }
        },
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedIssue,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update issue'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const deleteIssue = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if issue exists
    const existingIssue = await prisma.issue.findUnique({
      where: { id },
      include: {
        comments: true
      }
    });

    if (!existingIssue) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ISSUE_NOT_FOUND',
          message: 'Issue not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Delete issue (comments will be deleted automatically due to cascade)
    await prisma.issue.delete({
      where: { id }
    });

    res.json({
      success: true,
      data: { message: 'Issue deleted successfully' },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete issue'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = createCommentSchema.validate(req.body);
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

    // Check if issue exists
    const issue = await prisma.issue.findUnique({
      where: { id }
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ISSUE_NOT_FOUND',
          message: 'Issue not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Create comment
    const comment = await prisma.issueComment.create({
      data: {
        issueId: id,
        content: value.content,
        createdBy: req.admin!.id
      }
    });

    res.status(201).json({
      success: true,
      data: comment,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to add comment'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getIssueComments = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Check if issue exists
    const issue = await prisma.issue.findUnique({
      where: { id }
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ISSUE_NOT_FOUND',
          message: 'Issue not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get comments with pagination
    const [comments, total] = await Promise.all([
      prisma.issueComment.findMany({
        where: { issueId: id },
        skip,
        take,
        orderBy: {
          createdAt: 'asc'
        }
      }),
      prisma.issueComment.count({ where: { issueId: id } })
    ]);

    const totalPages = Math.ceil(total / take);

    res.json({
      success: true,
      data: {
        comments,
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
    console.error('Get issue comments error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch comments'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getIssuesSummary = async (req: AuthRequest, res: Response) => {
  try {
    // Get issue statistics
    const [totalIssues, openIssues, inProgressIssues, resolvedIssues, closedIssues] = await Promise.all([
      prisma.issue.count(),
      prisma.issue.count({ where: { status: 'OPEN' } }),
      prisma.issue.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.issue.count({ where: { status: 'RESOLVED' } }),
      prisma.issue.count({ where: { status: 'CLOSED' } })
    ]);

    // Get category breakdown
    const categoryBreakdown = await prisma.issue.groupBy({
      by: ['category'],
      _count: {
        category: true
      }
    });

    // Get priority breakdown
    const priorityBreakdown = await prisma.issue.groupBy({
      by: ['priority'],
      _count: {
        priority: true
      }
    });

    // Get recent issues
    const recentIssues = await prisma.issue.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        staff: {
          select: {
            fullName: true,
            employeeId: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        statistics: {
          totalIssues,
          openIssues,
          inProgressIssues,
          resolvedIssues,
          closedIssues
        },
        categoryBreakdown: categoryBreakdown.reduce((acc, item) => {
          acc[item.category] = item._count.category;
          return acc;
        }, {} as Record<string, number>),
        priorityBreakdown: priorityBreakdown.reduce((acc, item) => {
          acc[item.priority] = item._count.priority;
          return acc;
        }, {} as Record<string, number>),
        recentIssues
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get issues summary error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch issues summary'
      },
      timestamp: new Date().toISOString()
    });
  }
};