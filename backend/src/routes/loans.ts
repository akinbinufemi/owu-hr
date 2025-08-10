import { Router } from 'express';
import { 
  getAllLoans,
  getLoanById,
  createLoan,
  updateLoan,
  getLoanLedger,
  processLoanRepayment,
  getLoanSummary
} from '../controllers/loanController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All loan routes require authentication
router.use(authenticateToken);

router.get('/', getAllLoans);
router.get('/summary', getLoanSummary);
router.get('/:id', getLoanById);
router.post('/', createLoan);
router.put('/:id', updateLoan);
router.get('/:id/ledger', getLoanLedger);
router.post('/:id/repayment', processLoanRepayment);

export default router;