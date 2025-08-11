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

const router = Router();

// All payroll routes require authentication
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