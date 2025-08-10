import { Router } from 'express';
import { 
  getSalaryStructures,
  createSalaryStructure,
  updateSalaryStructure,
  generatePayroll,
  getPayrollSchedules,
  getPayrollSchedule,
  generatePayrollPDF
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

export default router;