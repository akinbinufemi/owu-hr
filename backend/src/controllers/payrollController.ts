import { Request, Response } from 'express';
import Joi from 'joi';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Helper function to convert numbers to words (simplified version)
const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const convertHundreds = (n: number): string => {
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result;
    }
    if (n > 0) {
      result += ones[n] + ' ';
    }
    return result;
  };
  
  let result = '';
  if (num >= 1000000) {
    result += convertHundreds(Math.floor(num / 1000000)) + 'Million ';
    num %= 1000000;
  }
  if (num >= 1000) {
    result += convertHundreds(Math.floor(num / 1000)) + 'Thousand ';
    num %= 1000;
  }
  if (num > 0) {
    result += convertHundreds(num);
  }
  
  return result.trim();
};

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
            isPaused: false,
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
      
      // Calculate loan deductions (only for loans that have started)
      let loanDeduction = 0;
      const currentDate = new Date(year, month - 1, 1); // First day of payroll month
      
      for (const loan of staff.loans) {
        // Check if loan deduction should start this month
        const startDate = loan.startDate ? new Date(loan.startDate) : new Date(loan.createdAt);
        if (startDate <= currentDate) {
          const monthlyDeduction = Number(loan.monthlyDeduction);
          const outstandingBalance = Number(loan.outstandingBalance);
          loanDeduction += Math.min(monthlyDeduction, outstandingBalance);
        }
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
        designation: staff.jobTitle || 'Staff',
        jobTitle: staff.jobTitle,
        department: staff.department,
        accountDetails: staff.accountDetails || 'N/A',
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
        netSalary,
        loanDeduction // Add this for remark calculation
      };

      payrollData.push(staffPayroll);
      totalAmount += netSalary;

      // Update loan balances (only for loans that have started)
      for (const loan of staff.loans) {
        // Check if loan deduction should start this month
        const startDate = loan.startDate ? new Date(loan.startDate) : new Date(loan.createdAt);
        if (startDate <= currentDate) {
          const monthlyDeduction = Number(loan.monthlyDeduction);
          const outstandingBalance = Number(loan.outstandingBalance);
          const deductionAmount = Math.min(monthlyDeduction, outstandingBalance);
          
          if (deductionAmount > 0) {
            const newOutstandingBalance = outstandingBalance - deductionAmount;
            const newStatus = newOutstandingBalance <= 0 ? 'COMPLETED' : loan.status;
            
            await prisma.loan.update({
              where: { id: loan.id },
              data: {
                outstandingBalance: newOutstandingBalance,
                installmentsPaid: loan.installmentsPaid + 1,
                status: newStatus as any
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
    console.log('Generating PDF for payroll schedule:', id);

    const payrollSchedule = await prisma.payrollSchedule.findUnique({
      where: { id }
    });

    if (!payrollSchedule) {
      console.log('Payroll schedule not found:', id);
      return res.status(404).json({
        success: false,
        error: {
          code: 'PAYROLL_NOT_FOUND',
          message: 'Payroll schedule not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    console.log('Found payroll schedule:', payrollSchedule.id);

    // Parse staff data
    let staffData;
    try {
      staffData = JSON.parse(payrollSchedule.staffData as string);
      console.log('Parsed staff data, count:', staffData.length);
    } catch (parseError) {
      console.error('Error parsing staff data:', parseError);
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: 'Invalid staff data format'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Create PDF document
    console.log('Creating PDF document...');
    const pdfDoc = await PDFDocument.create();
    console.log('PDF document created');
    
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    console.log('Fonts embedded');

    const page = pdfDoc.addPage([842, 595]); // A4 landscape
    const { width, height } = page.getSize();
    console.log('Page added, dimensions:', width, 'x', height);

    // Professional header matching the template
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Center the header text
    const headerText = `Olowu Palace Salary Schedule for the Month of ${monthNames[payrollSchedule.month]} ${payrollSchedule.year}`;
    const headerWidth = headerText.length * 8; // Approximate width
    const centerX = (width - headerWidth) / 2;
    
    page.drawText(headerText, {
      x: Math.max(50, centerX),
      y: height - 50,
      size: 16,
      font: timesRomanBoldFont,
      color: rgb(0, 0, 0)
    });

    // Table setup
    const startY = height - 100;
    const rowHeight = 25;
    let currentY = startY;
    
    // Table headers matching the template
    const headers = ['SN', 'Designation', 'Name', 'Salary (₦)', 'Account Details', 'Remark'];
    const columnWidths = [40, 120, 150, 100, 150, 120];
    let currentX = 50;

    // Draw header row with borders
    headers.forEach((header, index) => {
      // Draw cell border
      page.drawRectangle({
        x: currentX,
        y: currentY - 5,
        width: columnWidths[index],
        height: rowHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
        color: rgb(0.95, 0.95, 0.95)
      });

      // Draw header text
      page.drawText(header, {
        x: currentX + 5,
        y: currentY + 8,
        size: 10,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0)
      });

      currentX += columnWidths[index];
    });

    currentY -= rowHeight;
    console.log('Processing staff data for PDF, count:', staffData.length);
    
    // Draw data rows
    staffData.forEach((staff: any, index: number) => {
      try {
        currentX = 50;
        
        // Extract staff data with fallbacks
        const serialNumber = (index + 1).toString();
        const designation = staff.designation || staff.position || 'Staff';
        const name = staff.fullName || staff.name || 'Unknown Staff';
        const netSalary = staff.netSalary || staff.salary || staff.basicSalary || 0;
        const accountDetails = staff.accountDetails || staff.bankAccount || 'N/A';
        
        // Calculate remark for loan deductions
        let remark = '';
        if (staff.loanDeduction && Number(staff.loanDeduction) > 0) {
          remark = `Less ₦${Number(staff.loanDeduction).toLocaleString()} for loan repayment`;
        }
        
        const rowData = [serialNumber, designation, name, Number(netSalary).toLocaleString(), accountDetails, remark];
        
        console.log(`Processing staff ${index + 1}: ${name}, net salary: ${netSalary}`);
        
        // Draw each cell
        rowData.forEach((data, colIndex) => {
          // Draw cell border
          page.drawRectangle({
            x: currentX,
            y: currentY - 5,
            width: columnWidths[colIndex],
            height: rowHeight,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1
          });

          // Draw cell text (truncate if too long)
          let displayText = data;
          if (displayText.length > 20 && colIndex !== 3) { // Don't truncate salary
            displayText = displayText.substring(0, 17) + '...';
          }

          page.drawText(displayText, {
            x: currentX + 3,
            y: currentY + 8,
            size: 9,
            font: timesRomanFont,
            color: rgb(0, 0, 0)
          });

          currentX += columnWidths[colIndex];
        });

        currentY -= rowHeight;
        
        // Add new page if needed
        if (currentY < 100) {
          console.log('Adding new page for more staff');
          const newPage = pdfDoc.addPage([842, 595]);
          currentY = height - 100;
        }
      } catch (staffError) {
        console.error(`Error processing staff ${index + 1}:`, staffError);
      }
    });

    // Total row
    currentY -= 10;
    currentX = 50;
    
    try {
      const totalAmount = Number(payrollSchedule.totalAmount) || 0;
      console.log('Adding total row:', totalAmount);
      
      const totalRowData = ['', '', 'Total:', totalAmount.toLocaleString(), '', ''];
      
      totalRowData.forEach((data, colIndex) => {
        // Draw cell border (thicker for total row)
        page.drawRectangle({
          x: currentX,
          y: currentY - 5,
          width: columnWidths[colIndex],
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 2,
          color: rgb(0.9, 0.9, 0.9)
        });

        if (data) {
          page.drawText(data, {
            x: currentX + 3,
            y: currentY + 8,
            size: 10,
            font: timesRomanBoldFont,
            color: rgb(0, 0, 0)
          });
        }

        currentX += columnWidths[colIndex];
      });
      
      // Footer text matching the template
      const totalAmountText = `The total amount payable for the month of ${monthNames[payrollSchedule.month]}, ${payrollSchedule.year} is ₦${totalAmount.toLocaleString()} (${numberToWords(totalAmount)} Naira Only)`;
      
      page.drawText(totalAmountText, {
        x: 50,
        y: currentY - 40,
        size: 11,
        font: timesRomanFont,
        color: rgb(0, 0, 0)
      });
      
    } catch (totalError) {
      console.error('Error adding total:', totalError);
    }

    // Generate PDF bytes
    console.log('Generating PDF bytes...');
    const pdfBytes = await pdfDoc.save();
    console.log('PDF bytes generated, size:', pdfBytes.length);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payroll-${monthNames[payrollSchedule.month]}-${payrollSchedule.year}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);
    console.log('Response headers set');

    // Send PDF
    res.send(Buffer.from(pdfBytes));
    console.log('PDF sent successfully');

  } catch (error) {
    console.error('Generate payroll PDF error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate payroll PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const deletePayrollSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if the payroll schedule exists
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

    // Delete the payroll schedule
    await prisma.payrollSchedule.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Payroll schedule deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete payroll schedule error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete payroll schedule'
      },
      timestamp: new Date().toISOString()
    });
  }
};