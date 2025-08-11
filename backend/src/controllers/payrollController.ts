import { Request, Response } from 'express';
import Joi from 'joi';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import puppeteer from 'puppeteer';
import axios from 'axios';

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

    // Generate and store PDF and CSV files
    try {
      const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      const fileName = `payroll-${monthNames[month]}-${year}-${payrollSchedule.id}`;
      
      // Generate PDF content using jsPDF (server-side)
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF('landscape');
      
      // Add title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const title = `Olowu Palace Salary Schedule for the Month of ${monthNames[month]} ${year}`;
      const titleWidth = doc.getTextWidth(title);
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.text(title, (pageWidth - titleWidth) / 2, 20);
      
      // Prepare table data
      const tableData = payrollData.map((staff: any, index: number) => [
        index + 1,
        staff.designation || staff.jobTitle || 'Staff',
        staff.fullName,
        `₦${Number(staff.netSalary).toLocaleString()}`,
        staff.accountDetails || 'N/A',
        staff.loanDeduction && Number(staff.loanDeduction) > 0 
          ? `Less ₦${Number(staff.loanDeduction).toLocaleString()} for loan repayment` 
          : ''
      ]);
      
      // Add total row
      tableData.push(['', '', 'Total:', `₦${Number(totalAmount).toLocaleString()}`, '', '']);
      
      // Generate table
      autoTable(doc, {
        head: [['SN', 'Designation', 'Name', 'Salary (₦)', 'Account Details', 'Remark']],
        body: tableData,
        startY: 35,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 20 },
          1: { cellWidth: 40 },
          2: { cellWidth: 50 },
          3: { halign: 'right', cellWidth: 35 },
          4: { cellWidth: 50 },
          5: { cellWidth: 50 }
        },
        didParseCell: function(data: any) {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fillColor = [224, 224, 224];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
      
      // Add footer
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const footerText = `The total amount payable for the month of ${monthNames[month]}, ${year} is ₦${Number(totalAmount).toLocaleString()}`;
      doc.text(footerText, 20, finalY);
      
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generated on: ${new Date().toLocaleDateString()} | Total Staff: ${payrollData.length}`, 20, finalY + 10);
      
      // Save PDF file
      const fs = await import('fs');
      const path = await import('path');
      
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const pdfPath = path.join(uploadsDir, `${fileName}.pdf`);
      const csvPath = path.join(uploadsDir, `${fileName}.csv`);
      
      // Save PDF
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      fs.writeFileSync(pdfPath, pdfBuffer);
      
      // Generate and save CSV
      let csvContent = `Olowu Palace Salary Schedule for the Month of ${monthNames[month]} ${year}\n\n`;
      csvContent += 'SN,Designation,Name,Salary (₦),Account Details,Remark\n';
      
      payrollData.forEach((staff: any, index: number) => {
        const remark = staff.loanDeduction && Number(staff.loanDeduction) > 0 
          ? `Less ₦${Number(staff.loanDeduction).toLocaleString()} for loan repayment` 
          : '';
        csvContent += `${index + 1},"${staff.designation || staff.jobTitle || 'Staff'}","${staff.fullName}",${staff.netSalary},"${staff.accountDetails || 'N/A'}","${remark}"\n`;
      });
      
      csvContent += `\nTotal:,,,${Number(totalAmount).toLocaleString()},,\n`;
      csvContent += `\nThe total amount payable for the month of ${monthNames[month]}, ${year} is ₦${Number(totalAmount).toLocaleString()}\n`;
      
      fs.writeFileSync(csvPath, csvContent);
      
      // Update payroll schedule with file paths
      await prisma.payrollSchedule.update({
        where: { id: payrollSchedule.id },
        data: {
          pdfFilePath: `uploads/${fileName}.pdf`,
          csvFilePath: `uploads/${fileName}.csv`
        }
      });
      
      console.log('PDF and CSV files generated and stored successfully');
      
    } catch (fileError) {
      console.error('Error generating files:', fileError);
      // Continue without files - they can be generated on-demand
    }

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

// Generate HTML template for PDF
const generatePayrollHTML = (payrollSchedule: any, staffData: any[]) => {
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];
  
  const totalAmount = Number(payrollSchedule.totalAmount) || 0;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payroll Schedule</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          font-size: 12px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .header h1 {
          font-size: 18px;
          margin: 0;
          font-weight: bold;
        }
        .header h2 {
          font-size: 16px;
          margin: 5px 0;
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
          vertical-align: top;
        }
        th {
          background-color: #f0f0f0;
          font-weight: bold;
          text-align: center;
        }
        .total-row {
          background-color: #e0e0e0;
          font-weight: bold;
        }
        .footer {
          margin-top: 20px;
          font-size: 11px;
        }
        .amount-words {
          font-weight: bold;
          margin-top: 10px;
        }
        @media print {
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Olowu Palace Salary Schedule for the Month of ${monthNames[payrollSchedule.month]} ${payrollSchedule.year}</h1>
      </div>
      
      <table>
        <thead>
          <tr>
            <th style="width: 5%;">SN</th>
            <th style="width: 20%;">Designation</th>
            <th style="width: 25%;">Name</th>
            <th style="width: 15%;">Salary (₦)</th>
            <th style="width: 20%;">Account Details</th>
            <th style="width: 15%;">Remark</th>
          </tr>
        </thead>
        <tbody>
          ${staffData.map((staff, index) => {
            const serialNumber = index + 1;
            const designation = staff.designation || staff.jobTitle || 'Staff';
            const name = staff.fullName || 'Unknown Staff';
            const salary = staff.netSalary || 0;
            const accountDetails = staff.accountDetails || 'N/A';
            let remark = '';
            
            if (staff.loanDeduction && Number(staff.loanDeduction) > 0) {
              remark = `Less ₦${Number(staff.loanDeduction).toLocaleString()} for loan repayment`;
            }
            
            return `
              <tr>
                <td style="text-align: center;">${serialNumber}</td>
                <td>${designation}</td>
                <td>${name}</td>
                <td style="text-align: right;">${Number(salary).toLocaleString()}</td>
                <td>${accountDetails}</td>
                <td>${remark}</td>
              </tr>
            `;
          }).join('')}
          <tr class="total-row">
            <td colspan="3" style="text-align: center;"><strong>Total:</strong></td>
            <td style="text-align: right;"><strong>${totalAmount.toLocaleString()}</strong></td>
            <td colspan="2"></td>
          </tr>
        </tbody>
      </table>
      
      <div class="footer">
        <div class="amount-words">
          The total amount payable for the month of ${monthNames[payrollSchedule.month]}, ${payrollSchedule.year} is ₦${totalAmount.toLocaleString()} (${numberToWords(totalAmount)} Naira Only)
        </div>
        <div style="margin-top: 20px; font-size: 10px; color: #666;">
          Generated on: ${new Date().toLocaleDateString()} | Total Staff: ${staffData.length}
        </div>
      </div>
    </body>
    </html>
  `;
};

// PDFShift API integration
const generatePDFWithPDFShift = async (htmlContent: string): Promise<Buffer> => {
  const PDFSHIFT_API_KEY = process.env.PDFSHIFT_API_KEY || 'demo'; // Use 'demo' for testing
  
  try {
    console.log('Calling PDFShift API...');
    const response = await axios.post('https://api.pdfshift.io/v3/convert/pdf', {
      source: htmlContent,
      landscape: true,
      format: 'A4',
      margin: '20px',
      print_background: true,
      wait_for: 'load'
    }, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${PDFSHIFT_API_KEY}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });
    
    console.log('PDFShift API response received, size:', response.data.byteLength);
    return Buffer.from(response.data);
  } catch (error) {
    console.error('PDFShift API error:', error);
    throw new Error('PDFShift API failed');
  }
};

