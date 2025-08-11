import { Router } from 'express';
import { 
  getSalaryStructures,
  createSalaryStructure,
  updateSalaryStructure,
  generatePayroll,
  getPayrollSchedules,
  getPayrollSchedule,
  generatePayrollPDF,
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