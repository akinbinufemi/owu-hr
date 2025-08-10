import { Request, Response } from 'express';
import Joi from 'joi';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Validation schemas
const reportRequestSchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required().greater(Joi.ref('startDate')),
  department: Joi.string().optional().allow(''),
  format: Joi.string().valid('json', 'csv', 'excel').default('json')
});

const headcountReportSchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required().greater(Joi.ref('startDate')),
  department: Joi.string().optional().allow(''),
  employmentType: Joi.string().optional().allow(''),
  format: Joi.string().valid('json', 'csv', 'excel').default('json')
});

// Helper function to convert data to CSV format
const convertToCSV = (data: any[], headers: string[]): string => {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      // Handle values that might contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    }).join(',')
  );
  return [csvHeaders, ...csvRows].join('\n');
};

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0
  }).format(amount);
};

export const getHeadcountReport = async (req: AuthRequest, res: Response) => {
  try {
    // Validate request
    const { error, value } = headcountReportSchema.validate(req.query);
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

    const { startDate, endDate, department, employmentType, format } = value;

    // Build where clause
    const where: any = {
      dateOfJoining: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      },
      isActive: true
    };

    if (department) {
      where.department = { equals: department, mode: 'insensitive' };
    }

    if (employmentType) {
      where.employmentType = employmentType;
    }

    // Get staff data
    const staff = await prisma.staff.findMany({
      where,
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        jobTitle: true,
        department: true,
        employmentType: true,
        dateOfJoining: true,
        workLocation: true,
        gender: true,
        maritalStatus: true
      },
      orderBy: [
        { department: 'asc' },
        { dateOfJoining: 'asc' }
      ]
    });

    // Generate summary statistics
    const totalCount = staff.length;
    const departmentBreakdown = staff.reduce((acc, s) => {
      const dept = s.department || 'Unassigned';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const employmentTypeBreakdown = staff.reduce((acc, s) => {
      const empType = s.employmentType || 'Unassigned';
      acc[empType] = (acc[empType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const genderBreakdown = staff.reduce((acc, s) => {
      acc[s.gender] = (acc[s.gender] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const reportData = {
      reportType: 'Headcount Report',
      generatedAt: new Date().toISOString(),
      parameters: {
        startDate,
        endDate,
        department: department || 'All Departments',
        employmentType: employmentType || 'All Types'
      },
      summary: {
        totalCount,
        departmentBreakdown,
        employmentTypeBreakdown,
        genderBreakdown
      },
      data: staff.map(s => ({
        employeeId: s.employeeId,
        fullName: s.fullName,
        jobTitle: s.jobTitle,
        department: s.department,
        employmentType: s.employmentType,
        dateOfJoining: s.dateOfJoining ? s.dateOfJoining.toISOString().split('T')[0] : null,
        workLocation: s.workLocation,
        gender: s.gender,
        maritalStatus: s.maritalStatus
      }))
    };

    // Handle different formats
    if (format === 'csv') {
      const headers = ['employeeId', 'fullName', 'jobTitle', 'department', 'employmentType', 'dateOfJoining', 'workLocation', 'gender', 'maritalStatus'];
      const csvData = convertToCSV(reportData.data, headers);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="headcount-report-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvData);
    }

    res.json({
      success: true,
      data: reportData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get headcount report error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate headcount report'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getSalaryReport = async (req: AuthRequest, res: Response) => {
  try {
    // Validate request
    const { error, value } = reportRequestSchema.validate(req.query);
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

    const { startDate, endDate, department, format } = value;

    const startYear = new Date(startDate).getFullYear();
    const endYear = new Date(endDate).getFullYear();
    const startMonth = new Date(startDate).getMonth() + 1;
    const endMonth = new Date(endDate).getMonth() + 1;

    // Get payroll schedules within the date range
    const payrollSchedules = await prisma.payrollSchedule.findMany({
      where: {
        OR: [
          {
            year: startYear,
            month: { gte: startMonth }
          },
          {
            year: { gt: startYear, lt: endYear }
          },
          {
            year: endYear,
            month: { lte: endMonth }
          }
        ]
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    // Extract and flatten staff data from JSON
    let allStaffData: any[] = [];
    payrollSchedules.forEach(schedule => {
      const staffData = Array.isArray(schedule.staffData) ? schedule.staffData : [];
      const scheduleData = staffData.map((staff: any) => ({
        ...staff,
        payPeriod: `${schedule.month}/${schedule.year}`,
        scheduleId: schedule.id
      }));
      
      // Filter by department if specified
      if (department) {
        allStaffData.push(...scheduleData.filter((staff: any) => 
          staff.department?.toLowerCase().includes(department.toLowerCase())
        ));
      } else {
        allStaffData.push(...scheduleData);
      }
    });

    // Calculate summary statistics
    const totalGrossPay = allStaffData.reduce((sum: number, record: any) => sum + Number(record.grossPay || 0), 0);
    const totalNetPay = allStaffData.reduce((sum: number, record: any) => sum + Number(record.netPay || 0), 0);
    const totalDeductions = allStaffData.reduce((sum: number, record: any) => sum + Number(record.totalDeductions || 0), 0);
    const totalAllowances = allStaffData.reduce((sum: number, record: any) => sum + Number(record.totalAllowances || 0), 0);

    const departmentSummary = allStaffData.reduce((acc: any, record: any) => {
      const dept = record.department || 'Unknown';
      if (!acc[dept]) {
        acc[dept] = {
          count: 0,
          totalGross: 0,
          totalNet: 0,
          averageGross: 0,
          averageNet: 0
        };
      }
      acc[dept].count += 1;
      acc[dept].totalGross += Number(record.grossPay || 0);
      acc[dept].totalNet += Number(record.netPay || 0);
      acc[dept].averageGross = acc[dept].totalGross / acc[dept].count;
      acc[dept].averageNet = acc[dept].totalNet / acc[dept].count;
      return acc;
    }, {} as Record<string, any>);

    const reportData = {
      reportType: 'Salary Report',
      generatedAt: new Date().toISOString(),
      parameters: {
        startDate,
        endDate,
        department: department || 'All Departments'
      },
      summary: {
        totalRecords: allStaffData.length,
        totalGrossPay: formatCurrency(totalGrossPay),
        totalNetPay: formatCurrency(totalNetPay),
        totalDeductions: formatCurrency(totalDeductions),
        totalAllowances: formatCurrency(totalAllowances),
        departmentSummary
      },
      data: allStaffData.map((record: any) => ({
        employeeId: record.employeeId || 'N/A',
        fullName: record.fullName || 'N/A',
        jobTitle: record.jobTitle || 'N/A',
        department: record.department || 'N/A',
        payPeriod: record.payPeriod,
        basicSalary: Number(record.basicSalary || 0),
        grossPay: Number(record.grossPay || 0),
        totalAllowances: Number(record.totalAllowances || 0),
        totalDeductions: Number(record.totalDeductions || 0),
        netPay: Number(record.netPay || 0),
        paymentStatus: record.paymentStatus || 'Unknown'
      }))
    };

    // Handle CSV format
    if (format === 'csv') {
      const headers = ['employeeId', 'fullName', 'jobTitle', 'department', 'payPeriod', 'basicSalary', 'grossPay', 'totalAllowances', 'totalDeductions', 'netPay', 'paymentStatus'];
      const csvData = convertToCSV(reportData.data, headers);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="salary-report-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvData);
    }

    res.json({
      success: true,
      data: reportData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get salary report error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate salary report'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getLoanReport = async (req: AuthRequest, res: Response) => {
  try {
    // Validate request
    const { error, value } = reportRequestSchema.validate(req.query);
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

    const { startDate, endDate, department, format } = value;

    // Build where clause
    const where: any = {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    if (department) {
      where.staff = {
        department: { equals: department, mode: 'insensitive' }
      };
    }

    // Get loan data
    const loans = await prisma.loan.findMany({
      where,
      include: {
        staff: {
          select: {
            employeeId: true,
            fullName: true,
            jobTitle: true,
            department: true
          }
        },
        repayments: {
          select: {
            amount: true,
            paymentDate: true,
            paymentMethod: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' },
        { staff: { department: 'asc' } }
      ]
    });

    // Calculate summary statistics
    const totalLoanAmount = loans.reduce((sum, loan) => sum + Number(loan.amount), 0);
    const totalOutstanding = loans.reduce((sum, loan) => sum + Number(loan.outstandingBalance), 0);
    const totalRepaid = loans.reduce((sum, loan) => {
      return sum + loan.repayments.reduce((repaySum, repayment) => repaySum + Number(repayment.amount), 0);
    }, 0);

    const statusBreakdown = loans.reduce((acc, loan) => {
      acc[loan.status] = (acc[loan.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const departmentSummary = loans.reduce((acc, loan) => {
      const dept = loan.staff.department || 'Unassigned';
      if (!acc[dept]) {
        acc[dept] = {
          count: 0,
          totalAmount: 0,
          totalOutstanding: 0,
          averageAmount: 0
        };
      }
      acc[dept].count += 1;
      acc[dept].totalAmount += Number(loan.amount);
      acc[dept].totalOutstanding += Number(loan.outstandingBalance);
      acc[dept].averageAmount = acc[dept].totalAmount / acc[dept].count;
      return acc;
    }, {} as Record<string, any>);

    const reportData = {
      reportType: 'Loan Report',
      generatedAt: new Date().toISOString(),
      parameters: {
        startDate,
        endDate,
        department: department || 'All Departments'
      },
      summary: {
        totalLoans: loans.length,
        totalLoanAmount: formatCurrency(totalLoanAmount),
        totalOutstanding: formatCurrency(totalOutstanding),
        totalRepaid: formatCurrency(totalRepaid),
        statusBreakdown,
        departmentSummary
      },
      data: loans.map(loan => ({
        employeeId: loan.staff.employeeId,
        fullName: loan.staff.fullName,
        jobTitle: loan.staff.jobTitle,
        department: loan.staff.department,
        loanAmount: Number(loan.amount),
        repaymentTerms: loan.repaymentTerms,
        monthlyDeduction: Number(loan.monthlyDeduction),
        outstandingBalance: Number(loan.outstandingBalance),
        installmentsPaid: loan.installmentsPaid,
        status: loan.status,
        reason: loan.reason,
        createdAt: loan.createdAt.toISOString().split('T')[0],
        approvedDate: loan.approvedDate ? loan.approvedDate.toISOString().split('T')[0] : null,
        totalRepayments: loan.repayments.reduce((sum, r) => sum + Number(r.amount), 0)
      }))
    };

    // Handle CSV format
    if (format === 'csv') {
      const headers = ['employeeId', 'fullName', 'jobTitle', 'department', 'loanAmount', 'repaymentTerms', 'monthlyDeduction', 'outstandingBalance', 'installmentsPaid', 'status', 'reason', 'createdAt', 'approvedDate', 'totalRepayments'];
      const csvData = convertToCSV(reportData.data, headers);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="loan-report-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvData);
    }

    res.json({
      success: true,
      data: reportData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get loan report error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate loan report'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getIssuesReport = async (req: AuthRequest, res: Response) => {
  try {
    // Validate request
    const { error, value } = reportRequestSchema.validate(req.query);
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

    const { startDate, endDate, department, format } = value;

    // Build where clause
    const where: any = {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    if (department) {
      where.staff = {
        department: { equals: department, mode: 'insensitive' }
      };
    }

    // Get issues data
    const issues = await prisma.issue.findMany({
      where,
      include: {
        staff: {
          select: {
            employeeId: true,
            fullName: true,
            jobTitle: true,
            department: true
          }
        },
        admin: {
          select: {
            fullName: true,
            email: true
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });

    // Calculate summary statistics
    const statusBreakdown = issues.reduce((acc, issue) => {
      acc[issue.status] = (acc[issue.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryBreakdown = issues.reduce((acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const priorityBreakdown = issues.reduce((acc, issue) => {
      acc[issue.priority] = (acc[issue.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const reportData = {
      reportType: 'Issues Report',
      generatedAt: new Date().toISOString(),
      parameters: {
        startDate,
        endDate,
        department: department || 'All Departments'
      },
      summary: {
        totalIssues: issues.length,
        statusBreakdown,
        categoryBreakdown,
        priorityBreakdown
      },
      data: issues.map(issue => ({
        ticketNumber: issue.ticketNumber,
        title: issue.title,
        category: issue.category,
        priority: issue.priority,
        status: issue.status,
        employeeId: issue.staff?.employeeId || 'Anonymous',
        employeeName: issue.staff?.fullName || 'Anonymous',
        department: issue.staff?.department || 'N/A',
        assignedTo: issue.admin.fullName,
        commentsCount: issue._count.comments,
        createdAt: issue.createdAt.toISOString().split('T')[0],
        updatedAt: issue.updatedAt.toISOString().split('T')[0]
      }))
    };

    // Handle CSV format
    if (format === 'csv') {
      const headers = ['ticketNumber', 'title', 'category', 'priority', 'status', 'employeeId', 'employeeName', 'department', 'assignedTo', 'commentsCount', 'createdAt', 'updatedAt'];
      const csvData = convertToCSV(reportData.data, headers);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="issues-report-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvData);
    }

    res.json({
      success: true,
      data: reportData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get issues report error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate issues report'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getReportsList = async (req: AuthRequest, res: Response) => {
  try {
    const availableReports = [
      {
        id: 'headcount',
        name: 'Headcount Report',
        description: 'Employee headcount analysis by department, employment type, and demographics',
        parameters: ['startDate', 'endDate', 'department', 'employmentType'],
        formats: ['json', 'csv']
      },
      {
        id: 'salary',
        name: 'Salary Report',
        description: 'Payroll and salary analysis including gross pay, deductions, and net pay',
        parameters: ['startDate', 'endDate', 'department'],
        formats: ['json', 'csv']
      },
      {
        id: 'loan',
        name: 'Loan Report',
        description: 'Employee loans analysis including outstanding balances and repayment status',
        parameters: ['startDate', 'endDate', 'department'],
        formats: ['json', 'csv']
      },
      {
        id: 'issues',
        name: 'Issues Report',
        description: 'Staff issues and grievances analysis by category, priority, and status',
        parameters: ['startDate', 'endDate', 'department'],
        formats: ['json', 'csv']
      }
    ];

    res.json({
      success: true,
      data: {
        reports: availableReports,
        totalReports: availableReports.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get reports list error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch reports list'
      },
      timestamp: new Date().toISOString()
    });
  }
};