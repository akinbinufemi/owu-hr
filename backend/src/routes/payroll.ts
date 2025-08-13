import { Router } from 'express';
import {
  getSalaryStructures,
  createSalaryStructure,
  updateSalaryStructure,
  generatePayroll,
  getPayrollSchedules,
  getPayrollSchedule,
  generatePayrollPDF,
  viewPayrollHTML,
  deletePayrollSchedule
} from '../controllers/payrollController';
import { authenticateToken } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

// Debug endpoint (no auth required for debugging)
router.get('/schedules/:id/debug', async (req, res) => {
  try {
    const { id } = req.params;
    const payrollSchedule = await prisma.payrollSchedule.findUnique({
      where: { id }
    });

    if (!payrollSchedule) {
      return res.status(404).json({ error: 'Payroll schedule not found' });
    }

    let staffData;
    try {
      staffData = JSON.parse(payrollSchedule.staffData as string);
    } catch (parseError) {
      return res.json({
        payrollSchedule: {
          id: payrollSchedule.id,
          month: payrollSchedule.month,
          year: payrollSchedule.year,
          totalAmount: payrollSchedule.totalAmount,
          staffDataRaw: payrollSchedule.staffData,
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        }
      });
    }

    res.json({
      payrollSchedule: {
        id: payrollSchedule.id,
        month: payrollSchedule.month,
        year: payrollSchedule.year,
        totalAmount: payrollSchedule.totalAmount,
        staffCount: staffData.length,
        sampleStaff: staffData.slice(0, 2), // First 2 staff members for debugging
        staffDataStructure: staffData.length > 0 ? Object.keys(staffData[0]) : []
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// CSV export endpoint as fallback (no auth required for debugging)
router.get('/schedules/:id/csv', async (req, res) => {
  try {
    const { id } = req.params;

    const payrollSchedule = await prisma.payrollSchedule.findUnique({
      where: { id }
    });

    if (!payrollSchedule) {
      return res.status(404).json({
        success: false,
        error: { message: 'Payroll schedule not found' }
      });
    }

    const staffData = JSON.parse(payrollSchedule.staffData as string);
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    // Create CSV content
    let csvContent = `Olowu Palace Salary Schedule for the Month of ${monthNames[payrollSchedule.month]} ${payrollSchedule.year}\n\n`;
    csvContent += 'SN,Designation,Name,Salary (₦),Account Details,Remark\n';

    staffData.forEach((staff: any, index: number) => {
      const serialNumber = index + 1;
      const designation = staff.designation || staff.jobTitle || 'Staff';
      const name = staff.fullName || 'Unknown Staff';
      const salary = staff.netSalary || 0;
      const accountDetails = staff.accountDetails || 'N/A';
      let remark = '';

      if (staff.loanDeduction && Number(staff.loanDeduction) > 0) {
        remark = `Less ₦${Number(staff.loanDeduction).toLocaleString()} for loan repayment`;
      }

      csvContent += `${serialNumber},"${designation}","${name}",${salary},"${accountDetails}","${remark}"\n`;
    });

    csvContent += `\nTotal:,,,${Number(payrollSchedule.totalAmount).toLocaleString()},,\n`;
    csvContent += `\nThe total amount payable for the month of ${monthNames[payrollSchedule.month]}, ${payrollSchedule.year} is ₦${Number(payrollSchedule.totalAmount).toLocaleString()}\n`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payroll-${monthNames[payrollSchedule.month]}-${payrollSchedule.year}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

// HTML view route (handles auth internally via query token)
router.get('/schedules/:id/html', viewPayrollHTML);

// Simple test endpoint (no auth)
router.get('/test-connection', (req, res) => {
  res.json({
    success: true,
    message: 'Payroll API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug HTML route (no auth for testing)
router.get('/schedules/:id/html-debug', async (req, res) => {
  try {
    const { id } = req.params;
    
    const payrollSchedule = await prisma.payrollSchedule.findUnique({
      where: { id }
    });

    if (!payrollSchedule) {
      return res.status(404).send('<h1>Not Found</h1><p>Payroll schedule not found</p>');
    }

    // Parse staff data
    let staffData;
    try {
      staffData = JSON.parse(payrollSchedule.staffData as string);
    } catch (parseError) {
      return res.status(500).send(`<h1>Data Parse Error</h1><p>Error parsing staff data: ${parseError instanceof Error ? parseError.message : 'Unknown error'}</p>`);
    }

    // Simple HTML response for debugging
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Debug - Payroll ${monthNames[payrollSchedule.month]} ${payrollSchedule.year}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Payroll Schedule Debug - ${monthNames[payrollSchedule.month]} ${payrollSchedule.year}</h1>
        <p><strong>Total Amount:</strong> ₦${Number(payrollSchedule.totalAmount).toLocaleString()}</p>
        <p><strong>Staff Count:</strong> ${staffData.length}</p>
        
        <table>
          <thead>
            <tr>
              <th>SN</th>
              <th>Name</th>
              <th>Job Title</th>
              <th>Net Salary</th>
              <th>External</th>
            </tr>
          </thead>
          <tbody>
            ${staffData.map((staff: any, index: number) => `
              <tr>
                <td>${index + 1}</td>
                <td>${staff.fullName || 'N/A'}</td>
                <td>${staff.jobTitle || 'N/A'}</td>
                <td>₦${Number(staff.netSalary || 0).toLocaleString()}</td>
                <td>${staff.isExternallyPaid ? 'Yes' : 'No'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <h3>Raw Data Sample:</h3>
        <pre>${JSON.stringify(staffData.slice(0, 2), null, 2)}</pre>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('Debug HTML error:', error);
    res.status(500).send(`<h1>Server Error</h1><p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>`);
  }
});

// All other payroll routes require authentication
router.use(authenticateToken);

// Salary structure routes
router.get('/structures', getSalaryStructures);
router.post('/structures', createSalaryStructure);
router.put('/structures/:id', updateSalaryStructure);

// Payroll generation routes
router.post('/generate', generatePayroll);
router.get('/schedules', getPayrollSchedules);
router.get('/schedules/:id', getPayrollSchedule);
router.get('/schedules/:id/pdf', generatePayrollPDF);
router.delete('/schedules/:id', deletePayrollSchedule);

// Direct file download endpoints
router.get('/schedules/:id/download-pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const payrollSchedule = await prisma.payrollSchedule.findUnique({
      where: { id }
    });

    if (!payrollSchedule || !payrollSchedule.pdfFilePath) {
      return res.status(404).json({ error: 'PDF file not found' });
    }

    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), payrollSchedule.pdfFilePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'PDF file not found on disk' });
    }

    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payroll-${monthNames[payrollSchedule.month]}-${payrollSchedule.year}.pdf"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('PDF download error:', error);
    res.status(500).json({ error: 'Failed to download PDF' });
  }
});

router.get('/schedules/:id/download-csv', async (req, res) => {
  try {
    const { id } = req.params;
    const payrollSchedule = await prisma.payrollSchedule.findUnique({
      where: { id }
    });

    if (!payrollSchedule || !payrollSchedule.csvFilePath) {
      return res.status(404).json({ error: 'CSV file not found' });
    }

    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), payrollSchedule.csvFilePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'CSV file not found on disk' });
    }

    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payroll-${monthNames[payrollSchedule.month]}-${payrollSchedule.year}.csv"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('CSV download error:', error);
    res.status(500).json({ error: 'Failed to download CSV' });
  }
});

// Test PDF endpoint
router.get('/test-pdf', async (req, res) => {
  try {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('Test PDF Generation', {
      x: 50,
      y: 750,
      size: 20,
      font,
      color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="test.pdf"');
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Test PDF error:', error);
    res.status(500).json({ error: 'Failed to generate test PDF' });
  }
});



export default router;