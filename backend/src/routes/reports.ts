import { Router } from 'express';
import { 
  getHeadcountReport,
  getSalaryReport,
  getLoanReport,
  getIssuesReport,
  getReportsList
} from '../controllers/reportsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All report routes require authentication
router.use(authenticateToken);

router.get('/', getReportsList);
router.get('/headcount', getHeadcountReport);
router.get('/salary', getSalaryReport);
router.get('/loan', getLoanReport);
router.get('/issues', getIssuesReport);

export default router;