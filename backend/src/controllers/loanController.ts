import { Request, Response } from 'express';
import Joi from 'joi';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Validation schemas
const createLoanSchema = Joi.object({
  staffId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  reason: Joi.string().required(),
  repaymentTerms: Joi.number().integer().positive().required(),
  monthlyDeduction: Joi.number().positive().optional(),
  startDate: Joi.date().optional() // Start month of deduction
});

const updateLoanSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED').optional(),
  statusComments: Joi.string().optional(),
  approvedDate: Joi.date().optional(),
  startDate: Joi.date().optional(),
  amount: Joi.number().positive().optional(),
  reason: Joi.string().optional(),
  repaymentTerms: Joi.number().integer().positive().optional()
});

const processRepaymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  paymentMethod: Joi.string().default('MANUAL_PAYMENT'),
  notes: Joi.string().optional()
});

const updateLoanStatusSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED').required(),
  statusComments: Joi.string().required(),
  startDate: Joi.date().optional()
});

const pauseLoanSchema = Joi.object({
  isPaused: Joi.boolean().required(),
  pauseReason: Joi.string().when('isPaused', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

export const getAllLoans = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
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
        { staff: { fullName: { contains: search as string, mode: 'insensitive' } } },
        { staff: { employeeId: { contains: search as string, mode: 'insensitive' } } },
        { reason: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (staffId) {
      where.staffId = staffId;
    }

    // Get loans with pagination
    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
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
          repayments: {
            orderBy: {
              paymentDate: 'desc'
            },
            take: 5
          }
        }
      }),
      prisma.loan.count({ where })
    ]);

    const totalPages = Math.ceil(total / take);

    res.json({
      success: true,
      data: {
        loans,
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
    console.error('Get all loans error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch loans'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getLoanById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            jobTitle: true,
            department: true,
            workEmail: true
          }
        },
        repayments: {
          orderBy: {
            paymentDate: 'desc'
          }
        }
      }
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LOAN_NOT_FOUND',
          message: 'Loan not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: loan,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get loan by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch loan'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const createLoan = async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createLoanSchema.validate(req.body);
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

    // Use provided monthly deduction or calculate it (no interest rate)
    const monthlyDeduction = value.monthlyDeduction || (value.amount / value.repaymentTerms);

    // Create loan
    const loan = await prisma.loan.create({
      data: {
        staffId: value.staffId,
        amount: value.amount,
        reason: value.reason,
        repaymentTerms: value.repaymentTerms,
        monthlyDeduction,
        startDate: value.startDate,
        outstandingBalance: value.amount
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
        }
      }
    });

    res.status(201).json({
      success: true,
      data: loan,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create loan error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create loan'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const updateLoan = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = updateLoanSchema.validate(req.body);
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

    // Check if loan exists
    const existingLoan = await prisma.loan.findUnique({
      where: { id }
    });

    if (!existingLoan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LOAN_NOT_FOUND',
          message: 'Loan not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Prepare update data
    const updateData: any = { ...value };
    
    // Set updatedBy to current admin
    updateData.updatedBy = req.admin?.id;

    // If approving the loan, set approved date and start date
    if (value.status === 'APPROVED' && existingLoan.status !== 'APPROVED') {
      updateData.approvedDate = new Date();
      if (!value.startDate) {
        // Default start date to next month if not specified
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1); // First day of next month
        updateData.startDate = nextMonth;
      }
    }

    // Recalculate monthly deduction if amount or terms changed (no interest)
    if (value.amount || value.repaymentTerms) {
      const amount = value.amount || Number(existingLoan.amount);
      const terms = value.repaymentTerms || existingLoan.repaymentTerms;
      
      updateData.monthlyDeduction = amount / terms;

      // Update outstanding balance if amount changed
      if (value.amount) {
        updateData.outstandingBalance = value.amount;
      }
    }

    // Update loan
    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: updateData,
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            jobTitle: true,
            department: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedLoan,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update loan error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update loan'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const processLoanRepayment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = processRepaymentSchema.validate(req.body);
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

    // Check if loan exists
    const loan = await prisma.loan.findUnique({
      where: { id }
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LOAN_NOT_FOUND',
          message: 'Loan not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if loan is approved
    if (loan.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'LOAN_NOT_APPROVED',
          message: 'Loan must be approved before processing repayments'
        },
        timestamp: new Date().toISOString()
      });
    }

    const outstandingBalance = Number(loan.outstandingBalance);
    const repaymentAmount = Math.min(value.amount, outstandingBalance);

    if (repaymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REPAYMENT_AMOUNT',
          message: 'Repayment amount must be greater than zero and not exceed outstanding balance'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Process repayment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create repayment record
      const repayment = await tx.loanRepayment.create({
        data: {
          loanId: id,
          amount: repaymentAmount,
          paymentMethod: value.paymentMethod,
          notes: value.notes
        }
      });

      // Update loan
      const newOutstandingBalance = outstandingBalance - repaymentAmount;
      const newInstallmentsPaid = loan.installmentsPaid + 1;
      const newStatus = newOutstandingBalance <= 0 ? 'COMPLETED' : loan.status;

      const updatedLoan = await tx.loan.update({
        where: { id },
        data: {
          outstandingBalance: newOutstandingBalance,
          installmentsPaid: newInstallmentsPaid,
          status: newStatus as any
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
          updatedByAdmin: {
            select: {
              id: true,
              fullName: true
            }
          }
        }
      });

      return { repayment, loan: updatedLoan };
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Process loan repayment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process loan repayment'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getLoanLedger = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if loan exists
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            jobTitle: true,
            department: true
          }
        }
      }
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LOAN_NOT_FOUND',
          message: 'Loan not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get all repayments
    const repayments = await prisma.loanRepayment.findMany({
      where: { loanId: id },
      orderBy: { paymentDate: 'asc' }
    });

    // Calculate ledger entries
    const ledgerEntries = [];
    let runningBalance = Number(loan.amount);

    // Initial loan entry
    ledgerEntries.push({
      date: loan.createdAt,
      type: 'LOAN_DISBURSEMENT',
      description: `Loan disbursement - ${loan.reason}`,
      debit: Number(loan.amount),
      credit: 0,
      balance: runningBalance
    });

    // Repayment entries
    repayments.forEach((repayment) => {
      runningBalance -= Number(repayment.amount);
      ledgerEntries.push({
        date: repayment.paymentDate,
        type: 'REPAYMENT',
        description: `Loan repayment - ${repayment.paymentMethod}${repayment.notes ? ` (${repayment.notes})` : ''}`,
        debit: 0,
        credit: Number(repayment.amount),
        balance: runningBalance
      });
    });

    res.json({
      success: true,
      data: {
        loan,
        ledgerEntries,
        summary: {
          originalAmount: Number(loan.amount),
          totalRepaid: repayments.reduce((sum, r) => sum + Number(r.amount), 0),
          outstandingBalance: Number(loan.outstandingBalance),
          installmentsPaid: loan.installmentsPaid,
          totalInstallments: loan.repaymentTerms
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get loan ledger error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch loan ledger'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const updateLoanStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = updateLoanStatusSchema.validate(req.body);
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

    // Check if loan exists
    const existingLoan = await prisma.loan.findUnique({
      where: { id }
    });

    if (!existingLoan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LOAN_NOT_FOUND',
          message: 'Loan not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Prepare update data
    const updateData: any = {
      status: value.status,
      statusComments: value.statusComments,
      updatedBy: req.admin?.id
    };

    // If approving the loan, set approved date and start date
    if (value.status === 'APPROVED' && existingLoan.status !== 'APPROVED') {
      updateData.approvedDate = new Date();
      if (value.startDate) {
        updateData.startDate = value.startDate;
      } else {
        // Default start date to next month if not specified
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1); // First day of next month
        updateData.startDate = nextMonth;
      }
    }

    // Update loan
    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: updateData,
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
        updatedByAdmin: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedLoan,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update loan status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update loan status'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const pauseResumeLoan = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = pauseLoanSchema.validate(req.body);
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

    // Check if loan exists
    const existingLoan = await prisma.loan.findUnique({
      where: { id }
    });

    if (!existingLoan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LOAN_NOT_FOUND',
          message: 'Loan not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Update loan pause status
    const updateData: any = {
      isPaused: value.isPaused,
      updatedBy: req.admin?.id
    };

    if (value.isPaused) {
      updateData.pausedAt = new Date();
      updateData.pauseReason = value.pauseReason;
    } else {
      updateData.pausedAt = null;
      updateData.pauseReason = null;
    }

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: updateData,
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
        updatedByAdmin: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedLoan,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Pause/Resume loan error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to pause/resume loan'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getLoanSummary = async (req: AuthRequest, res: Response) => {
  try {
    // Get loan statistics
    const [
      totalLoans,
      pendingLoans,
      approvedLoans,
      completedLoans,
      rejectedLoans,
      totalLoanAmount,
      totalOutstanding,
      totalRepaid
    ] = await Promise.all([
      prisma.loan.count(),
      prisma.loan.count({ where: { status: 'PENDING' } }),
      prisma.loan.count({ where: { status: 'APPROVED' } }),
      prisma.loan.count({ where: { status: 'COMPLETED' } }),
      prisma.loan.count({ where: { status: 'REJECTED' } }),
      prisma.loan.aggregate({
        where: { status: { in: ['APPROVED', 'COMPLETED'] } },
        _sum: { amount: true }
      }),
      prisma.loan.aggregate({
        where: { status: { in: ['APPROVED'] } },
        _sum: { outstandingBalance: true }
      }),
      prisma.loanRepayment.aggregate({
        _sum: { amount: true }
      })
    ]);

    // Get recent loans
    const recentLoans = await prisma.loan.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
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
          totalLoans,
          pendingLoans,
          approvedLoans,
          completedLoans,
          rejectedLoans,
          totalDisbursed: Number(totalLoanAmount._sum.amount || 0),
          totalOutstanding: Number(totalOutstanding._sum.outstandingBalance || 0),
          totalRepaid: Number(totalRepaid._sum.amount || 0)
        },
        recentLoans
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get loan summary error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch loan summary'
      },
      timestamp: new Date().toISOString()
    });
  }
};