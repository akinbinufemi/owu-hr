import { Request, Response } from 'express';
import Joi from 'joi';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Validation schemas
const createSalaryStructureSchema = Joi.object({
  staffId: Joi.string().required(),
  basicSalary: Joi.number().positive().required(),
  housingAllowance: Joi.number().min(0).default(0),
  transportAllowance: Joi.number().min(0).default(0),
  medicalAllowance: Joi.number().min(0).default(0),
  otherAllowances: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      amount: Joi.number().positive().required()
    })
  ).default([]),
  taxDeduction: Joi.number().min(0).default(0),
  pensionDeduction: Joi.number().min(0).default(0),
  loanDeduction: Joi.number().min(0).default(0),
  otherDeductions: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      amount: Joi.number().positive().required()
    })
  ).default([]),
  effectiveDate: Joi.date().default(() => new Date())
});

const generatePayrollSchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2020).max(2030).required()
});

export const getSalaryStructures = async (req: AuthRequest, res: Response) => {
  try {
    const { staffId, isActive = 'true' } = req.query;

    const where: any = {};
    if (staffId) {
      where.staffId = staffId as string;
    }
    if (isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const salaryStructures = await prisma.salaryStructure.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            jobTitle: true,
            department: true,
            isExternallyPaid: true
          }
        }
      },
      orderBy: {
        effectiveDate: 'desc'
      }
    });

    res.json({
      success: true,
      data: salaryStructures,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get salary structures error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch salary structures'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const createSalaryStructure = async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createSalaryStructureSchema.validate(req.body);
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

    // Deactivate existing salary structures for this staff
    await prisma.salaryStructure.updateMany({
      where: {
        staffId: value.staffId,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    // Create new salary structure
    const salaryStructure = await prisma.salaryStructure.create({
      data: {
        ...value,
        effectiveDate: new Date(value.effectiveDate)
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
      data: salaryStructure,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create salary structure error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create salary structure'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const updateSalaryStructure = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const updateSchema = createSalaryStructureSchema.fork(['staffId'], (schema) => schema.optional());
    const { error, value } = updateSchema.validate(req.body);
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

    // Check if salary structure exists
    const existingSalaryStructure = await prisma.salaryStructure.findUnique({
      where: { id }
    });

    if (!existingSalaryStructure) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SALARY_STRUCTURE_NOT_FOUND',
          message: 'Salary structure not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Update salary structure
    const updatedSalaryStructure = await prisma.salaryStructure.update({
      where: { id },
      data: {
        ...value,
        effectiveDate: value.effectiveDate ? new Date(value.effectiveDate) : undefined
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

    res.json({
      success: true,
      data: updatedSalaryStructure,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update salary structure error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update salary structure'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const generatePayroll = async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const { error, value } = generatePayrollSchema.validate(req.body);
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

    const { month, year } = value;

    // Check if payroll already exists for this month/year
    const existingPayroll = await prisma.payrollSchedule.findUnique({
      where: {
        month_year: {
          month,
          year
        }
      }
    });

    if (existingPayroll) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'PAYROLL_EXISTS',
          message: 'Payroll for this month already exists'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get all active staff with their salary structures (excluding externally paid)
    const staffWithSalaries = await prisma.staff.findMany({
      where: {
        isActive: true,
        isExternallyPaid: false
      },
      include: {
        salaryStructures: {
          where: {
            isActive: true
          },
          take: 1
        },
        loans: {
          where: {
            status: 'APPROVED',
            outstandingBalance: {
              gt: 0
            }
          }
        }
      }
    });

    // Calculate payroll for each staff member
    const payrollData = [];
    let totalAmount = 0;

    for (const staff of staffWithSalaries) {
      if (staff.salaryStructures.length === 0) {
        continue; // Skip staff without salary structure
      }

      const salaryStructure = staff.salaryStructures[0];
      
      // Calculate gross salary
      const basicSalary = Number(salaryStructure.basicSalary);
      const housingAllowance = Number(salaryStructure.housingAllowance);
      const transportAllowance = Number(salaryStructure.transportAllowance);
      const medicalAllowance = Number(salaryStructure.medicalAllowance);
      
      // Parse other allowances
      const otherAllowances = Array.isArray(salaryStructure.otherAllowances) 
        ? (salaryStructure.otherAllowances as any[])
        : [];
      const otherAllowancesTotal = otherAllowances.reduce((sum, allowance) => sum + (allowance.amount || 0), 0);

      const grossSalary = basicSalary + housingAllowance + transportAllowance + medicalAllowance + otherAllowancesTotal;

      // Calculate deductions
      const taxDeduction = Number(salaryStructure.taxDeduction);
      const pensionDeduction = Number(salaryStructure.pensionDeduction);
      
      // Calculate loan deductions
      let loanDeduction = 0;
      for (const loan of staff.loans) {
        const monthlyDeduction = Number(loan.monthlyDeduction);
        const outstandingBalance = Number(loan.outstandingBalance);
        loanDeduction += Math.min(monthlyDeduction, outstandingBalance);
      }

      // Parse other deductions
      const otherDeductions = Array.isArray(salaryStructure.otherDeductions) 
        ? (salaryStructure.otherDeductions as any[])
        : [];
      const otherDeductionsTotal = otherDeductions.reduce((sum, deduction) => sum + (deduction.amount || 0), 0);

      const totalDeductions = taxDeduction + pensionDeduction + loanDeduction + otherDeductionsTotal;
      const netSalary = grossSalary - totalDeductions;

      const staffPayroll = {
        staffId: staff.id,
        employeeId: staff.employeeId,
        fullName: staff.fullName,
        jobTitle: staff.jobTitle,
        department: staff.department,
        basicSalary,
        allowances: {
          housing: housingAllowance,
          transport: transportAllowance,
          medical: medicalAllowance,
          other: otherAllowances
        },
        grossSalary,
        deductions: {
          tax: taxDeduction,
          pension: pensionDeduction,
          loan: loanDeduction,
          other: otherDeductions
        },
        totalDeductions,
        netSalary
      };

      payrollData.push(staffPayroll);
      totalAmount += netSalary;

      // Update loan balances
      for (const loan of staff.loans) {
        const monthlyDeduction = Number(loan.monthlyDeduction);
        const outstandingBalance = Number(loan.outstandingBalance);
        const deductionAmount = Math.min(monthlyDeduction, outstandingBalance);
        
        if (deductionAmount > 0) {
          await prisma.loan.update({
            where: { id: loan.id },
            data: {
              outstandingBalance: outstandingBalance - deductionAmount,
              installmentsPaid: loan.installmentsPaid + 1
            }
          });

          // Create loan repayment record
          await prisma.loanRepayment.create({
            data: {
              loanId: loan.id,
              amount: deductionAmount,
              paymentMethod: 'SALARY_DEDUCTION',
              notes: `Payroll deduction for ${month}/${year}`
            }
          });
        }
      }
    }

    // Create payroll schedule record
    const payrollSchedule = await prisma.payrollSchedule.create({
      data: {
        month,
        year,
        staffData: JSON.stringify(payrollData),
        totalAmount,
        generatedBy: req.admin!.id
      }
    });

    res.json({
      success: true,
      data: {
        payrollSchedule,
        staffCount: payrollData.length,
        totalAmount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Generate payroll error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate payroll'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getPayrollSchedules = async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.query;

    const where: any = {};
    if (year) {
      where.year = parseInt(year as string);
    }
    if (month) {
      where.month = parseInt(month as string);
    }

    const payrollSchedules = await prisma.payrollSchedule.findMany({
      where,
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    res.json({
      success: true,
      data: payrollSchedules,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get payroll schedules error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch payroll schedules'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getPayrollSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const payrollSchedule = await prisma.payrollSchedule.findUnique({
      where: { id }
    });

    if (!payrollSchedule) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PAYROLL_NOT_FOUND',
          message: 'Payroll schedule not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Parse staff data
    const staffData = JSON.parse(payrollSchedule.staffData as string);

    res.json({
      success: true,
      data: {
        ...payrollSchedule,
        staffData
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get payroll schedule error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch payroll schedule'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const generatePayrollPDF = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const payrollSchedule = await prisma.payrollSchedule.findUnique({
      where: { id }
    });

    if (!payrollSchedule) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PAYROLL_NOT_FOUND',
          message: 'Payroll schedule not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Parse staff data
    const staffData = JSON.parse(payrollSchedule.staffData as string);

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const page = pdfDoc.addPage([842, 595]); // A4 landscape
    const { width, height } = page.getSize();

    // Header
    page.drawText('OWU PALACE STAFF', {
      x: 50,
      y: height - 50,
      size: 20,
      font: timesRomanBoldFont,
      color: rgb(0, 0, 0)
    });

    page.drawText('MONTHLY SALARY SCHEDULE', {
      x: 50,
      y: height - 80,
      size: 16,
      font: timesRomanBoldFont,
      color: rgb(0, 0, 0)
    });

    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    page.drawText(`${monthNames[payrollSchedule.month]} ${payrollSchedule.year}`, {
      x: 50,
      y: height - 110,
      size: 14,
      font: timesRomanFont,
      color: rgb(0, 0, 0)
    });

    // Table headers
    const startY = height - 150;
    const rowHeight = 25;
    let currentY = startY;

    const headers = ['S/N', 'Employee ID', 'Name', 'Basic Salary', 'Allowances', 'Gross', 'Deductions', 'Net Salary'];
    const columnWidths = [40, 80, 150, 80, 80, 80, 80, 100];
    let currentX = 50;

    // Draw header row
    headers.forEach((header, index) => {
      page.drawRectangle({
        x: currentX,
        y: currentY - 5,
        width: columnWidths[index],
        height: rowHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
        color: rgb(0.9, 0.9, 0.9)
      });

      page.drawText(header, {
        x: currentX + 5,
        y: currentY + 5,
        size: 10,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0)
      });

      currentX += columnWidths[index];
    });

    currentY -= rowHeight;

    // Draw data rows
    staffData.forEach((staff: any, index: number) => {
      currentX = 50;
      
      const rowData = [
        (index + 1).toString(),
        staff.employeeId,
        staff.fullName.length > 20 ? staff.fullName.substring(0, 17) + '...' : staff.fullName,
        `₦${staff.basicSalary.toLocaleString()}`,
        `₦${(staff.grossSalary - staff.basicSalary).toLocaleString()}`,
        `₦${staff.grossSalary.toLocaleString()}`,
        `₦${staff.totalDeductions.toLocaleString()}`,
        `₦${staff.netSalary.toLocaleString()}`
      ];

      rowData.forEach((data, colIndex) => {
        page.drawRectangle({
          x: currentX,
          y: currentY - 5,
          width: columnWidths[colIndex],
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1
        });

        page.drawText(data, {
          x: currentX + 5,
          y: currentY + 5,
          size: 9,
          font: timesRomanFont,
          color: rgb(0, 0, 0)
        });

        currentX += columnWidths[colIndex];
      });

      currentY -= rowHeight;

      // Add new page if needed
      if (currentY < 100) {
        const newPage = pdfDoc.addPage([842, 595]);
        currentY = height - 50;
      }
    });

    // Total row
    currentY -= 10;
    currentX = 50;
    
    // Draw total row
    const totalData = ['', '', 'TOTAL', '', '', '', '', `₦${Number(payrollSchedule.totalAmount).toLocaleString()}`];
    
    totalData.forEach((data, colIndex) => {
      page.drawRectangle({
        x: currentX,
        y: currentY - 5,
        width: columnWidths[colIndex],
        height: rowHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 2,
        color: rgb(0.95, 0.95, 0.95)
      });

      if (data) {
        page.drawText(data, {
          x: currentX + 5,
          y: currentY + 5,
          size: 10,
          font: timesRomanBoldFont,
          color: rgb(0, 0, 0)
        });
      }

      currentX += columnWidths[colIndex];
    });

    // Footer
    page.drawText(`Generated on: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: 50,
      size: 10,
      font: timesRomanFont,
      color: rgb(0.5, 0.5, 0.5)
    });

    page.drawText(`Total Staff: ${staffData.length}`, {
      x: 300,
      y: 50,
      size: 10,
      font: timesRomanFont,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payroll-${monthNames[payrollSchedule.month]}-${payrollSchedule.year}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);

    // Send PDF
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Generate payroll PDF error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate payroll PDF'
      },
      timestamp: new Date().toISOString()
    });
  }
};