// Fallback: Simple client-side PDF generation
const generateSimplePDF = (payrollSchedule: any, staffData: any[]): string => {
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Return a simple HTML page that can be printed to PDF by the browser
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payroll Schedule - ${monthNames[payrollSchedule.month]} ${payrollSchedule.year}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .print-button { 
          background: #007bff; color: white; padding: 10px 20px; 
          border: none; border-radius: 5px; cursor: pointer; margin-bottom: 20px;
          font-size: 16px;
        }
        .print-button:hover { background: #0056b3; }
        @media print { .print-button { display: none; } }
        h1 { text-align: center; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
        .total-row { background-color: #e0e0e0; font-weight: bold; }
        .footer { margin-top: 20px; font-size: 12px; }
      </style>
    </head>
    <body>
      <button class="print-button" onclick="window.print()">🖨️ Print to PDF</button>
      <h1>Olowu Palace Salary Schedule for the Month of ${monthNames[payrollSchedule.month]} ${payrollSchedule.year}</h1>
      <table>
        <thead>
          <tr>
            <th>SN</th><th>Designation</th><th>Name</th><th>Salary (₦)</th><th>Account Details</th><th>Remark</th>
          </tr>
        </thead>
        <tbody>
          ${staffData.map((staff, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${staff.designation || staff.jobTitle || 'Staff'}</td>
              <td>${staff.fullName || 'Unknown Staff'}</td>
              <td style="text-align: right;">${Number(staff.netSalary || 0).toLocaleString()}</td>
              <td>${staff.accountDetails || 'N/A'}</td>
              <td>${staff.loanDeduction && Number(staff.loanDeduction) > 0 ? `Less ₦${Number(staff.loanDeduction).toLocaleString()} for loan repayment` : ''}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="3"><strong>Total:</strong></td>
            <td style="text-align: right;"><strong>${Number(payrollSchedule.totalAmount).toLocaleString()}</strong></td>
            <td colspan="2"></td>
          </tr>
        </tbody>
      </table>
      <div class="footer">
        <p><strong>The total amount payable for the month of ${monthNames[payrollSchedule.month]}, ${payrollSchedule.year} is ₦${Number(payrollSchedule.totalAmount).toLocaleString()} (${numberToWords(Number(payrollSchedule.totalAmount))} Naira Only)</strong></p>
        <p>Generated on: ${new Date().toLocaleDateString()} | Total Staff: ${staffData.length}</p>
      </div>
    </body>
    </html>
  `;
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

    // Try PDFShift API first, fallback to simple HTML
    try {
      const htmlContent = generatePayrollHTML(payrollSchedule, staffData);
      const pdfBuffer = await generatePDFWithPDFShift(htmlContent);
      
      const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="payroll-${monthNames[payrollSchedule.month]}-${payrollSchedule.year}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
      console.log('PDF sent successfully via PDFShift');
      
    } catch (pdfError) {
      console.log('PDFShift failed, falling back to simple HTML:', pdfError);
      
      // Fallback: Return HTML that can be printed to PDF
      const htmlContent = generateSimplePDF(payrollSchedule, staffData);
      const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename="payroll-${monthNames[payrollSchedule.month]}-${payrollSchedule.year}.html"`);
      
      res.send(htmlContent);
      console.log('HTML sent successfully as fallback');
    }

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